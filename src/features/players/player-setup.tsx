"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useGameStore } from "@/stores/game-store";

const MAX_PLAYERS = 4;

/** Per-player color tokens — visible on light background */
const PLAYER_COLORS = [
  {
    accent: "bg-rose-500",
    active: "border-rose-500 bg-rose-50 shadow-md ring-2 ring-rose-400/60",
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    badge: "border-rose-300 bg-rose-50 text-rose-600",
    btn: "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100",
  },
  {
    accent: "bg-sky-500",
    active: "border-sky-500 bg-sky-50 shadow-md ring-2 ring-sky-400/60",
    chip: "border-sky-200 bg-sky-50 text-sky-700",
    badge: "border-sky-300 bg-sky-50 text-sky-600",
    btn: "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100",
  },
  {
    accent: "bg-violet-500",
    active: "border-violet-500 bg-violet-50 shadow-md ring-2 ring-violet-400/60",
    chip: "border-violet-200 bg-violet-50 text-violet-700",
    badge: "border-violet-300 bg-violet-50 text-violet-600",
    btn: "border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100",
  },
  {
    accent: "bg-amber-500",
    active: "border-amber-500 bg-amber-50 shadow-md ring-2 ring-amber-400/60",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    badge: "border-amber-300 bg-amber-50 text-amber-600",
    btn: "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100",
  },
] as const;

export function PlayerSetup({ locked = false }: { locked?: boolean }) {
  const [name, setName] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const poker = useGameStore((s) => s.poker);
  const initialStack = useGameStore((s) => s.initialStack);
  const hasStartedOnce = poker.history.some((line) => line.includes("ハンド開始"));
  const handInProgress = poker.handInProgress || locked;
  const setupFixed = hasStartedOnce || handInProgress;
  const addPlayer = useGameStore((s) => s.addPlayer);
  const removePlayer = useGameStore((s) => s.removePlayer);
  const setBlinds = useGameStore((s) => s.setBlinds);
  const setInitialStack = useGameStore((s) => s.setInitialStack);
  const resetSession = useGameStore((s) => s.resetSession);

  const [sbStr, setSbStr] = useState(String(poker.smallBlind));
  const [bbStr, setBbStr] = useState(String(poker.bigBlind));
  const [stackStr, setStackStr] = useState(String(initialStack));

  const atMaxPlayers = poker.players.length >= MAX_PLAYERS;

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">
          プレイヤー &amp; ブラインド
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!setupFixed && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="sb" className="text-xs text-muted-foreground">SB</Label>
                <Input
                  id="sb"
                  inputMode="numeric"
                  value={sbStr}
                  onChange={(e) => setSbStr(e.target.value)}
                  onBlur={() => {
                    const v = Number(sbStr);
                    if (!Number.isFinite(v) || v < 1) return;
                    setBlinds(v, Math.max(v * 2, poker.bigBlind));
                    setSbStr(String(v));
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bb" className="text-xs text-muted-foreground">BB</Label>
                <Input
                  id="bb"
                  inputMode="numeric"
                  value={bbStr}
                  onChange={(e) => setBbStr(e.target.value)}
                  onBlur={() => {
                    const v = Number(bbStr);
                    if (!Number.isFinite(v) || v < 1) return;
                    setBlinds(poker.smallBlind, v);
                    setBbStr(String(v));
                  }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="buyin" className="text-xs text-muted-foreground">初期スタック</Label>
              <Input
                id="buyin"
                inputMode="numeric"
                value={stackStr}
                onChange={(e) => setStackStr(e.target.value)}
                onBlur={() => {
                  const v = Number(stackStr);
                  if (!Number.isFinite(v) || v < 1) return;
                  setInitialStack(v);
                  setStackStr(String(Math.floor(v)));
                }}
              />
            </div>

            <Separator />

            <div className="flex gap-2">
              <Input
                placeholder="名前"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !atMaxPlayers) { addPlayer(name); setName(""); }
                }}
                disabled={atMaxPlayers}
              />
              <Button
                type="button"
                className="min-w-16"
                disabled={atMaxPlayers}
                onClick={() => { addPlayer(name); setName(""); }}
              >
                追加
              </Button>
            </div>
            {atMaxPlayers && (
              <p className="text-xs text-muted-foreground">最大 {MAX_PLAYERS} 人まで</p>
            )}
          </>
        )}

        {/* Player cards — always one horizontal row */}
        <ul className="flex gap-1.5 sm:gap-2">
          {poker.players.map((p, index) => {
            const isCurrent =
              poker.handInProgress && index === poker.currentPlayerIndex;
            const isFolded = poker.handInProgress && p.status === "folded";
            const isOut = p.status === "out";
            const isAllIn = poker.handInProgress && p.status === "all-in";
            const c = PLAYER_COLORS[index % PLAYER_COLORS.length];

            return (
              <li
                key={p.id}
                className={`relative min-w-0 flex-1 overflow-hidden rounded-xl border px-1.5 py-2 sm:px-3 sm:py-2.5 transition-all duration-200 ${
                  isFolded || isOut
                    ? "border-border/60 bg-muted/40 opacity-45 grayscale"
                    : isCurrent
                      ? `${c.active} animate-pulse`
                      : isAllIn
                        ? "border-amber-400/70 bg-amber-50/80"
                        : "border-border bg-muted/30"
                }`}
              >
                {isCurrent && !isFolded && (
                  <div className="absolute -top-px inset-x-0 flex justify-center">
                    <span className="rounded-b-md bg-emerald-500 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-white sm:px-2 sm:text-[9px]">
                      ▶ 番
                    </span>
                  </div>
                )}

                {(isFolded || isOut) && (
                  <div className="absolute -top-px inset-x-0 flex justify-center">
                    <span className="rounded-b-md bg-zinc-500 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-white sm:px-2 sm:text-[9px]">
                      {isOut ? "OUT" : "FOLD"}
                    </span>
                  </div>
                )}

                {isAllIn && !isFolded && !isOut && (
                  <div className="absolute -top-px inset-x-0 flex justify-center">
                    <span className="rounded-b-md bg-amber-500 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-white sm:px-2 sm:text-[9px]">
                      ALL-IN
                    </span>
                  </div>
                )}

                <div
                  className={`space-y-1.5 sm:space-y-2 ${
                    isCurrent || isFolded || isOut || isAllIn ? "mt-3" : "mt-1"
                  }`}
                >
                  <p
                    className={`truncate text-xs font-semibold sm:text-sm ${
                      isFolded || isOut
                        ? "text-muted-foreground line-through"
                        : isCurrent
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {p.name}
                  </p>

                  {p.position && (
                    <span
                      className={`inline-flex h-5 max-w-full items-center truncate rounded border px-1.5 text-[8px] font-bold uppercase tracking-wide sm:px-2 sm:text-[9px] ${
                        isFolded || isOut
                          ? "border-border bg-muted text-muted-foreground"
                          : c.badge
                      }`}
                    >
                      {p.position === "D" && poker.players.filter((pl) => pl.status !== "out").length === 2
                        ? "BTN/SB"
                        : p.position}
                    </span>
                  )}

                  <div className="flex min-w-0 flex-wrap items-baseline gap-0.5 sm:gap-1.5">
                    <span
                      className={`rounded-lg border px-1.5 py-0.5 font-mono text-sm font-bold tabular-nums sm:px-2 sm:text-base ${
                        isFolded || isOut
                          ? "border-border bg-muted text-muted-foreground"
                          : c.chip
                      }`}
                    >
                      {p.stack}
                    </span>
                    <span className="text-[8px] text-muted-foreground sm:text-[9px]">chips</span>
                  </div>

                  {poker.handInProgress && (
                    <div className="truncate text-[9px] tabular-nums text-muted-foreground sm:text-[10px]">
                      投入:{" "}
                      <span
                        className={`font-semibold ${
                          p.bet > 0 && !isFolded ? "text-foreground" : ""
                        }`}
                      >
                        {p.bet}
                      </span>
                    </div>
                  )}

                  {!setupFixed && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-full px-0 text-[10px] text-muted-foreground hover:text-foreground sm:px-1"
                      onClick={() => removePlayer(p.id)}
                    >
                      削除
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <Button
          type="button"
          variant={confirmReset ? "destructive" : "outline"}
          className="w-full"
          onClick={() => {
            if (!confirmReset) { setConfirmReset(true); return; }
            resetSession();
            setConfirmReset(false);
          }}
          onBlur={() => setConfirmReset(false)}
        >
          {confirmReset ? "⚠ もう一度押してリセット確定" : "テーブルをリセット"}
        </Button>
      </CardContent>
    </Card>
  );
}
