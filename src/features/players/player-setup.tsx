"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useGameStore } from "@/stores/game-store";
import { playerColor } from "./player-colors";

const MAX_PLAYERS = 4;
const FAVORITE_NAMES = ["かぶ", "しま", "たお"] as const;

export function PlayerSetup({
  locked = false,
  compact = false,
}: {
  locked?: boolean;
  /** ゲーム中: カード枠・リセットを省きプレイヤー行だけ表示 */
  compact?: boolean;
}) {
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

  const playerRow = (
    <ul className="flex gap-1.5 sm:gap-2">
      {poker.players.map((p, index) => {
        const isCurrent =
          poker.handInProgress && index === poker.currentPlayerIndex;
        const isFolded = poker.handInProgress && p.status === "folded";
        const isOut = p.status === "out";
        const isAllIn = poker.handInProgress && p.status === "all-in";
        const c = playerColor(index);

        return (
          <li
            key={p.id}
            className={`relative min-w-0 flex-1 overflow-hidden rounded-2xl border transition-all duration-200 ${
              compact ? "px-1.5 py-1.5 sm:px-2.5 sm:py-2" : "px-1.5 py-2 sm:px-3 sm:py-2.5"
            } ${
              isFolded || isOut
                ? "border-border/60 bg-muted/40 opacity-45 grayscale"
                : isCurrent
                  ? `${c.active} animate-turn-glow`
                  : isAllIn
                    ? "animate-allin border-danger bg-danger/10"
                    : "border-border bg-card shadow-sm"
            }`}
          >
            {isCurrent && !isFolded && (
              <div className="absolute -top-px inset-x-0 flex justify-center">
                <span className={`rounded-b-md px-1.5 py-0.5 text-[8px] font-bold tracking-wider sm:px-2 sm:text-[9px] ${c.turnBadge}`}>
                  ▶ 番
                </span>
              </div>
            )}

            {(isFolded || isOut) && (
              <div className="absolute -top-px inset-x-0 flex justify-center">
                <span className="rounded-b-md bg-[#55648a] px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-white sm:px-2 sm:text-[9px]">
                  {isOut ? "OUT" : "FOLD"}
                </span>
              </div>
            )}

            {isAllIn && !isFolded && !isOut && (
              <div className="absolute -top-px inset-x-0 flex justify-center">
                <span className="rounded-b-md bg-danger px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-white sm:px-2 sm:text-[9px]">
                  ALL-IN
                </span>
              </div>
            )}

            <div
              className={`${compact ? "space-y-1" : "space-y-1.5 sm:space-y-2"} mt-3`}
            >
              {/* 名前 + ポジション */}
              <div className="flex min-w-0 items-center justify-between gap-1">
                <p
                  className={`min-w-0 truncate text-sm font-bold ${
                    isFolded || isOut
                      ? "text-muted-foreground line-through"
                      : "text-foreground"
                  }`}
                >
                  {p.name}
                </p>
                {p.position && (
                  <span
                    className={`inline-flex shrink-0 items-center justify-center font-bold uppercase tracking-wide ${
                      p.position === "D" &&
                      poker.players.filter((pl) => pl.status !== "out").length !== 2
                        ? `size-6 rounded-full border-2 text-[11px] font-black shadow-[0_2px_0_rgb(11_31_77/0.35),inset_0_1px_0_#fff] ${
                            isFolded || isOut
                              ? "border-muted-foreground/40 bg-muted text-muted-foreground"
                              : "border-navy bg-white text-navy ring-2 ring-white"
                          }`
                        : `h-4 rounded px-1 text-[9px] ${
                            isFolded || isOut
                              ? "bg-muted text-muted-foreground"
                              : `${c.accent} text-white`
                          }`
                    }`}
                  >
                    {p.position === "D" && poker.players.filter((pl) => pl.status !== "out").length === 2
                      ? "BTN/SB"
                      : p.position}
                  </span>
                )}
              </div>

              {/* 持ち額 */}
              <p
                className={`font-mono text-xl font-extrabold leading-none tabular-nums tracking-tight sm:text-2xl ${
                  isFolded || isOut ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                {p.stack}
              </p>

              {/* 投入額 */}
              {poker.handInProgress && (
                <div className="flex items-center justify-between border-t border-border/60 pt-1 text-[11px] text-muted-foreground">
                  <span>投入</span>
                  <span
                    className={`font-mono text-sm font-bold tabular-nums ${
                      p.bet > 0 && !isFolded ? "text-royal" : ""
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
  );

  if (compact) {
    return <div className="min-w-0">{playerRow}</div>;
  }

  return (
    <Card className="border-border">
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted-foreground">よく使う名前</span>
              {FAVORITE_NAMES.map((fav) => {
                const added = poker.players.some((p) => p.name === fav);
                return (
                  <Button
                    key={fav}
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={atMaxPlayers || added}
                    onClick={() => addPlayer(fav)}
                    className="h-8 rounded-full px-4 text-sm font-semibold disabled:opacity-40"
                  >
                    {fav}
                  </Button>
                );
              })}
            </div>
            {atMaxPlayers && (
              <p className="text-xs text-muted-foreground">最大 {MAX_PLAYERS} 人まで</p>
            )}
          </>
        )}

        {playerRow}

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
