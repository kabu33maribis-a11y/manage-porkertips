import type { PokerState } from "@/types/poker";
import { cloneStateBase } from "./helpers";

export const MAX_UNDO_DEPTH = 50;

/** 現在の状態をアンドゥ用スタックへ積む（上限超過分は古いものから破棄） */
export function pushUndoSnapshot(
  stack: PokerState[],
  state: PokerState,
): PokerState[] {
  const next = [...stack, cloneStateBase(state)];
  if (next.length <= MAX_UNDO_DEPTH) return next;
  return next.slice(next.length - MAX_UNDO_DEPTH);
}

/** 直前のスナップショットを取り出す。空なら null */
export function popUndoSnapshot(
  stack: PokerState[],
): { stack: PokerState[]; state: PokerState } | null {
  if (stack.length === 0) return null;
  const state = cloneStateBase(stack[stack.length - 1]);
  return { stack: stack.slice(0, -1), state };
}
