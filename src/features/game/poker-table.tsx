"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ClockSettings } from "@/features/clock/clock-settings";
import { BettingControls } from "@/features/betting/betting-controls";
import { PlayerSetup } from "@/features/players/player-setup";
import { GameLog } from "@/features/game/game-log";
import { ShowdownPanel } from "@/features/game/showdown-panel";
import { useHydrateGame } from "@/hooks/use-hydrate-game";
import { findLastPlayerAction } from "@/lib/poker";
import { useGameStore } from "@/stores/game-store";

const STREETS = ["Pre-flop", "Flop", "Turn", "River", "Showdown"] as const;

function Stat({
  label,
  value,
  gold,
  compact,
}: {
  label: string;
  value: string | number;
  gold?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border ${compact ? "px-2.5 py-1.5" : "px-3 py-2.5"} ${
        gold
          ? "border-orange/60 bg-orange/10 shadow-sm"
          : "border-border bg-card shadow-sm"
      }`}
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`font-semibold tabular-nums tracking-tight ${
          gold
            ? compact
              ? "text-base text-orange-ink"
              : "text-lg text-orange-ink"
            : "text-sm text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/** 元のポット + 今のBET分 = 合計 を横幅いっぱいに表示 */
function PotStat({ pot, bets, compact }: { pot: number; bets: number; compact?: boolean }) {
  const base = Math.max(0, pot - bets);
  return (
    <div
      className={`flex min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl border border-orange/60 bg-orange/10 shadow-sm ${
        compact ? "px-3 py-1.5" : "px-4 py-2.5"
      }`}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-muted-foreground">ポット</p>
        <p className="text-sm font-semibold tabular-nums text-foreground/80">
          {base} <span className="text-muted-foreground">+</span>{" "}
          <span className="text-royal">{bets}</span>
        </p>
      </div>
      <p className="text-3xl font-extrabold leading-none tabular-nums text-orange-ink">
        {pot}
      </p>
    </div>
  );
}

/** ゲーム中、画面中央にテーブルのように表示するポット */
function CenterPot({ pot, bets }: { pot: number; bets: number }) {
  const base = Math.max(0, pot - bets);
  return (
    <div
      className="flex w-full max-w-[16rem] flex-col items-center justify-center rounded-full border border-orange/50 bg-gradient-to-b from-orange/15 to-orange/5 px-6 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_10px_24px_-14px_rgba(176,77,0,0.55)]"
      aria-label={`ポット ${pot}`}
    >
      <p className="text-[10px] font-bold tracking-[0.35em] text-orange-ink/70">POT</p>
      <p className="font-mono text-3xl font-extrabold leading-none tabular-nums tracking-tight text-orange-ink">
        {pot.toLocaleString("en-US")}
      </p>
      <p
        className={`text-[11px] tabular-nums text-muted-foreground ${bets > 0 ? "" : "invisible"}`}
      >
        {base.toLocaleString("en-US")} ＋{" "}
        <span className="font-semibold text-royal">{bets.toLocaleString("en-US")}</span>
        <span className="ml-1 text-[10px]">（このラウンド）</span>
      </p>
    </div>
  );
}

/** テーブルリセット（誤操作防止のため2回押しで確定） */
function ResetTableButton() {
  const resetSession = useGameStore((s) => s.resetSession);
  const [confirm, setConfirm] = useState(false);
  return (
    <Button
      type="button"
      variant={confirm ? "destructive" : "outline"}
      onClick={() => {
        if (!confirm) {
          setConfirm(true);
          return;
        }
        resetSession();
        setConfirm(false);
      }}
      onBlur={() => setConfirm(false)}
      className="h-9 rounded-xl px-3 text-[11px] font-medium"
    >
      {confirm ? "⚠ もう一度押して確定" : "テーブルリセット"}
    </Button>
  );
}

/** リザルト画面用: クロック設定ダイアログ */
function ClockSettingsDialog() {
  const enabled = useGameStore((s) => s.clock.enabled);
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={enabled ? "default" : "outline"}
            className="h-9 rounded-xl px-3 text-[11px] font-medium"
          />
        }
      >
        ⏱ クロック
      </DialogTrigger>
      <DialogContent className="max-h-[min(85dvh,640px)] overflow-y-auto sm:max-w-md">
        <DialogHeader className="pr-8">
          <DialogTitle>クロック設定</DialogTitle>
          <DialogDescription className="text-[11px]">
            持ち時間・タイムバンクカード・適用ユーザーを変更できます
          </DialogDescription>
        </DialogHeader>
        <ClockSettings showReset />
      </DialogContent>
    </Dialog>
  );
}

function TableSkeleton() {
  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col gap-3 px-4 py-6">
      <div className="h-16 shrink-0 animate-pulse rounded-2xl bg-muted" />
      <div className="h-28 shrink-0 animate-pulse rounded-2xl bg-muted/60" />
      <div className="min-h-0 flex-1 animate-pulse rounded-2xl bg-muted/40" />
    </div>
  );
}

function StreetProgress({ currentStreetIndex }: { currentStreetIndex: number }) {
  return (
    <ol className="flex items-start" aria-label="ストリート進行">
      {STREETS.map((street, index) => {
        const isCurrent = index === currentStreetIndex;
        const isDone = index < currentStreetIndex;
        return (
          <li
            key={street}
            aria-current={isCurrent ? "step" : undefined}
            className="relative flex min-w-0 flex-1 flex-col items-center gap-1"
          >
            {/* 前のノードとつなぐ線 */}
            {index > 0 && (
              <span
                className={`absolute top-[9px] right-1/2 h-0.5 w-full -translate-y-1/2 transition-colors ${
                  index <= currentStreetIndex ? "bg-royal" : "bg-border"
                }`}
              />
            )}
            <span
              className={`relative z-10 flex size-[18px] items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                isCurrent
                  ? "bg-royal text-white shadow-[0_0_0_4px] shadow-royal/20"
                  : isDone
                    ? "bg-royal text-white"
                    : "border-2 border-border bg-card text-transparent"
              }`}
            >
              {isDone ? "✓" : isCurrent ? index + 1 : "·"}
            </span>
            <span
              className={`max-w-full truncate text-[10px] leading-none tracking-wide ${
                isCurrent
                  ? "font-bold text-royal"
                  : isDone
                    ? "font-medium text-foreground/70"
                    : "font-medium text-muted-foreground/60"
              }`}
            >
              {street}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function PokerTable() {
  const hydrated = useHydrateGame();
  const poker = useGameStore((s) => s.poker);
  const startNewHand = useGameStore((s) => s.startNewHand);
  const undoLastAction = useGameStore((s) => s.undoLastAction);
  const canUndo = useGameStore((s) => s.undoStack.length > 0);
  const [handErr, setHandErr] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [landscape, setLandscape] = useState(false);

  if (!hydrated) {
    return <TableSkeleton />;
  }

  const showdownPending = poker.round === "Showdown" && poker.pot > 0;
  const inHand = poker.handInProgress || showdownPending;
  const onStart = () => {
    const err = startNewHand();
    setHandErr(err);
  };
  const currentStreetIndex = Math.max(0, STREETS.indexOf(poker.round));
  const betsTotal = poker.players.reduce((sum, p) => sum + p.bet, 0);
  const lastAction = findLastPlayerAction(poker.history);

  /* ── In-hand: single viewport, no sticky/fixed chrome ── */
  if (inHand) {
    return (
      <div
        className={`safe-top safe-bottom flex h-dvh flex-col overflow-hidden ${
          flipped ? "rotate-180" : ""
        }`}
      >
        <header className="shrink-0 border-b border-border bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-lg flex-col gap-2 px-3 py-2">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1 pr-1">
                <StreetProgress currentStreetIndex={currentStreetIndex} />
              </div>
              <Button
                type="button"
                variant={flipped ? "default" : "outline"}
                onClick={() => setFlipped((f) => !f)}
                aria-pressed={flipped}
                aria-label="画面の上下を反転"
                className="h-9 shrink-0 rounded-xl px-3 text-[11px] font-medium"
              >
                <span className="inline-block rotate-180">⇅ 反転</span>
              </Button>
            </div>
            <div className="flex items-stretch gap-2">
              <div className="min-w-0 flex-1 rounded-2xl border border-border bg-card px-2.5 py-1.5 shadow-sm">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  直前のアクション
                </p>
                <p className="truncate text-sm font-semibold text-foreground">
                  {lastAction ?? "—"}
                </p>
              </div>
              <div className="flex items-center">
                <GameLog />
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col gap-2 overflow-hidden px-3 py-2">
          {!showdownPending && (
            <div className="flex shrink-0 justify-center">
              <CenterPot pot={poker.pot} bets={betsTotal} />
            </div>
          )}

          <div className="shrink-0">
            <PlayerSetup locked={showdownPending} compact />
          </div>

          {!showdownPending && <div className="min-h-0 flex-1 shrink-0" />}

          {showdownPending && (
            <div className="min-h-0 flex-1 overflow-hidden">
              <ShowdownPanel />
            </div>
          )}

          {showdownPending && (
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                size="lg"
                variant="outline"
                disabled={!canUndo}
                onClick={() => {
                  const err = undoLastAction();
                  setHandErr(err);
                }}
                className="h-11 w-full rounded-full text-sm font-semibold disabled:opacity-40"
              >
                ひとつ戻る
              </Button>
            </div>
          )}

          {handErr && (
            <p className="shrink-0 text-center text-sm text-danger" role="alert">
              {handErr}
            </p>
          )}
        </div>

        <BettingControls />
      </div>
    );
  }

  /* ── Hand result: who won what, next hand button ── */
  const lastLine = poker.history[poker.history.length - 1] ?? "";
  if (lastLine.startsWith("結果:")) {
    const resultText = lastLine.replace(/^結果:\s*/, "");
    return (
      <div className="safe-top safe-bottom flex h-dvh flex-col overflow-hidden">
        <header className="shrink-0 border-b border-border bg-background/80 backdrop-blur">
          <div
            className={`mx-auto flex items-center justify-between gap-2 px-3 py-2 ${
              landscape ? "max-w-4xl" : "max-w-lg"
            }`}
          >
            <ResetTableButton />
            <div className="flex items-center gap-2">
              <ClockSettingsDialog />
              <Button
                type="button"
                variant={landscape ? "default" : "outline"}
                onClick={() => setLandscape((l) => !l)}
                aria-pressed={landscape}
                aria-label="横画面レイアウトに切り替え"
                className="h-9 rounded-xl px-3 text-[11px] font-medium"
              >
                ⟲ 横画面
              </Button>
              <GameLog />
            </div>
          </div>
        </header>

        <div
          className={`mx-auto flex min-h-0 w-full flex-1 gap-4 overflow-y-auto px-3 py-4 ${
            landscape ? "max-w-4xl flex-row items-center" : "max-w-lg flex-col justify-center"
          }`}
        >
          <div
            className={`rounded-3xl border border-orange/50 bg-gradient-to-b from-orange/15 to-orange/5 px-5 py-6 text-center shadow-sm ${
              landscape ? "w-2/5 shrink-0" : ""
            }`}
          >
            <p className="text-[10px] font-bold tracking-[0.35em] text-orange-ink/70">
              HAND RESULT
            </p>
            <p className="mt-2 text-xl font-extrabold leading-snug text-orange-ink">
              {resultText}
            </p>
          </div>
          <div className={landscape ? "min-w-0 flex-1 self-start" : ""}>
            <PlayerSetup locked compact />
          </div>
        </div>

        <div
          className={`mx-auto w-full shrink-0 space-y-2 px-3 pb-3 ${
            landscape ? "max-w-4xl" : "max-w-lg"
          }`}
        >
          {handErr && (
            <p className="text-center text-sm text-danger" role="alert">
              {handErr}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={!canUndo}
              onClick={() => setHandErr(undoLastAction())}
              className="h-14 shrink-0 rounded-full px-5 text-sm font-semibold disabled:opacity-40"
            >
              ひとつ戻る
            </Button>
            <Button
              type="button"
              size="lg"
              variant="cta"
              onClick={onStart}
              className="h-14 min-w-0 flex-1 rounded-full text-lg font-black tracking-[0.2em]"
            >
              次のハンドへ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Setup / between hands: scrollable ── */
  return (
    <div className="relative min-h-dvh">
      <header className="safe-top border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-lg flex-col gap-3 px-4 py-3">
          <div className="text-center">
            <p className="bg-gradient-to-b from-[#3d7bff] to-[#0b1f4d] bg-clip-text text-2xl font-extrabold tracking-[0.2em] text-transparent">
              REAL POKER
            </p>
            <p className="text-[10px] font-bold tracking-[0.4em] text-muted-foreground">
              ENGINE
            </p>
          </div>
          <StreetProgress currentStreetIndex={currentStreetIndex} />
          <div className="flex items-stretch gap-2">
            <div className="flex min-w-0 flex-1 gap-2">
              <PotStat pot={poker.pot} bets={betsTotal} />
              <div className="w-24 shrink-0">
                <Stat label="最小レイズ" value={poker.minRaise} />
              </div>
            </div>
            <div className="flex items-center">
              <GameLog />
            </div>
          </div>
        </div>
      </header>

      <div className="safe-bottom mx-auto max-w-lg space-y-5 px-4 pt-5 pb-10">
        <section className="space-y-3">
          <SectionLabel>テーブル</SectionLabel>
          <PlayerSetup locked={showdownPending} />
        </section>

        <section className="space-y-3">
          <SectionLabel>クロック</SectionLabel>
          <Card className="border-border">
            <CardContent className="pt-4">
              <ClockSettings />
            </CardContent>
          </Card>
        </section>

        <div className="divider-gold" />

        <div className="flex gap-2">
          <Button
            type="button"
            size="lg"
            onClick={onStart}
            disabled={poker.players.length < 2 || poker.handInProgress || showdownPending}
            variant="cta"
            className="h-16 min-w-0 flex-1 rounded-full text-xl font-black tracking-[0.3em] disabled:opacity-40 disabled:shadow-none"
          >
            ハンド開始
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            disabled={!canUndo}
            onClick={() => {
              const err = undoLastAction();
              setHandErr(err);
            }}
            className="h-16 shrink-0 rounded-full px-5 text-sm font-semibold disabled:opacity-40"
          >
            ひとつ戻る
          </Button>
        </div>
        {handErr && (
          <p className="text-center text-sm text-danger" role="alert">
            {handErr}
          </p>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="px-0.5 text-[11px] font-bold tracking-[0.15em] text-royal">
      {children}
    </h2>
  );
}
