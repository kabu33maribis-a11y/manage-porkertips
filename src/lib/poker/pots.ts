import type { Player, SidePot } from "@/types/poker";
import { inCurrentHand } from "./helpers";

/**
 * totalContributed に基づくサイドポット分割。
 */
export function computeSidePots(players: Player[]): SidePot[] {
  const withContrib = players.filter((p) => p.totalContributed > 0);
  if (withContrib.length === 0) return [];

  const levels = [
    ...new Set(withContrib.map((p) => p.totalContributed)),
  ].sort((a, b) => a - b);

  const pots: SidePot[] = [];
  let prev = 0;

  for (const level of levels) {
    const delta = level - prev;
    const eligiblePlayerIds = withContrib
      .filter((p) => p.totalContributed >= level)
      .map((p) => p.id);
    const amount = delta * eligiblePlayerIds.length;
    if (amount > 0) {
      pots.push({ amount, eligiblePlayerIds });
    }
    prev = level;
  }

  return pots;
}

function sortIndicesFromDealer(
  indices: number[],
  dealerIndex: number,
  seatCount: number,
): number[] {
  return [...indices].sort((a, b) => {
    const distA = (a - dealerIndex + seatCount) % seatCount;
    const distB = (b - dealerIndex + seatCount) % seatCount;
    return distA - distB;
  });
}

/**
 * サイドポットごとに勝者へ分配。オールイン差額は対象外プレイヤーへ返却。
 * @returns プレイヤー id → 獲得額
 */
export function distributeSidePots(
  players: Player[],
  sidePots: SidePot[],
  winnerIds: string[],
  options: { chop: boolean; dealerIndex: number },
): Map<string, number> {
  const awards = new Map<string, number>();
  const winnerSet = new Set(winnerIds);
  const inHandIds = new Set(
    players.filter(inCurrentHand).map((p) => p.id),
  );

  const addAward = (id: string, amount: number) => {
    if (amount <= 0) return;
    awards.set(id, (awards.get(id) ?? 0) + amount);
  };

  for (const pot of sidePots) {
    const contenders = pot.eligiblePlayerIds.filter((id) => inHandIds.has(id));

    if (contenders.length === 0) {
      if (pot.eligiblePlayerIds.length === 1) {
        addAward(pot.eligiblePlayerIds[0], pot.amount);
      }
      continue;
    }

    if (contenders.length === 1) {
      addAward(contenders[0], pot.amount);
      continue;
    }

    if (options.chop) {
      const potWinners = contenders.filter((id) => winnerSet.has(id));
      if (potWinners.length === 0) continue;

      const share = Math.floor(pot.amount / potWinners.length);
      const remainder = pot.amount % potWinners.length;
      const indices = potWinners.map((id) => players.findIndex((p) => p.id === id));
      const ordered = sortIndicesFromDealer(
        indices.filter((i) => i >= 0),
        options.dealerIndex,
        players.length,
      );

      for (const idx of ordered) {
        addAward(players[idx].id, share);
      }
      for (let i = 0; i < remainder; i++) {
        addAward(players[ordered[i]].id, 1);
      }
      continue;
    }

    const winnerId = winnerIds[0];
    if (winnerId && contenders.includes(winnerId)) {
      addAward(winnerId, pot.amount);
    }
  }

  return awards;
}
