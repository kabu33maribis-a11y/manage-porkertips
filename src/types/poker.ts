export type Round = "Pre-flop" | "Flop" | "Turn" | "River" | "Showdown";

export type PlayerStatus = "active" | "folded" | "all-in" | "out";

export interface Player {
  id: string;
  name: string;
  stack: number;
  bet: number;
  totalContributed: number;
  status: PlayerStatus;
  position: "D" | "SB" | "BB" | null;
}

export interface PokerState {
  players: Player[];
  dealerIndex: number;
  currentPlayerIndex: number;
  pot: number;
  currentBet: number;
  minRaise: number;
  round: Round;
  smallBlind: number;
  bigBlind: number;
  lastAggressorIndex: number;
  history: string[];
  /** 現在ハンドのボードカード（ログ用・判定はしない） */
  board: string[];
  /** 現在のストリートで自発的アクション済み（レイズでリセット） */
  actedThisStreet: boolean[];
  /** ハンド進行中（ブラインド投稿〜ショーダウン/Pot確定まで） */
  handInProgress: boolean;
}

export type PokerAction =
  | { type: "fold" }
  | { type: "check" }
  | { type: "call" }
  | { type: "bet"; amount: number }
  | { type: "raise"; toAmount: number };

export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}
