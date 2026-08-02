"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  applyAction,
  appendHistoryNote,
  createEmptyPokerState,
  distributePotAndEndHand,
  distributePotChopAndEndHand,
  ensureDerivedArrays,
  popUndoSnapshot,
  pushUndoSnapshot,
  recordBoardCards,
  recordShowdownCards,
  startHand,
} from "@/lib/poker";
import { loadGameSnapshot, saveGameSnapshot } from "@/lib/storage/game-db";
import type { PokerAction, PokerState } from "@/types/poker";
import type {
  ClientToServerMessage,
  RealtimeRole,
  ServerToClientMessage,
} from "@/lib/realtime/protocol";

function debounce<T extends (state: PokerState) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (state: PokerState) => {
    clearTimeout(t);
    t = setTimeout(() => fn(state), ms);
  };
}

const queuePersist = debounce((state: PokerState) => {
  void saveGameSnapshot(state);
}, 400);

interface GameStore {
  poker: PokerState;
  undoStack: PokerState[];
  hydrated: boolean;
  initialStack: number;
  realtimeConnected: boolean;
  realtimeRole: RealtimeRole | null;
  realtimeRoomCode: string;
  realtimeUrl: string;
  realtimeError: string | null;
  clientId: string;
  hydrate: () => Promise<void>;
  connectRealtime: (args: {
    url: string;
    roomCode: string;
    role: RealtimeRole;
  }) => void;
  disconnectRealtime: () => void;
  setBlinds: (sb: number, bb: number) => void;
  setInitialStack: (n: number) => void;
  addPlayer: (name: string) => void;
  removePlayer: (id: string) => void;
  startNewHand: () => string | null;
  submitAction: (playerIndex: number, action: PokerAction) => string | null;
  logBoardCards: (cardsText: string) => string | null;
  logShowdownCards: (note: string) => string | null;
  logNote: (note: string) => string | null;
  showdownWinner: (winnerIndex: number, cardsNote?: string) => string | null;
  showdownChop: (winnerIndices: number[], cardsNote?: string) => string | null;
  undoLastAction: () => string | null;
  resetSession: () => void;
}

function broadcastHostState(get: () => GameStore) {
  const nextState = get();
  if (nextState.realtimeConnected && nextState.realtimeRole === "host" && ws) {
    const msg: ClientToServerMessage = {
      type: "state_push",
      roomCode: nextState.realtimeRoomCode,
      state: nextState.poker,
      senderId: nextState.clientId,
    };
    ws.send(JSON.stringify(msg));
  }
}

let ws: WebSocket | null = null;
let forwardingRequest = false;

function makeClientId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useGameStore = create<GameStore>()(
  immer((set, get) => {
    const commitPoker = (next: PokerState, recordUndo: boolean) => {
      const prev = get().poker;
      const prevStack = get().undoStack;
      set((draft) => {
        if (recordUndo) {
          draft.undoStack = pushUndoSnapshot(prevStack, prev);
        }
        draft.poker = next;
      });
      queuePersist(get().poker);
      broadcastHostState(get);
    };

    return {
    poker: createEmptyPokerState(10, 20),
    undoStack: [],
    hydrated: false,
    initialStack: 1000,
    realtimeConnected: false,
    realtimeRole: null,
    realtimeRoomCode: "",
    realtimeUrl: "",
    realtimeError: null,
    clientId: makeClientId(),

    hydrate: async () => {
      const loaded = await loadGameSnapshot();
      if (loaded) {
        ensureDerivedArrays(loaded);
        set((draft) => {
          draft.poker = loaded;
          draft.undoStack = [];
          draft.hydrated = true;
        });
      } else {
        set((draft) => {
          draft.hydrated = true;
        });
      }
    },

    connectRealtime: ({ url, roomCode, role }) => {
      if (ws) {
        ws.close();
        ws = null;
      }
      const normalizedRoom = roomCode.trim().toUpperCase();
      if (!normalizedRoom) {
        set((draft) => {
          draft.realtimeError = "RoomCode を入力してください";
          draft.realtimeConnected = false;
          draft.realtimeRole = null;
        });
        return;
      }
      set((draft) => {
        draft.realtimeError = null;
        draft.realtimeConnected = false;
        draft.realtimeRoomCode = normalizedRoom;
        draft.realtimeUrl = url.trim();
        draft.realtimeRole = role;
      });

      try {
        const nextWs = new WebSocket(url);
        ws = nextWs;

        nextWs.onopen = () => {
          const state = get();
          const joinMsg: ClientToServerMessage = {
            type: "join",
            roomCode: state.realtimeRoomCode,
            role: state.realtimeRole ?? "guest",
            clientId: state.clientId,
          };
          nextWs.send(JSON.stringify(joinMsg));
        };

        nextWs.onclose = (event) => {
          const code = event.code;
          const reason = event.reason || "reasonなし";
          set((draft) => {
            draft.realtimeConnected = false;
            if (!draft.realtimeError) {
              draft.realtimeError = `接続終了: code=${code}, ${reason}`;
            }
          });
          if (ws === nextWs) ws = null;
        };

        nextWs.onerror = () => {
          const targetUrl = get().realtimeUrl || url;
          set((draft) => {
            draft.realtimeError = `リアルタイム接続に失敗しました (${targetUrl})`;
          });
        };

        nextWs.onmessage = (event) => {
          const raw = JSON.parse(event.data) as ServerToClientMessage;
          const state = get();

          if (raw.type === "error") {
            set((draft) => {
              draft.realtimeError = raw.message;
            });
            return;
          }

          if (raw.type === "joined") {
            set((draft) => {
              draft.realtimeConnected = true;
              draft.realtimeError = null;
            });
            if (state.realtimeRole === "host" && ws?.readyState === WebSocket.OPEN) {
              const push: ClientToServerMessage = {
                type: "state_push",
                roomCode: state.realtimeRoomCode,
                state: state.poker,
                senderId: state.clientId,
              };
              ws.send(JSON.stringify(push));
            }
            return;
          }

          if (raw.type === "state_sync") {
            if (raw.from === state.clientId) return;
            ensureDerivedArrays(raw.state);
            set((draft) => {
              draft.poker = raw.state;
              draft.undoStack = [];
            });
            queuePersist(get().poker);
            return;
          }

          if (raw.type === "request_forward" && state.realtimeRole === "host") {
            forwardingRequest = true;
            const payload = raw.payload;
            if (payload.kind === "action") {
              void get().submitAction(payload.playerIndex, payload.action);
            } else if (payload.kind === "startHand") {
              void get().startNewHand();
            } else if (payload.kind === "showdown") {
              void get().showdownWinner(payload.winnerIndex, payload.cardsNote);
            } else if (payload.kind === "chop") {
              void get().showdownChop(payload.winnerIndices, payload.cardsNote);
            } else if (payload.kind === "logBoard") {
              void get().logBoardCards(payload.cardsText);
            } else if (payload.kind === "logShowdown") {
              void get().logShowdownCards(payload.note);
            } else if (payload.kind === "undo") {
              void get().undoLastAction();
            } else if (payload.kind === "reset") {
              void get().resetSession();
            }
            forwardingRequest = false;
          }
        };
      } catch {
        set((draft) => {
          draft.realtimeError = "WebSocket URL が不正です";
        });
      }
    },

    disconnectRealtime: () => {
      if (ws) {
        ws.close();
        ws = null;
      }
      set((draft) => {
        draft.realtimeConnected = false;
        draft.realtimeRole = null;
        draft.realtimeRoomCode = "";
        draft.realtimeUrl = "";
        draft.realtimeError = null;
      });
    },

    setBlinds: (sb, bb) => {
      set((draft) => {
        if (draft.poker.handInProgress) return;
        draft.poker.smallBlind = sb;
        draft.poker.bigBlind = bb;
        draft.poker.minRaise = bb;
      });
      queuePersist(get().poker);
      broadcastHostState(get);
    },

    setInitialStack: (n) => {
      set((draft) => {
        draft.initialStack = Math.max(1, Math.floor(n));
      });
    },

    addPlayer: (name) => {
      const state = get();
      if (
        state.realtimeConnected &&
        state.realtimeRole === "guest" &&
        ws
      ) {
        return;
      }
      set((draft) => {
        if (draft.poker.handInProgress) return;
        if (draft.poker.players.length >= 4) return;
        const id =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`;
        draft.poker.players.push({
          id,
          name: name.trim() || `プレイヤー ${draft.poker.players.length + 1}`,
          stack: draft.initialStack,
          bet: 0,
          totalContributed: 0,
          status: "active",
          position: null,
        });
        draft.poker.actedThisStreet = draft.poker.players.map(() => false);
      });
      queuePersist(get().poker);
      broadcastHostState(get);
    },

    removePlayer: (id) => {
      const state = get();
      if (
        state.realtimeConnected &&
        state.realtimeRole === "guest" &&
        ws
      ) {
        return;
      }
      set((draft) => {
        if (draft.poker.handInProgress) return;
        const idx = draft.poker.players.findIndex((p) => p.id === id);
        if (idx < 0) return;
        draft.poker.players.splice(idx, 1);
        draft.poker.dealerIndex = Math.min(
          draft.poker.dealerIndex,
          Math.max(0, draft.poker.players.length - 1),
        );
        draft.poker.currentPlayerIndex = Math.min(
          draft.poker.currentPlayerIndex,
          Math.max(0, draft.poker.players.length - 1),
        );
        draft.poker.actedThisStreet = draft.poker.players.map(() => false);
      });
      queuePersist(get().poker);
      broadcastHostState(get);
    },

    startNewHand: () => {
      const state = get();
      if (
        state.realtimeConnected &&
        state.realtimeRole === "guest" &&
        ws &&
        !forwardingRequest
      ) {
        const req: ClientToServerMessage = {
          type: "request",
          roomCode: state.realtimeRoomCode,
          senderId: state.clientId,
          payload: { kind: "startHand" },
        };
        ws.send(JSON.stringify(req));
        return null;
      }
      const res = startHand(get().poker);
      if (!res.ok) return res.error;
      commitPoker(res.state, true);
      return null;
    },

    submitAction: (playerIndex, action) => {
      const state = get();
      if (
        state.realtimeConnected &&
        state.realtimeRole === "guest" &&
        ws &&
        !forwardingRequest
      ) {
        const req: ClientToServerMessage = {
          type: "request",
          roomCode: state.realtimeRoomCode,
          senderId: state.clientId,
          payload: { kind: "action", playerIndex, action },
        };
        ws.send(JSON.stringify(req));
        return null;
      }
      const res = applyAction(get().poker, playerIndex, action);
      if (!res.ok) return res.error;
      commitPoker(res.state, true);
      return null;
    },

    logBoardCards: (cardsText) => {
      const state = get();
      if (
        state.realtimeConnected &&
        state.realtimeRole === "guest" &&
        ws &&
        !forwardingRequest
      ) {
        const req: ClientToServerMessage = {
          type: "request",
          roomCode: state.realtimeRoomCode,
          senderId: state.clientId,
          payload: { kind: "logBoard", cardsText },
        };
        ws.send(JSON.stringify(req));
        return null;
      }
      const res = recordBoardCards(get().poker, cardsText);
      if (!res.ok) return res.error;
      commitPoker(res.state, true);
      return null;
    },

    logShowdownCards: (note) => {
      const state = get();
      if (
        state.realtimeConnected &&
        state.realtimeRole === "guest" &&
        ws &&
        !forwardingRequest
      ) {
        const req: ClientToServerMessage = {
          type: "request",
          roomCode: state.realtimeRoomCode,
          senderId: state.clientId,
          payload: { kind: "logShowdown", note },
        };
        ws.send(JSON.stringify(req));
        return null;
      }
      const res = recordShowdownCards(get().poker, note);
      if (!res.ok) return res.error;
      commitPoker(res.state, true);
      return null;
    },

    logNote: (note) => {
      const res = appendHistoryNote(get().poker, note);
      if (!res.ok) return res.error;
      commitPoker(res.state, true);
      return null;
    },

    showdownWinner: (winnerIndex, cardsNote) => {
      const state = get();
      if (
        state.realtimeConnected &&
        state.realtimeRole === "guest" &&
        ws &&
        !forwardingRequest
      ) {
        const req: ClientToServerMessage = {
          type: "request",
          roomCode: state.realtimeRoomCode,
          senderId: state.clientId,
          payload: { kind: "showdown", winnerIndex, cardsNote },
        };
        ws.send(JSON.stringify(req));
        return null;
      }
      let poker = get().poker;
      if (cardsNote?.trim()) {
        const logged = recordShowdownCards(poker, cardsNote);
        if (!logged.ok) return logged.error;
        poker = logged.state;
      }
      const res = distributePotAndEndHand(poker, winnerIndex);
      if (!res.ok) return res.error;
      const autoStart = startHand(res.state);
      commitPoker(autoStart.ok ? autoStart.state : res.state, true);
      return null;
    },

    showdownChop: (winnerIndices, cardsNote) => {
      const state = get();
      if (
        state.realtimeConnected &&
        state.realtimeRole === "guest" &&
        ws &&
        !forwardingRequest
      ) {
        const req: ClientToServerMessage = {
          type: "request",
          roomCode: state.realtimeRoomCode,
          senderId: state.clientId,
          payload: { kind: "chop", winnerIndices, cardsNote },
        };
        ws.send(JSON.stringify(req));
        return null;
      }
      let poker = get().poker;
      if (cardsNote?.trim()) {
        const logged = recordShowdownCards(poker, cardsNote);
        if (!logged.ok) return logged.error;
        poker = logged.state;
      }
      const res = distributePotChopAndEndHand(poker, winnerIndices);
      if (!res.ok) return res.error;
      const autoStart = startHand(res.state);
      commitPoker(autoStart.ok ? autoStart.state : res.state, true);
      return null;
    },

    undoLastAction: () => {
      const state = get();
      if (
        state.realtimeConnected &&
        state.realtimeRole === "guest" &&
        ws &&
        !forwardingRequest
      ) {
        const req: ClientToServerMessage = {
          type: "request",
          roomCode: state.realtimeRoomCode,
          senderId: state.clientId,
          payload: { kind: "undo" },
        };
        ws.send(JSON.stringify(req));
        return null;
      }
      const popped = popUndoSnapshot(get().undoStack);
      if (!popped) return "戻せる操作がありません";
      set((draft) => {
        draft.undoStack = popped.stack;
        draft.poker = popped.state;
      });
      queuePersist(get().poker);
      broadcastHostState(get);
      return null;
    },

    resetSession: () => {
      const state = get();
      if (
        state.realtimeConnected &&
        state.realtimeRole === "guest" &&
        ws &&
        !forwardingRequest
      ) {
        const req: ClientToServerMessage = {
          type: "request",
          roomCode: state.realtimeRoomCode,
          senderId: state.clientId,
          payload: { kind: "reset" },
        };
        ws.send(JSON.stringify(req));
        return;
      }
      const { smallBlind, bigBlind } = get().poker;
      set((draft) => {
        draft.poker = createEmptyPokerState(smallBlind, bigBlind);
        draft.undoStack = [];
      });
      queuePersist(get().poker);
      broadcastHostState(get);
    },
  };
  }),
);
