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

/** 争奪中のポット（ハンドに残っているプレイヤーのうち参加資格のある者） */
export interface ContestedPot {
  amount: number;
  contenderIds: string[];
}

/**
 * サイドポットを「誰が争うか」単位にまとめる。
 * - 参加者が1人だけ（カバーされていない差額）→ その人に返却
 * - 資格者が全員フォールド済み → 直前のポットへ合算
 * - 同じ顔ぶれのポットは1つに合算
 */
export function contestPots(players: Player[], sidePots: SidePot[]): ContestedPot[] {
  const inHandIds = new Set(players.filter(inCurrentHand).map((p) => p.id));
  const result: ContestedPot[] = [];
  const sameSet = (a: string[], b: string[]) =>
    a.length === b.length && a.every((id) => b.includes(id));

  for (const pot of sidePots) {
    let contenders = pot.eligiblePlayerIds.filter((id) => inHandIds.has(id));
    if (contenders.length === 0) {
      if (pot.eligiblePlayerIds.length === 1 || result.length === 0) {
        contenders = pot.eligiblePlayerIds;
      } else {
        result[result.length - 1].amount += pot.amount;
        continue;
      }
    }
    const last = result[result.length - 1];
    if (last && sameSet(last.contenderIds, contenders)) {
      last.amount += pot.amount;
    } else {
      result.push({ amount: pot.amount, contenderIds: contenders });
    }
  }
  return result;
}

/**
 * 順位（強い順のグループ。グループ内は同点＝チョップ）で勝者が決まらないポット。
 * 返り値が空なら、すべてのポットの行き先が決まっている。
 */
export function unresolvedPots(
  players: Player[],
  ranking: string[][],
): ContestedPot[] {
  const ranked = new Set(ranking.flat());
  return contestPots(players, computeSidePots(players)).filter(
    (pot) =>
      pot.contenderIds.length >= 2 && !pot.contenderIds.some((id) => ranked.has(id)),
  );
}

/**
 * 順位に従って各ポットを分配する。各ポットは、参加資格のある中で最上位のグループが分け合う。
 * 端数はディーラーから時計回りの順に1チップずつ。
 * @returns awards: プレイヤー id → 獲得額 / unresolved: 勝者が決まらず未分配のポット
 */
export function distributeByRanking(
  players: Player[],
  sidePots: SidePot[],
  ranking: string[][],
  dealerIndex: number,
): { awards: Map<string, number>; unresolved: ContestedPot[] } {
  const awards = new Map<string, number>();
  const unresolved: ContestedPot[] = [];

  const addAward = (id: string, amount: number) => {
    if (amount <= 0) return;
    awards.set(id, (awards.get(id) ?? 0) + amount);
  };

  for (const pot of contestPots(players, sidePots)) {
    const winners =
      pot.contenderIds.length === 1
        ? pot.contenderIds
        : (ranking
            .map((tier) => tier.filter((id) => pot.contenderIds.includes(id)))
            .find((tier) => tier.length > 0) ?? []);

    if (winners.length === 0) {
      unresolved.push(pot);
      continue;
    }

    const share = Math.floor(pot.amount / winners.length);
    const remainder = pot.amount % winners.length;
    const ordered = sortIndicesFromDealer(
      winners.map((id) => players.findIndex((p) => p.id === id)).filter((i) => i >= 0),
      dealerIndex,
      players.length,
    );
    for (const idx of ordered) addAward(players[idx].id, share);
    for (let i = 0; i < remainder; i++) addAward(players[ordered[i]].id, 1);
  }

  return { awards, unresolved };
}

/**
 * サイドポットごとに勝者へ分配。オールイン差額は対象外プレイヤーへ返却。
 * chop=false なら winnerIds[0] の単独勝ち、chop=true なら winnerIds で均等分割。
 * 勝者が参加していないポットは未分配になるため、事前に unresolvedPots で確認すること。
 * @returns プレイヤー id → 獲得額
 */
export function distributeSidePots(
  players: Player[],
  sidePots: SidePot[],
  winnerIds: string[],
  options: { chop: boolean; dealerIndex: number },
): Map<string, number> {
  const ranking = options.chop ? [winnerIds] : winnerIds.slice(0, 1).map((id) => [id]);
  return distributeByRanking(players, sidePots, ranking, options.dealerIndex).awards;
}
