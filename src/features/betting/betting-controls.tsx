"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateAction } from "@/lib/poker";
import { useGameStore } from "@/stores/game-store";

export function BettingControls() {
  const poker = useGameStore((s) => s.poker);
  const submitAction = useGameStore((s) => s.submitAction);
  const undoLastAction = useGameStore((s) => s.undoLastAction);
  const canUndo = useGameStore(
    (s) =>
      s.undoStack.length > 0 ||
      (s.realtimeConnected && s.realtimeRole === "guest"),
  );
  const [raiseTo, setRaiseTo] = useState("");
  const [betAmt, setBetAmt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const betInputRef = useRef<HTMLInputElement>(null);

  const idx = poker.currentPlayerIndex;
  const p = poker.players[idx];
  const minTotal = poker.currentBet + poker.minRaise;

  useEffect(() => {
    setRaiseTo(String(minTotal));
    setBetAmt(String(poker.bigBlind));
  }, [minTotal, poker.bigBlind, idx, poker.round]);

  if (!poker.handInProgress || poker.round === "Showdown") return null;

  const toCall = p ? Math.max(0, poker.currentBet - p.bet) : 0;
  const callAmount = p ? Math.min(toCall, p.stack) : 0;
  const callLabel =
    toCall === 0
      ? "Check"
      : callAmount < toCall
        ? `All-in ${callAmount}`
        : `Call ${callAmount}`;

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
  const betValue = Math.max(1, Number(betAmt) || poker.bigBlind);
  const canBet =
    poker.currentBet === 0 &&
    validateAction(poker, idx, { type: "bet", amount: betValue }) === null;
  const raiseAmount = Number(raiseTo);
  const canRaise =
    poker.currentBet > 0 &&
    validateAction(poker, idx, { type: "raise", toAmount: raiseAmount }) === null;
  const maxBetAmount = p?.stack ?? 0;
  const maxTotal = (p?.bet ?? 0) + (p?.stack ?? 0);
  const currentBetBase = Math.max(poker.currentBet, poker.bigBlind);

  const quickBetButtons = [
    { label: "2x", value: poker.bigBlind * 2 },
    { label: "3x", value: poker.bigBlind * 3 },
    { label: "4x", value: poker.bigBlind * 4 },
    { label: "1/3", value: Math.round(poker.pot / 3) },
    { label: "1/2", value: Math.round(poker.pot / 2) },
    { label: "Pot", value: poker.pot },
  ].map((item) => ({
    ...item,
    value: Math.max(poker.bigBlind, Math.round(item.value)),
  }));

  const quickRaiseButtons = [
    { label: "2x", value: Math.round(currentBetBase * 2) },
    { label: "3x", value: Math.round(currentBetBase * 3) },
    { label: "4x", value: Math.round(currentBetBase * 4) },
    { label: "1/3", value: Math.round(poker.pot / 3) },
    { label: "1/2", value: Math.round(poker.pot / 2) },
    { label: "Pot", value: poker.pot },
  ].map((item) => ({
    ...item,
    value: Math.min(maxTotal, Math.max(0, item.value)),
  }));

  const applyQuickBet = (value: number) => {
    if (!p) return;
    const capped = Math.min(maxBetAmount, Math.max(poker.bigBlind, Math.round(value)));
    setBetAmt(String(capped));
    requestAnimationFrame(() => {
      betInputRef.current?.focus();
      betInputRef.current?.select();
    });
  };

  const isBetting = poker.currentBet === 0;
  const quickButtons = isBetting ? quickBetButtons : quickRaiseButtons;

  const sideButtons = [
    {
      label: "125%",
      value: isBetting
        ? Math.max(poker.bigBlind, Math.round(poker.pot * 1.25))
        : Math.min(maxTotal, Math.round(poker.pot * 1.25)),
    },
    {
      label: "All-in",
      value: isBetting ? maxBetAmount : maxTotal,
    },
  ];

  const applyAmount = (value: number) => {
    if (isBetting) {
      applyQuickBet(value);
    } else {
      setRaiseTo(String(Math.min(maxTotal, Math.max(0, Math.round(value)))));
    }
  };

  const posLabel =
    p?.position === "D" &&
    poker.players.filter((pl) => pl.status !== "out").length === 2
      ? "BTN/SB"
      : p?.position;

  return (
    <section className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pb-3 pt-3 shadow-[0_-4px_20px_oklch(0_0_0/0.06)] backdrop-blur-xl">
      <div className="mx-auto max-w-lg space-y-3">
        {/* Current player info bar */}
        <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5">
          <div className="min-w-0">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                番
              </span>
              <span className="ml-2 text-sm font-bold text-emerald-900">
                {p?.name ?? "—"}
              </span>
              {posLabel && (
                <span className="ml-1.5 text-[10px] font-semibold text-emerald-600">
                  ({posLabel})
                </span>
              )}
            </div>
            <p className="text-[11px] tabular-nums text-emerald-700">
              スタック {p?.stack ?? 0} · Pot {poker.pot}
              {toCall > 0 ? ` · toCall ${toCall}` : ""}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!canUndo}
            onClick={onUndo}
            className="h-8 shrink-0 rounded-lg border-border bg-background px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted disabled:opacity-40"
          >
            ひとつ戻る
          </Button>
        </div>

        {/* Main action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            className="h-12 rounded-xl border border-red-300 bg-red-50 text-sm font-semibold text-red-600 hover:bg-red-100"
            onClick={() => run({ type: "fold" })}
          >
            Fold
          </Button>
          <Button
            type="button"
            className={`h-12 rounded-xl text-sm font-semibold ${
              canCheck
                ? "border border-border bg-muted text-foreground hover:bg-muted/80"
                : "border border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100"
            }`}
            disabled={!(canCheck || canCall)}
            onClick={() => run(canCheck ? { type: "check" } : { type: "call" })}
          >
            {canCheck ? "Check" : callLabel}
          </Button>
          <Button
            type="button"
            className="h-12 rounded-xl border border-amber-400 bg-amber-50 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-40"
            disabled={isBetting ? !canBet : !canRaise}
            onClick={() =>
              isBetting
                ? run({ type: "bet", amount: Math.max(1, Number(betAmt) || poker.bigBlind) })
                : run({ type: "raise", toAmount: raiseAmount })
            }
          >
            {isBetting ? "Bet" : "Raise"}
          </Button>
        </div>

        {/* Amount input + quick buttons */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="amount-input" className="text-[10px] text-muted-foreground">
              {isBetting ? "ベット額" : `レイズ合計（最低 ${minTotal}）`}
            </Label>
          </div>

          {/* Quick buttons */}
          <div className="grid grid-cols-6 gap-1">
            {quickButtons.map((item) => (
              <Button
                key={item.label}
                type="button"
                className="h-7 rounded-lg border border-border bg-muted/50 px-1 text-[10px] font-medium tabular-nums text-muted-foreground hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                onClick={() => applyAmount(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {/* Side quick fills + amount input */}
          <div className="flex items-center gap-1.5">
            <div className="flex min-w-0 flex-1 gap-1.5">
              {sideButtons.map((item) => (
                <Button
                  key={item.label}
                  type="button"
                  className="h-10 flex-1 rounded-lg border border-border bg-muted/50 px-1 text-xs font-medium tabular-nums text-muted-foreground hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                  onClick={() => applyAmount(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <Input
              ref={isBetting ? betInputRef : undefined}
              id="amount-input"
              inputMode="numeric"
              value={isBetting ? betAmt : raiseTo}
              onChange={(e) =>
                isBetting ? setBetAmt(e.target.value) : setRaiseTo(e.target.value)
              }
              className="h-10 w-1/3 shrink-0 text-center font-mono text-base font-semibold tabular-nums"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </section>
  );
}
