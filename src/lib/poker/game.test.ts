import { describe, expect, it } from "vitest";
import {
  applyAction,
  createEmptyPokerState,
  ensureDerivedArrays,
  startHand,
} from "./game";

function sampleTable(n = 3) {
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
    });
  }
  ensureDerivedArrays(s);
  return s;
}

describe("startHand / applyAction", () => {
  it("starts a hand and allows folding to a winner", () => {
    let s = sampleTable(3);
    const r0 = startHand(s);
    expect(r0.ok).toBe(true);
    if (!r0.ok) return;
    s = r0.state;
    expect(s.handInProgress).toBe(true);
    expect(s.pot).toBeGreaterThan(0);

    const idx = s.currentPlayerIndex;

    const r1 = applyAction(s, idx, { type: "fold" });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    s = r1.state;

    const r2 = applyAction(s, s.currentPlayerIndex, { type: "fold" });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    s = r2.state;

    expect(s.handInProgress).toBe(false);
    expect(s.pot).toBe(0);
    const winner = s.players.find((p) => p.stack > 1000);
    expect(winner).toBeTruthy();
  });

  it("heads-up: button posts SB and hand starts", () => {
    let s = sampleTable(2);
    const r = startHand(s);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;
    const btn = s.players.findIndex((p) => p.position === "D");
    const bb = s.players.findIndex((p) => p.position === "BB");
    expect(btn).toBeGreaterThanOrEqual(0);
    expect(bb).toBeGreaterThanOrEqual(0);
    expect(btn).not.toBe(bb);
    expect(s.currentPlayerIndex).toBe(btn);
  });

  it("heads-up: preflop BTN acts first, postflop BB acts first", () => {
    let s = sampleTable(2);
    let r = startHand(s);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;

    const btn = s.players.findIndex((p) => p.position === "D");
    const bb = s.players.findIndex((p) => p.position === "BB");

    expect(s.currentPlayerIndex).toBe(btn);

    r = applyAction(s, btn, { type: "call" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;
    expect(s.currentPlayerIndex).toBe(bb);

    r = applyAction(s, bb, { type: "check" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;
    expect(s.round).toBe("Flop");
    expect(s.currentPlayerIndex).toBe(bb);

    r = applyAction(s, bb, { type: "check" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;
    expect(s.currentPlayerIndex).toBe(btn);
  });

  it("heads-up: dealer rotates and turn order swaps on hand 2", () => {
    let s = sampleTable(2);
    let r = startHand(s);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;

    const hand1Btn = s.players.findIndex((p) => p.position === "D");
    const hand1Bb = s.players.findIndex((p) => p.position === "BB");

    r = applyAction(s, hand1Btn, { type: "fold" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;

    r = startHand(s);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;

    const hand2Btn = s.players.findIndex((p) => p.position === "D");
    const hand2Bb = s.players.findIndex((p) => p.position === "BB");

    expect(hand2Btn).toBe(hand1Bb);
    expect(hand2Bb).toBe(hand1Btn);
    expect(s.currentPlayerIndex).toBe(hand2Btn);
  });
});
