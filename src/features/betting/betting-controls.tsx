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
    { label: "2.5x", value: Math.round(poker.bigBlind * 2.5) },
    { label: "3x", value: poker.bigBlind * 3 },
    { label: "Pot", value: poker.pot },
    { label: "½ Pot", value: Math.round(poker.pot / 2) },
    { label: "All-in", value: p?.stack ?? 0 },
  ].map((item) => ({
    ...item,
    value: Math.max(poker.bigBlind, Math.round(item.value)),
  }));

  const quickRaiseButtons = [
    { label: "2x", value: Math.round(currentBetBase * 2) },
    { label: "2.5x", value: Math.round(currentBetBase * 2.5) },
    { label: "3x", value: Math.round(currentBetBase * 3) },
    { label: "Pot", value: poker.pot },
    { label: "½ Pot", value: Math.round(poker.pot / 2) },
    { label: "All-in", value: maxTotal },
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

  return (
    <section className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[oklch(0.12_0.038_158/0.95)] px-4 pb-3 pt-3 backdrop-blur-xl">
      <div className="mx-auto max-w-lg space-y-3">
        {/* Current player info bar */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-amber-400">
            {p?.name ?? "—"}
          </span>
          <span className="text-[11px] tabular-nums text-white/35">
            スタック {p?.stack ?? 0}　·　Pot {poker.pot}
            {toCall > 0 ? `　·　toCall ${toCall}` : ""}
          </span>
        </div>

        {/* Main action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            className="h-12 rounded-xl border border-red-500/40 bg-red-500/15 text-sm font-semibold text-red-400 hover:bg-red-500/25"
            onClick={() => run({ type: "fold" })}
          >
            Fold
          </Button>
          <Button
            type="button"
            className={`h-12 rounded-xl text-sm font-semibold ${
              canCheck
                ? "border border-white/15 bg-white/[0.06] text-white/80 hover:bg-white/[0.10]"
                : "border border-sky-400/40 bg-sky-400/15 text-sky-300 hover:bg-sky-400/25"
            }`}
            disabled={!(canCheck || canCall)}
            onClick={() => run(canCheck ? { type: "check" } : { type: "call" })}
          >
            {canCheck ? "Check" : callLabel}
          </Button>
          <Button
            type="button"
            className="h-12 rounded-xl border border-amber-500/40 bg-amber-500/15 text-sm font-semibold text-amber-300 hover:bg-amber-500/25 disabled:opacity-40"
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
            <Label htmlFor="amount-input" className="text-[10px] text-white/35">
              {isBetting ? "ベット額" : `レイズ合計（最低 ${minTotal}）`}
            </Label>
          </div>

          {/* Quick buttons */}
          <div className="grid grid-cols-6 gap-1">
            {quickButtons.map((item) => (
              <Button
                key={item.label}
                type="button"
                className="h-7 rounded-lg border border-white/[0.10] bg-white/[0.04] px-1 text-[10px] font-medium tabular-nums text-white/55 hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-300"
                onClick={() => {
                  if (isBetting) {
                    applyQuickBet(item.value);
                  } else {
                    setRaiseTo(String(item.value));
                  }
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {/* Number input */}
          <Input
            ref={isBetting ? betInputRef : undefined}
            id="amount-input"
            inputMode="numeric"
            value={isBetting ? betAmt : raiseTo}
            onChange={(e) =>
              isBetting ? setBetAmt(e.target.value) : setRaiseTo(e.target.value)
            }
            className="h-10 border-white/[0.12] bg-white/[0.05] text-center font-mono text-base font-semibold text-white/85 tabular-nums"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </section>
  );
}
