import type { PokerAction, PokerState, Player } from "@/types/poker";
import {
  cloneStateBase,
  countInHand,
  firstActorPostflop,
  firstActorPreflop,
  inCurrentHand,
  isShortAllIn,
  activeSeatIndices,
  assignBlindPositions,
  nextOccupiedSeat,
  ROUND_ORDER,
  canVoluntarilyAct,
} from "./helpers";

export type ApplyResult =
  | { ok: true; state: PokerState }
  | { ok: false; error: string };

function needsVoluntaryMark(p: Player, state: PokerState): boolean {
  if (!inCurrentHand(p)) return false;
  if (isShortAllIn(p, state.currentBet)) return false;
  if (p.stack === 0 && p.bet >= state.currentBet) return false;
  return canVoluntarilyAct(p);
}

function allFacingBetsMatched(state: PokerState): boolean {
  for (const p of state.players) {
    if (!inCurrentHand(p)) continue;
    if (p.stack > 0 && p.bet < state.currentBet) return false;
  }
  return true;
}

function voluntaryComplete(state: PokerState): boolean {
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i];
    if (!needsVoluntaryMark(p, state)) continue;
    if (!state.actedThisStreet[i]) return false;
  }
  return true;
}

function resetActedOnRaise(state: PokerState, raiserIndex: number): void {
  state.actedThisStreet = state.players.map(() => false);
  state.actedThisStreet[raiserIndex] = true;
}

function findNextToAct(state: PokerState): number | null {
  const n = state.players.length;
  const start = (state.currentPlayerIndex + 1) % n;
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    const p = state.players[i];
    if (!inCurrentHand(p)) continue;
    if (!needsVoluntaryMark(p, state)) continue;
    if (!state.actedThisStreet[i]) return i;
  }
  return null;
}

function pushHistory(state: PokerState, line: string): void {
  state.history = [...state.history, line].slice(-200);
}

function syncActedLength(state: PokerState): void {
  while (state.actedThisStreet.length < state.players.length) {
    state.actedThisStreet.push(false);
  }
  state.actedThisStreet = state.actedThisStreet.slice(0, state.players.length);
}

export function ensureDerivedArrays(state: PokerState): PokerState {
  syncActedLength(state);
  return state;
}

/** テーブル初期（プレイヤーなし） */
export function createEmptyPokerState(smallBlind: number, bigBlind: number): PokerState {
  return {
    players: [],
    dealerIndex: 0,
    currentPlayerIndex: 0,
    pot: 0,
    currentBet: 0,
    minRaise: bigBlind,
    round: "Pre-flop",
    smallBlind,
    bigBlind,
    lastAggressorIndex: 0,
    history: [],
    actedThisStreet: [],
    handInProgress: false,
  };
}

function payFromStack(
  p: Player,
  amount: number,
  state: PokerState,
): number {
  const pay = Math.min(p.stack, Math.max(0, amount));
  if (pay <= 0) return 0;
  p.stack -= pay;
  p.bet += pay;
  p.totalContributed += pay;
  state.pot += pay;
  if (p.stack === 0 && inCurrentHand(p)) {
    p.status = "all-in";
  }
  return pay;
}

function rotateDealer(state: PokerState): void {
  state.dealerIndex = nextOccupiedSeat(state.players, state.dealerIndex);
}

function preparePlayersForNewHand(players: Player[]): Player[] {
  return players.map((p) => {
    if (p.stack <= 0) {
      return {
        ...p,
        bet: 0,
        totalContributed: 0,
        status: "out",
        position: null,
      };
    }
    return {
      ...p,
      bet: 0,
      totalContributed: 0,
      status: "active",
      position: null,
    };
  });
}

function endHandCleanup(state: PokerState): void {
  state.handInProgress = false;
  state.currentBet = 0;
  state.pot = 0;
  state.players = state.players.map((p) => ({
    ...p,
    bet: 0,
    totalContributed: 0,
    position: null,
    status:
      p.stack <= 0 ? "out" : p.status === "folded" || p.status === "all-in"
        ? "active"
        : p.status,
  }));
  state.round = "Pre-flop";
}

function awardPot(state: PokerState, winnerIndex: number, reason: string): void {
  const w = state.players[winnerIndex];
  w.stack += state.pot;
  pushHistory(
    state,
    `${w.name} がポット ${state.pot} を獲得${reason ? `（${reason}）` : ""}`,
  );
  state.pot = 0;
  endHandCleanup(state);
}

function maybeSingleWinner(state: PokerState): ApplyResult | null {
  const contenders = state.players
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => inCurrentHand(p));
  if (contenders.length !== 1) return null;
  awardPot(state, contenders[0].i, "フォールド勝ち");
  return { ok: true, state };
}

function advanceStreet(state: PokerState): PokerState {
  const idx = ROUND_ORDER.indexOf(state.round);
  const nextRound = ROUND_ORDER[idx + 1] ?? "Showdown";

  state.players = state.players.map((p) => ({
    ...p,
    bet: 0,
  }));
  state.currentBet = 0;
  state.minRaise = state.bigBlind;
  state.actedThisStreet = state.players.map(() => false);
  state.round = nextRound;

  if (nextRound === "Showdown") {
    pushHistory(state, "ショーダウン（実カードはテーブルで判定）");
    state.currentPlayerIndex = state.dealerIndex;
    state.handInProgress = false;
    return state;
  }

  const first = firstActorPostflop(state.players, state.dealerIndex);

  state.currentPlayerIndex = first;
  state.lastAggressorIndex = first;

  const labels: Record<string, string> = {
    Flop: "フロップ",
    Turn: "ターン",
    River: "リバー",
  };
  pushHistory(state, `${labels[nextRound] ?? nextRound} 開始`);

  return state;
}

function tryCloseBettingRound(
  state: PokerState,
): { state: PokerState } | null {
  if (!allFacingBetsMatched(state) || !voluntaryComplete(state)) return null;

  const alive = countInHand(state.players);
  if (alive <= 1) {
    const only = state.players.findIndex((p) => inCurrentHand(p));
    if (only >= 0) awardPot(state, only, "フォールド勝ち");
    return { state };
  }

  return { state: advanceStreet(state) };
}

function settleNoActionFlow(state: PokerState): PokerState {
  let s = state;
  let guard = 0;

  while (s.handInProgress && guard < 8) {
    guard += 1;

    const current = s.players[s.currentPlayerIndex];
    if (
      current &&
      needsVoluntaryMark(current, s) &&
      !s.actedThisStreet[s.currentPlayerIndex]
    ) {
      return s;
    }

    const next = findNextToAct(s);
    if (next !== null) {
      s.currentPlayerIndex = next;
      return s;
    }

    const closed = tryCloseBettingRound(s);
    if (!closed) return s;
    s = closed.state;

    if (!s.handInProgress || s.round === "Showdown") return s;
  }

  return s;
}

export function startHand(state: PokerState): ApplyResult {
  const s = cloneStateBase(state);
  syncActedLength(s);

  const seated = activeSeatIndices(s.players);
  if (seated.length < 2) {
    return { ok: false, error: "ハンド開始には2人以上必要です" };
  }

  const previousHandStarted = s.history.some((h) => h.includes("ハンド開始"));
  if (previousHandStarted) {
    rotateDealer(s);
  }
  s.players = preparePlayersForNewHand(s.players);
  s.pot = 0;
  s.currentBet = 0;
  s.round = "Pre-flop";
  s.players = assignBlindPositions(s.players, s.dealerIndex);

  const bbSeat = s.players.findIndex((p) => p.position === "BB");
  const sbSeat = s.players.findIndex((p) => p.position === "SB");

  if (bbSeat < 0 || sbSeat < 0) {
    return { ok: false, error: "ブラインド位置を決定できません" };
  }

  payFromStack(s.players[sbSeat], s.smallBlind, s);
  payFromStack(s.players[bbSeat], s.bigBlind, s);

  const bbPosted = s.players[bbSeat].bet;
  s.currentBet = bbPosted;
  s.minRaise = s.bigBlind;
  s.lastAggressorIndex = bbSeat;
  s.actedThisStreet = s.players.map(() => false);
  s.handInProgress = true;

  s.currentPlayerIndex = firstActorPreflop(s.players);

  pushHistory(s, `ハンド開始（SB ${s.smallBlind} / BB ${s.bigBlind}）`);

  const folded = maybeSingleWinner(s);
  if (folded) return folded;

  return { ok: true, state: settleNoActionFlow(s) };
}

export function validateAction(
  state: PokerState,
  playerIndex: number,
  action: PokerAction,
): string | null {
  if (!state.handInProgress) return "ハンドが進行していません";
  const p = state.players[playerIndex];
  if (!p) return "無効な席です";
  if (!inCurrentHand(p)) return "この席はハンドに参加していません";
  if (p.stack <= 0) return "オールイン中はアクションできません";
  if (state.currentPlayerIndex !== playerIndex) return "あなたの番ではありません";

  const toCall = Math.max(0, state.currentBet - p.bet);

  switch (action.type) {
    case "fold":
      return null;
    case "check":
      if (toCall > 0) return "チェックできません（コールが必要）";
      return null;
    case "call": {
      if (toCall === 0) return "コールの必要はありません";
      return null;
    }
    case "bet": {
      if (state.currentBet > 0) return "すでにベットがあります（レイズしてください）";
      const minBet = state.bigBlind;
      if (action.amount < minBet) return `ベットは最低 ${minBet} 以上です`;
      if (action.amount > p.stack + p.bet) return "スタックが不足しています";
      return null;
    }
    case "raise": {
      const minTotal = state.currentBet + state.minRaise;
      if (action.toAmount < minTotal)
        return `レイズは合計 ${minTotal} 以上である必要があります`;
      const maxTotal = p.bet + p.stack;
      if (action.toAmount > maxTotal) return "スタックが不足しています";
      if (action.toAmount <= state.currentBet) return "レイズは現在のベットより大きい必要があります";
      return null;
    }
    default:
      return "未対応のアクションです";
  }
}

export function applyAction(
  state: PokerState,
  playerIndex: number,
  action: PokerAction,
): ApplyResult {
  const err = validateAction(state, playerIndex, action);
  if (err) return { ok: false, error: err };

  const s = cloneStateBase(state);
  syncActedLength(s);
  const p = s.players[playerIndex];
  const name = p.name;

  const prevBet = s.currentBet;

  switch (action.type) {
    case "fold": {
      p.status = "folded";
      s.actedThisStreet[playerIndex] = true;
      pushHistory(s, `${name}: フォールド`);
      break;
    }
    case "check": {
      s.actedThisStreet[playerIndex] = true;
      pushHistory(s, `${name}: チェック`);
      break;
    }
    case "call": {
      const toCall = Math.max(0, s.currentBet - p.bet);
      payFromStack(p, toCall, s);
      s.actedThisStreet[playerIndex] = true;
      pushHistory(s, `${name}: コール ${toCall}`);
      break;
    }
    case "bet": {
      const target = action.amount;
      const add = target - p.bet;
      payFromStack(p, add, s);
      s.currentBet = p.bet;
      const increment = s.currentBet - prevBet;
      s.minRaise = Math.max(s.bigBlind, increment);
      s.lastAggressorIndex = playerIndex;
      resetActedOnRaise(s, playerIndex);
      pushHistory(s, `${name}: ベット ${s.currentBet}`);
      break;
    }
    case "raise": {
      const target = action.toAmount;
      const add = target - p.bet;
      payFromStack(p, add, s);
      const increment = target - prevBet;
      s.currentBet = target;
      s.minRaise = Math.max(s.bigBlind, increment);
      s.lastAggressorIndex = playerIndex;
      resetActedOnRaise(s, playerIndex);
      pushHistory(s, `${name}: レイズ → ${s.currentBet}`);
      break;
    }
  }

  const earlyWin = maybeSingleWinner(s);
  if (earlyWin) return earlyWin;

  const closed = tryCloseBettingRound(s);
  if (closed) {
    const nextState = settleNoActionFlow(closed.state);
    const done = maybeSingleWinner(nextState);
    if (done) return done;
    return { ok: true, state: nextState };
  }

  const next = findNextToAct(s);
  if (next === null) {
    return { ok: false, error: "次のプレイヤーを決定できませんでした" };
  }
  s.currentPlayerIndex = next;
  return { ok: true, state: s };
}

/** ショーダウン後にポットを手動分配してハンドを閉じる（勝者席インデックス） */
export function distributePotAndEndHand(
  state: PokerState,
  winnerIndex: number,
): ApplyResult {
  if (!inCurrentHand(state.players[winnerIndex])) {
    return { ok: false, error: "勝者がハンドに参加していません" };
  }
  const s = cloneStateBase(state);
  awardPot(s, winnerIndex, "ショーダウン");
  return { ok: true, state: s };
}
