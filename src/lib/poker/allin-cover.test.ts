import { describe, expect, it } from "vitest";
import type { PokerAction, PokerState } from "@/types/poker";
import {
  applyAction,
  createEmptyPokerState,
  distributePotAndEndHand,
  distributePotByRankingAndEndHand,
  distributePotChopAndEndHand,
  ensureDerivedArrays,
  startHand,
} from "./game";
import { unresolvedPots } from "./pots";

/** 大きいスタックがオールイン → 小さいスタックが勝っても、カバー分は大きいスタックに戻ること */

function table(stacks: number[]) {
  const s = createEmptyPokerState(10, 20);
  stacks.forEach((stack, i) =>
    s.players.push({
      id: `p${i}`,
      name: `P${i}`,
      stack,
      bet: 0,
      totalContributed: 0,
      status: "active",
      position: null,
    }),
  );
  ensureDerivedArrays(s);
  const r = startHand(s);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

function act(s: PokerState, who: number, action: PokerAction): PokerState {
  expect(s.currentPlayerIndex).toBe(who);
  const r = applyAction(s, who, action);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

/** 誰も動けなくなるまで残りをチェックで回す */
function checkDown(s: PokerState): PokerState {
  let guard = 0;
  while (s.handInProgress && s.round !== "Showdown" && guard++ < 50) {
    s = act(s, s.currentPlayerIndex, { type: "check" });
  }
  return s;
}

const total = (s: PokerState) => s.players.reduce((a, p) => a + p.stack, 0) + s.pot;
const allIn = (s: PokerState, i: number): PokerAction => {
  const p = s.players[i];
  const to = p.bet + p.stack;
  return s.currentBet === 0 ? { type: "bet", amount: to } : { type: "raise", toAmount: to };
};

describe("deep stack all-in, short stack wins", () => {
  it("heads-up preflop: deep shoves, short calls all-in, short wins", () => {
    let s = table([1000, 5000]);
    const startTotal = total(s);
    const deep = 1;
    const short = 0;
    // HU: ボタン(SB)が先に動く
    if (s.currentPlayerIndex === deep) {
      s = act(s, deep, allIn(s, deep));
      s = act(s, short, { type: "call" });
    } else {
      s = act(s, short, { type: "call" });
      s = act(s, deep, allIn(s, deep));
      s = act(s, short, { type: "call" });
    }
    s = checkDown(s);
    expect(s.round).toBe("Showdown");
    const r = distributePotAndEndHand(s, short);
    if (!r.ok) throw new Error(r.error);
    s = r.state;
    expect(s.players[short].stack).toBe(2000);
    expect(s.players[deep].stack).toBe(4000);
    expect(total(s)).toBe(startTotal);
  });

  it("3-way: deep shoves on flop, short calls, middle folds; short wins", () => {
    let s = table([1000, 5000, 3000]);
    const startTotal = total(s);
    // preflop: everyone calls / checks
    let guard = 0;
    while (s.round === "Pre-flop" && guard++ < 10) {
      const i = s.currentPlayerIndex;
      const toCall = s.currentBet - s.players[i].bet;
      s = act(s, i, toCall > 0 ? { type: "call" } : { type: "check" });
    }
    expect(s.round).toBe("Flop");
    const pre = s.players.map((p) => p.totalContributed);

    // flop: act until deep(p1) to shove; others call (short) / fold (middle)
    guard = 0;
    while (s.round === "Flop" && guard++ < 10) {
      const i = s.currentPlayerIndex;
      if (i === 1 && s.currentBet === 0) s = act(s, i, allIn(s, i));
      else if (s.currentBet === 0) s = act(s, i, { type: "check" });
      else if (i === 0) s = act(s, i, { type: "call" });
      else s = act(s, i, { type: "fold" });
    }
    s = checkDown(s);
    expect(s.round).toBe("Showdown");
    const r = distributePotAndEndHand(s, 0);
    if (!r.ok) throw new Error(r.error);
    s = r.state;
    // short: 3人分のプリフロップ + 自分の残り 980 の2倍
    const shortWin = pre[0] + pre[1] + pre[2] + (1000 - pre[0]) * 2;
    expect(s.players[0].stack).toBe(shortWin);
    expect(s.players[2].stack).toBe(3000 - pre[2]);
    expect(s.players[1].stack).toBe(5000 - 1000); // 1000 only covered
    expect(total(s)).toBe(startTotal);
  });

  it("3-way all-in: short wins main, middle wins side, deep gets uncovered part back", () => {
    let s = table([1000, 5000, 3000]);
    const startTotal = total(s);
    let guard = 0;
    while (s.handInProgress && s.round === "Pre-flop" && guard++ < 10) {
      const i = s.currentPlayerIndex;
      const p = s.players[i];
      if (i === 1 && s.currentBet < p.bet + p.stack) s = act(s, i, allIn(s, i));
      else s = act(s, i, { type: "call" });
    }
    s = checkDown(s);
    expect(s.round).toBe("Showdown");

    // サイドポットの勝者が決まらない分配は拒否される（チップ消失を防ぐ）
    expect(unresolvedPots(s.players, [["p0"]]).map((p) => p.amount)).toEqual([4000]);
    const rejected = distributePotAndEndHand(s, 0);
    expect(rejected.ok).toBe(false);

    // short(p0) 最強、次に middle(p2)
    const r = distributePotByRankingAndEndHand(s, [[0], [2]]);
    if (!r.ok) throw new Error(r.error);
    const after = r.state;
    expect(after.players[0].stack).toBe(3000); // メイン 1000×3
    expect(after.players[2].stack).toBe(4000); // サイド 2000×2
    expect(after.players[1].stack).toBe(2000); // カバー外 2000 は返却
    expect(total(after)).toBe(startTotal);
  });

  it("3-way all-in: short wins main, side pot is chopped", () => {
    let s = table([1000, 5000, 3000]);
    const startTotal = total(s);
    let guard = 0;
    while (s.handInProgress && s.round === "Pre-flop" && guard++ < 10) {
      const i = s.currentPlayerIndex;
      const p = s.players[i];
      if (i === 1 && s.currentBet < p.bet + p.stack) s = act(s, i, allIn(s, i));
      else s = act(s, i, { type: "call" });
    }
    s = checkDown(s);
    const r = distributePotByRankingAndEndHand(s, [[0], [1, 2]]);
    if (!r.ok) throw new Error(r.error);
    s = r.state;
    expect(s.players[0].stack).toBe(3000);
    expect(s.players[2].stack).toBe(2000);
    expect(s.players[1].stack).toBe(4000); // サイド半分 2000 + 返却 2000
    expect(total(s)).toBe(startTotal);
  });

  it("chop between two short stacks needs a side-pot winner", () => {
    let s = table([1000, 1000, 5000, 3000]);
    let guard = 0;
    while (s.handInProgress && s.round === "Pre-flop" && guard++ < 10) {
      const i = s.currentPlayerIndex;
      const p = s.players[i];
      if (i === 2 && s.currentBet < p.bet + p.stack) s = act(s, i, allIn(s, i));
      else s = act(s, i, { type: "call" });
    }
    s = checkDown(s);
    expect(distributePotChopAndEndHand(s, [0, 1]).ok).toBe(false);
    const r = distributePotByRankingAndEndHand(s, [[0, 1], [3]]);
    if (!r.ok) throw new Error(r.error);
    expect(r.state.players.map((p) => p.stack)).toEqual([2000, 2000, 2000, 4000]);
  });

  it("chop between short and deep returns uncovered part to deep", () => {
    let s = table([1000, 5000]);
    const startTotal = total(s);
    if (s.currentPlayerIndex === 1) {
      s = act(s, 1, allIn(s, 1));
      s = act(s, 0, { type: "call" });
    } else {
      s = act(s, 0, { type: "call" });
      s = act(s, 1, allIn(s, 1));
      s = act(s, 0, { type: "call" });
    }
    s = checkDown(s);
    const r = distributePotChopAndEndHand(s, [0, 1]);
    if (!r.ok) throw new Error(r.error);
    s = r.state;
    expect(s.players[0].stack).toBe(1000);
    expect(s.players[1].stack).toBe(5000);
    expect(total(s)).toBe(startTotal);
  });
});
