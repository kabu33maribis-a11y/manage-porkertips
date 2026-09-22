"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BettingControls } from "@/features/betting/betting-controls";
import { PlayerSetup } from "@/features/players/player-setup";
import { GameLog } from "@/features/game/game-log";
import { BoardCardLogger } from "@/features/game/board-card-logger";
import { ShowdownPanel } from "@/features/game/showdown-panel";
import { TurnIndicator } from "@/features/turn/turn-indicator";
import { useHydrateGame } from "@/hooks/use-hydrate-game";
import { useGameStore } from "@/stores/game-store";

const STREETS = ["Pre-flop", "Flop", "Turn", "River", "Showdown"] as const;

function Stat({
  label,
  value,
  gold,
}: {
  label: string;
  value: string | number;
  gold?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        gold
          ? "border-amber-400 bg-amber-50 shadow-sm"
          : "border-border bg-card"
      }`}
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`font-semibold tabular-nums tracking-tight ${
          gold ? "text-lg text-amber-700" : "text-sm text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-8">
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      <div className="h-40 animate-pulse rounded-2xl bg-muted/60" />
      <div className="h-32 animate-pulse rounded-2xl bg-muted/60" />
    </div>
  );
}

export function PokerTable() {
  const hydrated = useHydrateGame();
  const poker = useGameStore((s) => s.poker);
  const startNewHand = useGameStore((s) => s.startNewHand);
  const undoLastAction = useGameStore((s) => s.undoLastAction);
  const canUndo = useGameStore((s) => s.undoStack.length > 0);
  const [handErr, setHandErr] = useState<string | null>(null);

  if (!hydrated) {
    return <TableSkeleton />;
  }

  const showdownPending = poker.round === "Showdown" && poker.pot > 0;
  const bettingOpen = poker.handInProgress && poker.round !== "Showdown";
  const onStart = () => {
    const err = startNewHand();
    setHandErr(err);
  };
  const currentStreetIndex = Math.max(0, STREETS.indexOf(poker.round));

  return (
    <div className="relative min-h-dvh">
      {/* ── HEADER ────────────────────────────────────────── */}
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg flex-col gap-3 px-4 py-3">
          {/* Street progress */}
          <div className="flex items-center gap-1">
            {STREETS.map((street, index) => {
              const isCurrent = index === currentStreetIndex;
              const isDone = index < currentStreetIndex;
              return (
                <div key={street} className="flex min-w-0 flex-1 items-center gap-1">
                  <div
                    className={`flex h-6 min-w-0 flex-1 items-center justify-center rounded px-1.5 text-[9px] font-semibold tracking-wide transition-all ${
                      isCurrent
                        ? "bg-amber-100 text-amber-700 ring-1 ring-amber-400"
                        : isDone
                          ? "bg-muted text-muted-foreground line-through"
                          : "bg-muted/50 text-muted-foreground/60"
                    }`}
                  >
                    {street}
                  </div>
                  {index < STREETS.length - 1 && (
                    <div
                      className={`h-px w-1.5 shrink-0 ${
                        isDone ? "bg-amber-400" : "bg-border"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Pot / MinRaise + log */}
          <div className="flex items-stretch gap-2">
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
              <Stat label="ポット" value={poker.pot} gold />
              <Stat label="最小レイズ" value={poker.minRaise} />
            </div>
            <div className="flex items-center">
              <GameLog />
            </div>
          </div>
        </div>
      </header>

      {/* ── BODY ──────────────────────────────────────────── */}
      <motion.div
        layout
        className={`mx-auto max-w-lg space-y-5 px-4 pt-5 ${bettingOpen ? "pb-56" : "pb-10"} safe-bottom`}
      >
        {/* Turn indicator */}
        {poker.handInProgress && poker.round !== "Showdown" && (
          <TurnIndicator />
        )}

        {/* Players + Setup */}
        <section className="space-y-3">
          <SectionLabel>テーブル</SectionLabel>
          <PlayerSetup locked={showdownPending} />
        </section>

        <div className="divider-gold" />

        {/* Hand Start button */}
        <div className="flex gap-2">
          <Button
            type="button"
            size="lg"
            onClick={onStart}
            disabled={poker.players.length < 2 || poker.handInProgress || showdownPending}
            className="h-14 min-w-0 flex-1 rounded-xl text-base font-bold tracking-wide shadow-md disabled:opacity-40"
          >
            {showdownPending
              ? "ショーダウン結果を先に確定"
              : poker.handInProgress
                ? "ハンド進行中…"
                : "ハンド開始"}
          </Button>
          {!bettingOpen && (
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={!canUndo}
              onClick={() => {
                const err = undoLastAction();
                setHandErr(err);
              }}
              className="h-14 shrink-0 rounded-xl px-4 text-sm font-semibold disabled:opacity-40"
            >
              ひとつ戻る
            </Button>
          )}
        </div>
        {handErr && (
          <p className="text-center text-sm text-red-500" role="alert">
            {handErr}
          </p>
        )}

        {/* Showdown */}
        <ShowdownPanel />

        {/* Board cards for AI log */}
        <BoardCardLogger />
      </motion.div>

      <BettingControls />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
      {children}
    </h2>
  );
}
