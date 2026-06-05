import { describe, expect, it } from "vitest";
import {
  applyAction,
  createEmptyPokerState,
  distributePotChopAndEndHand,
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

describe("distributePotChopAndEndHand", () => {
  it("splits pot evenly between two winners", () => {
    let s = sampleTable(3);
    const r = startHand(s);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;

    const stacksBefore = s.players.map((p) => p.stack);
    const pot = s.pot;

    s.round = "Showdown";
    s.handInProgress = false;

    const w0 = s.players.findIndex((p) => p.position === "D");
    const w1 = s.players.findIndex((p) => p.position === "BB");
    expect(w0).toBeGreaterThanOrEqual(0);
    expect(w1).toBeGreaterThanOrEqual(0);

    const chop = distributePotChopAndEndHand(s, [w0, w1]);
    expect(chop.ok).toBe(true);
    if (!chop.ok) return;
    s = chop.state;

    expect(s.pot).toBe(0);
    expect(s.handInProgress).toBe(false);
    expect(s.players[w0].stack - stacksBefore[w0]).toBe(Math.floor(pot / 2));
    expect(s.players[w1].stack - stacksBefore[w1]).toBe(
      pot - Math.floor(pot / 2),
    );
    expect(s.history.at(-1)).toContain("チョップ");
  });

  it("rejects chop with fewer than two winners", () => {
    const s = sampleTable(2);
    const res = distributePotChopAndEndHand(s, [0]);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toContain("2人以上");
  });

  it("distributes odd chips to seats left of dealer", () => {
    let s = sampleTable(3);
    const r = startHand(s);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;

    s.pot = 101;
    s.round = "Showdown";
    s.handInProgress = false;

    const dealer = s.dealerIndex;
    const ordered = [0, 1, 2].sort((a, b) => {
      const n = s.players.length;
      return ((a - dealer + n) % n) - ((b - dealer + n) % n);
    });

    const stacksBefore = s.players.map((p) => p.stack);
    const chop = distributePotChopAndEndHand(s, ordered);
    expect(chop.ok).toBe(true);
    if (!chop.ok) return;
    s = chop.state;

    const gains = ordered.map((i) => s.players[i].stack - stacksBefore[i]);
    expect(gains).toEqual([34, 34, 33]);
  });
});
