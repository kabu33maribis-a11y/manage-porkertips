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
  hydrate: () => Promise<void>;
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
    };

    return {
      poker: createEmptyPokerState(10, 20),
      undoStack: [],
      hydrated: false,
      initialStack: 1000,

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

      setBlinds: (sb, bb) => {
        set((draft) => {
          if (draft.poker.handInProgress) return;
          draft.poker.smallBlind = sb;
          draft.poker.bigBlind = bb;
          draft.poker.minRaise = bb;
        });
        queuePersist(get().poker);
      },

      setInitialStack: (n) => {
        set((draft) => {
          draft.initialStack = Math.max(1, Math.floor(n));
        });
      },

      addPlayer: (name) => {
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
      },

      removePlayer: (id) => {
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
      },

      startNewHand: () => {
        const res = startHand(get().poker);
        if (!res.ok) return res.error;
        commitPoker(res.state, true);
        return null;
      },

      submitAction: (playerIndex, action) => {
        const res = applyAction(get().poker, playerIndex, action);
        if (!res.ok) return res.error;
        commitPoker(res.state, true);
        return null;
      },

      logBoardCards: (cardsText) => {
        const res = recordBoardCards(get().poker, cardsText);
        if (!res.ok) return res.error;
        commitPoker(res.state, true);
        return null;
      },

      logShowdownCards: (note) => {
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
        const popped = popUndoSnapshot(get().undoStack);
        if (!popped) return "戻せる操作がありません";
        set((draft) => {
          draft.undoStack = popped.stack;
          draft.poker = popped.state;
        });
        queuePersist(get().poker);
        return null;
      },

      resetSession: () => {
        const { smallBlind, bigBlind } = get().poker;
        set((draft) => {
          draft.poker = createEmptyPokerState(smallBlind, bigBlind);
          draft.undoStack = [];
        });
        queuePersist(get().poker);
      },
    };
  }),
);
