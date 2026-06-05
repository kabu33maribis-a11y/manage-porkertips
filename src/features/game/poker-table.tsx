"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BettingControls } from "@/features/betting/betting-controls";
import { PlayerSetup } from "@/features/players/player-setup";
import { GameLog } from "@/features/game/game-log";
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
  const connectRealtime = useGameStore((s) => s.connectRealtime);
  const disconnectRealtime = useGameStore((s) => s.disconnectRealtime);
  const realtimeConnected = useGameStore((s) => s.realtimeConnected);
  const realtimeRole = useGameStore((s) => s.realtimeRole);
  const realtimeError = useGameStore((s) => s.realtimeError);
  const realtimeRoomCode = useGameStore((s) => s.realtimeRoomCode);
  const [handErr, setHandErr] = useState<string | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [wsUrlInput, setWsUrlInput] = useState("ws://localhost:8787");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.hostname || "localhost";
    setWsUrlInput(`${protocol}://${host}:8787`);
  }, []);

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

          {/* Pot / MinRaise */}
          <div className="grid grid-cols-2 gap-2">
            <Stat label="ポット" value={poker.pot} gold />
            <Stat label="最小レイズ" value={poker.minRaise} />
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

        {/* Realtime */}
        <section className="space-y-3">
          <SectionLabel>リアルタイム共有</SectionLabel>
          <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
              <Input
                value={wsUrlInput}
                onChange={(e) => setWsUrlInput(e.target.value)}
                placeholder="ws://localhost:8787"
                className="h-9 text-sm"
              />
              <Input
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="ROOM001"
                className="h-9 text-sm"
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100"
                onClick={() =>
                  connectRealtime({ url: wsUrlInput, roomCode: roomCodeInput, role: "host" })
                }
              >
                Host
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() =>
                  connectRealtime({ url: wsUrlInput, roomCode: roomCodeInput, role: "guest" })
                }
              >
                Guest
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-muted-foreground"
                onClick={disconnectRealtime}
              >
                切断
              </Button>
              <span className="text-[11px] text-muted-foreground">
                {realtimeConnected
                  ? `✦ 接続中 (${realtimeRole}) · ${realtimeRoomCode}`
                  : "未接続"}
              </span>
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              別端末から接続する場合はホストPCのIPアドレスを指定
            </p>
            {realtimeError && (
              <p className="mt-1 text-xs text-red-500">{realtimeError}</p>
            )}
          </div>
        </section>

        <div className="divider-gold" />

        {/* Hand Start button */}
        <Button
          type="button"
          size="lg"
          onClick={onStart}
          disabled={poker.players.length < 2 || poker.handInProgress || showdownPending}
          className="h-14 w-full rounded-xl text-base font-bold tracking-wide shadow-md disabled:opacity-40"
        >
          {showdownPending
            ? "ショーダウン結果を先に確定"
            : poker.handInProgress
              ? "ハンド進行中…"
              : "ハンド開始"}
        </Button>
        {handErr && (
          <p className="text-center text-sm text-red-500" role="alert">
            {handErr}
          </p>
        )}

        {/* Showdown */}
        <ShowdownPanel />

        {/* Log */}
        <section className="space-y-2">
          <SectionLabel>ゲームログ</SectionLabel>
          <GameLog />
        </section>
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
