"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { validateAction } from "@/lib/poker";
import { useGameStore } from "@/stores/game-store";
import { playerColor } from "@/features/players/player-colors";
import { ActionWheel, type WheelAnchor } from "./action-wheel";

export function BettingControls() {
  const poker = useGameStore((s) => s.poker);
  const submitAction = useGameStore((s) => s.submitAction);
  const undoLastAction = useGameStore((s) => s.undoLastAction);
  const canUndo = useGameStore((s) => s.undoStack.length > 0);
  const [error, setError] = useState<string | null>(null);

  const idx = poker.currentPlayerIndex;
  const p = poker.players[idx];
  const c = playerColor(idx);
  const minTotal = poker.currentBet + poker.minRaise;

  if (!poker.handInProgress || poker.round === "Showdown") return null;

  const toCall = p ? Math.max(0, poker.currentBet - p.bet) : 0;
  const callAmount = p ? Math.min(toCall, p.stack) : 0;
  const run = (action: Parameters<typeof submitAction>[1]) => {
    const err = submitAction(idx, action);
    setError(err);
  };

  const onUndo = () => {
    const err = undoLastAction();
    setError(err);
  };

  const canCheck = validateAction(poker, idx, { type: "check" }) === null;
  const canCall = validateAction(poker, idx, { type: "call" }) === null;
  const isBetting = poker.currentBet === 0;

  /* ── wheel anchors (min → presets → all-in) ── */
  const minAmount = isBetting ? poker.bigBlind : minTotal;
  const maxAmount = isBetting ? (p?.stack ?? 0) : (p?.bet ?? 0) + (p?.stack ?? 0);
  const canRaise =
    minAmount <= maxAmount &&
    validateAction(
      poker,
      idx,
      isBetting ? { type: "bet", amount: minAmount } : { type: "raise", toAmount: minAmount },
    ) === null;

  const currentBetBase = Math.max(poker.currentBet, poker.bigBlind);
  const presets = isBetting
    ? [
        { label: "1/3", value: poker.pot / 3 },
        { label: "1/2", value: poker.pot / 2 },
        { label: "POT", value: poker.pot },
      ]
    : [
        { label: "×2", value: currentBetBase * 2 },
        { label: "×2.5", value: currentBetBase * 2.5 },
        { label: "×3", value: currentBetBase * 3 },
        { label: "POT", value: poker.pot },
      ];

  const anchors: WheelAnchor[] = [];
  if (canRaise) {
    anchors.push({ label: isBetting ? "BET" : "RAISE", value: minAmount });
    const seen = new Set<number>([minAmount, maxAmount]);
    presets
      .map((x) => ({ ...x, value: Math.round(x.value) }))
      .filter((x) => x.value > minAmount && x.value < maxAmount && !seen.has(x.value))
      .sort((a, b) => a.value - b.value)
      .forEach((x) => {
        seen.add(x.value);
        anchors.push(x);
      });
    if (maxAmount > minAmount) anchors.push({ label: "ALL-IN", value: maxAmount });
  }

  const onRaise = (value: number) =>
    run(isBetting ? { type: "bet", amount: value } : { type: "raise", toAmount: value });

  const callTitle = canCheck ? "CHECK" : callAmount < toCall ? "ALL-IN" : "CALL";
  const callSub = canCheck ? undefined : `+${callAmount.toLocaleString("en-US")}`;

  const posLabel =
    p?.position === "D" &&
    poker.players.filter((pl) => pl.status !== "out").length === 2
      ? "BTN/SB"
      : p?.position;

  return (
    <section className="shrink-0 px-3 pt-2 pb-2">
      <div className="mx-auto max-w-lg space-y-2">
        {/* Current player info bar */}
        <div
          className={`flex items-center justify-between gap-2 rounded-xl border-2 px-2.5 py-1.5 transition-colors ${c.turnBar}`}
        >
          <div className="min-w-0">
            <div>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${c.turnBadge}`}
              >
                ▶ 番
              </span>
              <span className="ml-2 text-sm font-bold text-foreground">
                {p?.name ?? "—"}
              </span>
              {posLabel && (
                <span className={`ml-1.5 text-[10px] font-semibold ${c.turnText}`}>
                  ({posLabel})
                </span>
              )}
            </div>
            <p className="text-[10px] tabular-nums text-muted-foreground">
              スタック {p?.stack ?? 0} · Pot {poker.pot}
              {toCall > 0 ? ` · toCall ${toCall}` : ""}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!canUndo}
            onClick={onUndo}
            className="h-9 shrink-0 rounded-xl border-border bg-card/60 px-3 text-[11px] font-medium text-muted-foreground hover:bg-muted disabled:opacity-40"
          >
            ひとつ戻る
          </Button>
        </div>

        <ActionWheel
          key={`${idx}-${poker.round}-${poker.currentBet}`}
          anchors={anchors}
          step={poker.smallBlind || 1}
          isBetting={isBetting}
          callTitle={callTitle}
          callSub={callSub}
          canCall={canCheck || canCall}
          canRaise={canRaise}
          onFold={() => run({ type: "fold" })}
          onCall={() => run(canCheck ? { type: "check" } : { type: "call" })}
          onRaise={onRaise}
        />

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </section>
  );
}
