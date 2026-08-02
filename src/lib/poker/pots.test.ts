import { describe, expect, it } from "vitest";
import type { Player } from "@/types/poker";
import { computeSidePots, distributeSidePots } from "./pots";

function p(id: string, totalContributed: number): Player {
  return {
    id,
    name: id,
    stack: 0,
    bet: 0,
    totalContributed,
    status: "all-in",
    position: null,
  };
}

describe("computeSidePots", () => {
  it("splits unequal contributions into main and side pots", () => {
    const pots = computeSidePots([
      p("a", 100),
      p("b", 300),
      p("c", 500),
    ]);
    const total = pots.reduce((s, x) => s + x.amount, 0);
    expect(total).toBe(900);
    expect(pots[0].amount).toBe(300);
    expect(pots[0].eligiblePlayerIds.sort()).toEqual(["a", "b", "c"].sort());
    expect(pots[1].amount).toBe(400);
    expect(pots[1].eligiblePlayerIds.sort()).toEqual(["b", "c"].sort());
    expect(pots[2].amount).toBe(200);
    expect(pots[2].eligiblePlayerIds).toEqual(["c"]);
  });

  it("returns excess chips to deep stack when short stack wins", () => {
    const players: Player[] = [
      p("short", 100),
      p("deep", 500),
    ];
    const pots = computeSidePots(players);
    const awards = distributeSidePots(players, pots, ["short"], {
      chop: false,
      dealerIndex: 1,
    });
    expect(awards.get("short")).toBe(200);
    expect(awards.get("deep")).toBe(400);
  });
});
