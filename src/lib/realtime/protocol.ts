import type { PokerAction, PokerState } from "@/types/poker";

export type RealtimeRole = "host" | "guest";

export type ClientToServerMessage =
  | { type: "join"; roomCode: string; role: RealtimeRole; clientId: string }
  | { type: "state_push"; roomCode: string; state: PokerState; senderId: string }
  | {
      type: "request";
      roomCode: string;
      senderId: string;
      payload:
        | { kind: "action"; playerIndex: number; action: PokerAction }
        | { kind: "startHand" }
        | { kind: "showdown"; winnerIndex: number }
        | { kind: "chop"; winnerIndices: number[] }
        | { kind: "reset" };
    };

export type ServerToClientMessage =
  | { type: "joined"; roomCode: string; role: RealtimeRole }
  | { type: "state_sync"; roomCode: string; state: PokerState; from: string }
  | {
      type: "request_forward";
      roomCode: string;
      from: string;
      payload:
        | { kind: "action"; playerIndex: number; action: PokerAction }
        | { kind: "startHand" }
        | { kind: "showdown"; winnerIndex: number }
        | { kind: "chop"; winnerIndices: number[] }
        | { kind: "reset" };
    }
  | { type: "error"; message: string };

