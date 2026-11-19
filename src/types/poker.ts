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
  /** 残りタイムバンクカード枚数 */
  timeBankCards?: number;
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

export type ClockTimeoutBehavior = "check-fold" | "fold" | "notify";

/** クロック（持ち時間）設定。undo 対象外なので PokerState とは別に保持 */
export interface ClockConfig {
  enabled: boolean;
  /** 1アクションの持ち時間（秒） */
  seconds: number;
  /** 時間切れ時の挙動 */
  timeoutBehavior: ClockTimeoutBehavior;
  /** タイムバンクカード1枚の延長秒数 */
  cardSeconds: number;
  /** 配布するカード枚数 */
  cardCount: number;
  /** クロックを適用しないプレイヤー */
  excludedPlayerIds: string[];
}
