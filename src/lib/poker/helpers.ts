import type { Player, PokerState, Round } from "@/types/poker";

export const ROUND_ORDER: Round[] = [
  "Pre-flop",
  "Flop",
  "Turn",
  "River",
  "Showdown",
];

export function inCurrentHand(p: Player): boolean {
  return p.status !== "folded" && p.status !== "out";
}

export function canVoluntarilyAct(p: Player): boolean {
  return inCurrentHand(p) && p.stack > 0;
}

export function countInHand(players: Player[]): number {
  return players.filter(inCurrentHand).length;
}

export function isShortAllIn(p: Player, currentBet: number): boolean {
  return (
    p.stack === 0 &&
    inCurrentHand(p) &&
    p.bet < currentBet &&
    p.status === "all-in"
  );
}

export function activeSeatIndices(players: Player[]): number[] {
  return players
    .map((p, i) => (p.status !== "out" ? i : -1))
    .filter((i) => i >= 0);
}

/** アウトでない次の席（ディーラーボタンの移動・ブラインド位置用） */
export function nextOccupiedSeat(players: Player[], from: number): number {
  const n = players.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (players[i].status !== "out") return i;
  }
  return from;
}

export function nextInHandSeat(
  players: Player[],
  from: number,
): number | null {
  const n = players.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (inCurrentHand(players[i])) return i;
  }
  return null;
}

export function clearPositions(players: Player[]): Player[] {
  return players.map((p) => ({ ...p, position: null }));
}

/**
 * D / SB / BB を割り当て。
 * HU: ディーラーが SB、相手が BB（ボタンは dealerIndex で保持）。
 * 3人以上: D → SB → BB は時計回り。
 */
export function assignBlindPositions(
  players: Player[],
  dealerIndex: number,
): Player[] {
  const seats = activeSeatIndices(players);
  if (seats.length < 2) return clearPositions(players);

  if (seats.length === 2) {
    const btnSeat = dealerIndex;
    const bbSeat = seats.find((s) => s !== dealerIndex)!;
    return players.map((p, i) => {
      if (i === btnSeat) return { ...p, position: "D" as const };
      if (i === bbSeat) return { ...p, position: "BB" as const };
      return { ...p, position: null };
    });
  }

  const d = dealerIndex;
  const sbSeat = nextOccupiedSeat(players, d);
  const bbSeat = nextOccupiedSeat(players, sbSeat);

  return players.map((p, i) => {
    if (i === d) return { ...p, position: "D" as const };
    if (i === sbSeat) return { ...p, position: "SB" as const };
    if (i === bbSeat) return { ...p, position: "BB" as const };
    return { ...p, position: null };
  });
}

/** プリフロップ最初のアクション: HU なら SB、それ以外は BB の次の席 */
export function firstActorPreflop(players: Player[]): number {
  const seats = activeSeatIndices(players);
  if (seats.length < 2) return 0;

  if (seats.length === 2) {
    const btn = players.findIndex((p) => p.position === "D");
    return btn >= 0 ? btn : seats[0];
  }

  const bbSeat = players.findIndex((p) => p.position === "BB");
  if (bbSeat < 0) return seats[0];
  return nextInHandSeat(players, bbSeat) ?? seats[0];
}

/** ポストフロップ最初のアクション（フロップ〜リバー）: ボタンの次のハンド参加席 */
export function firstActorPostflop(
  players: Player[],
  dealerIndex: number,
): number {
  return nextInHandSeat(players, dealerIndex) ?? dealerIndex;
}

export function cloneStateBase(state: PokerState): PokerState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p })),
    history: [...state.history],
    board: [...(state.board ?? [])],
    actedThisStreet: [...state.actedThisStreet],
  };
}
