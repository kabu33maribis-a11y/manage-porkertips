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

  it("heads-up: dealer is SB and hand starts", () => {
    let s = sampleTable(2);
    const r = startHand(s);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;
    const sb = s.players.findIndex((p) => p.position === "SB");
    const bb = s.players.findIndex((p) => p.position === "BB");
    expect(sb).toBeGreaterThanOrEqual(0);
    expect(bb).toBeGreaterThanOrEqual(0);
    expect(sb).not.toBe(bb);
  });
});
