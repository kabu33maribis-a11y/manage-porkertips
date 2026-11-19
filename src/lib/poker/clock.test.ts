import { describe, expect, it } from "vitest";
import {
  DEFAULT_CLOCK_CONFIG,
  isClockTarget,
  normalizeClockConfig,
  resetTimeBankCards,
  spendTimeBankCard,
  timeoutAction,
} from "./clock";
import { applyAction, createEmptyPokerState, ensureDerivedArrays, startHand } from "./game";
import { popUndoSnapshot, pushUndoSnapshot } from "./undo";

function sampleTable(n = 3, cards = 2) {
  const s = createEmptyPokerState(10, 20);
  for (let i = 0; i < n; i++) {
    s.players.push({
      id: `p${i}`,
      name: `P${i}`,
      stack: 1000,
      bet: 0,
      totalContributed: 0,
      status: "active",
      position: null,
      timeBankCards: cards,
    });
  }
  ensureDerivedArrays(s);
  return s;
}

describe("clock", () => {
  it("isClockTarget respects enabled flag and exclusions", () => {
    const cfg = { ...DEFAULT_CLOCK_CONFIG, enabled: true, excludedPlayerIds: ["p1"] };
    expect(isClockTarget(cfg, "p0")).toBe(true);
    expect(isClockTarget(cfg, "p1")).toBe(false);
    expect(isClockTarget({ ...cfg, enabled: false }, "p0")).toBe(false);
  });

  it("spendTimeBankCard decrements without mutating and fails at zero", () => {
    const s = sampleTable(2, 1);
    const r = spendTimeBankCard(s, 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.players[0].timeBankCards).toBe(0);
    expect(s.players[0].timeBankCards).toBe(1);
    const r2 = spendTimeBankCard(r.state, 0);
    expect(r2.ok).toBe(false);
  });

  it("card usage is restored by undo", () => {
    const s = sampleTable(2, 2);
    const stack = pushUndoSnapshot([], s);
    const r = spendTimeBankCard(s, 1);
    if (!r.ok) throw new Error(r.error);
    expect(r.state.players[1].timeBankCards).toBe(1);
    const popped = popUndoSnapshot(stack);
    expect(popped?.state.players[1].timeBankCards).toBe(2);
  });

  it("resetTimeBankCards sets everyone to the given count", () => {
    const s = sampleTable(3, 0);
    const r = resetTimeBankCards(s, 3);
    expect(r.players.map((p) => p.timeBankCards)).toEqual([3, 3, 3]);
    expect(s.players[0].timeBankCards).toBe(0);
  });

  it("timeoutAction checks when possible, otherwise folds", () => {
    const r0 = startHand(sampleTable(2));
    if (!r0.ok) throw new Error(r0.error);
    let s = r0.state;
    // プリフロップ最初の手番は BB に対してコールが必要 → チェック不可
    expect(timeoutAction(s, s.currentPlayerIndex, "check-fold")).toEqual({ type: "fold" });
    const r1 = applyAction(s, s.currentPlayerIndex, { type: "call" });
    if (!r1.ok) throw new Error(r1.error);
    s = r1.state;
    // BB はチェック可能
    expect(timeoutAction(s, s.currentPlayerIndex, "check-fold")).toEqual({ type: "check" });
    expect(timeoutAction(s, s.currentPlayerIndex, "fold")).toEqual({ type: "fold" });
    expect(timeoutAction(s, s.currentPlayerIndex, "notify")).toBeNull();
  });

  it("normalizeClockConfig fills defaults for broken input", () => {
    expect(normalizeClockConfig(null)).toEqual(DEFAULT_CLOCK_CONFIG);
    const c = normalizeClockConfig({ seconds: "abc", cardCount: -5, timeoutBehavior: "x" });
    expect(c.seconds).toBe(DEFAULT_CLOCK_CONFIG.seconds);
    expect(c.cardCount).toBe(0);
    expect(c.timeoutBehavior).toBe("check-fold");
  });

  it("ensureDerivedArrays fills missing card counts", () => {
    const s = sampleTable(1);
    delete s.players[0].timeBankCards;
    ensureDerivedArrays(s);
    expect(s.players[0].timeBankCards).toBe(0);
  });
});
