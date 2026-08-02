import { describe, expect, it } from "vitest";
import {
  formatAllHandsForCopy,
  formatHandLogForCopy,
  groupHistoryByHand,
} from "./history";

describe("groupHistoryByHand", () => {
  it("splits history by hand start markers", () => {
    const history = [
      "#1 ハンド開始（SB 10 / BB 20） A(1000) / B(1000)",
      "A: レイズ → 60",
      "B: フォールド",
      "結果: A がポット 30 を獲得（フォールド勝ち）",
      "#2 ハンド開始（SB 10 / BB 20） A(1030) / B(970)",
      "--- フロップ ---",
      "フロップ: Ah Kd 7c",
      "結果: B がポット 40 を獲得（ショーダウン）",
    ];

    const groups = groupHistoryByHand(history);
    expect(groups).toHaveLength(2);
    expect(groups[0].handNumber).toBe(1);
    expect(groups[0].lines).toHaveLength(4);
    expect(groups[0].summary).toContain("フォールド勝ち");
    expect(groups[1].summary).toContain("ショーダウン");
    expect(formatHandLogForCopy(groups[1])).toContain("フロップ: Ah Kd 7c");
    expect(formatAllHandsForCopy(groups)).toContain("---");
  });
});
