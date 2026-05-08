import type { Player, SidePot } from "@/types/poker";

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
