import type {
  ClockConfig,
  ClockTimeoutBehavior,
  PokerAction,
  PokerState,
} from "@/types/poker";
import { type ApplyResult, validateAction } from "./game";
import { cloneStateBase } from "./helpers";

export const DEFAULT_CLOCK_CONFIG: ClockConfig = {
  enabled: false,
  seconds: 30,
  timeoutBehavior: "check-fold",
  cardSeconds: 30,
  cardCount: 2,
  excludedPlayerIds: [],
};

export const CLOCK_TIMEOUT_LABELS: Record<ClockTimeoutBehavior, string> = {
  "check-fold": "自動チェック/フォールド",
  fold: "自動フォールド",
  notify: "通知のみ",
};

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/** 保存データ等から安全に ClockConfig を復元 */
export function normalizeClockConfig(raw: unknown): ClockConfig {
  const d = DEFAULT_CLOCK_CONFIG;
  if (!raw || typeof raw !== "object") return { ...d, excludedPlayerIds: [] };
  const r = raw as Partial<ClockConfig>;
  const behavior: ClockTimeoutBehavior =
    r.timeoutBehavior === "fold" || r.timeoutBehavior === "notify" || r.timeoutBehavior === "check-fold"
      ? r.timeoutBehavior
      : d.timeoutBehavior;
  return {
    enabled: typeof r.enabled === "boolean" ? r.enabled : d.enabled,
    seconds: clampInt(r.seconds, 1, 3600, d.seconds),
    timeoutBehavior: behavior,
    cardSeconds: clampInt(r.cardSeconds, 1, 3600, d.cardSeconds),
    cardCount: clampInt(r.cardCount, 0, 99, d.cardCount),
    excludedPlayerIds: Array.isArray(r.excludedPlayerIds)
      ? r.excludedPlayerIds.filter((x): x is string => typeof x === "string")
      : [],
  };
}

/** このプレイヤーにクロックが適用されるか */
export function isClockTarget(config: ClockConfig, playerId: string | undefined): boolean {
  if (!config.enabled || !playerId) return false;
  return !config.excludedPlayerIds.includes(playerId);
}

/** タイムバンクカードを1枚消費 */
export function spendTimeBankCard(state: PokerState, playerIndex: number): ApplyResult {
  const p = state.players[playerIndex];
  if (!p) return { ok: false, error: "無効な席です" };
  if ((p.timeBankCards ?? 0) <= 0) {
    return { ok: false, error: "タイムバンクカードが残っていません" };
  }
  const s = cloneStateBase(state);
  s.players[playerIndex].timeBankCards = (p.timeBankCards ?? 0) - 1;
  return { ok: true, state: s };
}

/** 全プレイヤーのカード枚数を count にそろえる */
export function resetTimeBankCards(state: PokerState, count: number): PokerState {
  const s = cloneStateBase(state);
  const n = Math.max(0, Math.floor(count));
  s.players = s.players.map((p) => ({ ...p, timeBankCards: n }));
  return s;
}

/** 時間切れ時に自動実行するアクション（通知のみなら null） */
export function timeoutAction(
  state: PokerState,
  playerIndex: number,
  behavior: ClockTimeoutBehavior,
): PokerAction | null {
  if (behavior === "notify") return null;
  if (
    behavior === "check-fold" &&
    validateAction(state, playerIndex, { type: "check" }) === null
  ) {
    return { type: "check" };
  }
  return { type: "fold" };
}
