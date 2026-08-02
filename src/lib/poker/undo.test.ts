import { describe, expect, it } from "vitest";
import { createEmptyPokerState } from "./game";
import { MAX_UNDO_DEPTH, popUndoSnapshot, pushUndoSnapshot } from "./undo";

describe("undo stack", () => {
  it("pushes and pops snapshots without sharing references", () => {
    const a = createEmptyPokerState(10, 20);
    a.pot = 30;
    const b = createEmptyPokerState(10, 20);
    b.pot = 60;

    let stack = pushUndoSnapshot([], a);
    stack = pushUndoSnapshot(stack, b);
    expect(stack).toHaveLength(2);

    a.pot = 999;
    const popped = popUndoSnapshot(stack);
    expect(popped).not.toBeNull();
    if (!popped) return;
    expect(popped.state.pot).toBe(60);
    expect(popped.stack).toHaveLength(1);
    expect(popped.stack[0].pot).toBe(30);
  });

  it("caps stack depth", () => {
    let stack: ReturnType<typeof createEmptyPokerState>[] = [];
    for (let i = 0; i < MAX_UNDO_DEPTH + 5; i++) {
      const s = createEmptyPokerState(10, 20);
      s.pot = i;
      stack = pushUndoSnapshot(stack, s);
    }
    expect(stack).toHaveLength(MAX_UNDO_DEPTH);
    expect(stack[0].pot).toBe(5);
    expect(stack[stack.length - 1].pot).toBe(MAX_UNDO_DEPTH + 4);
  });

  it("returns null when empty", () => {
    expect(popUndoSnapshot([])).toBeNull();
  });
});
