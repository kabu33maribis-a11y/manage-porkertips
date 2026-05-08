"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useGameStore } from "@/stores/game-store";

/** Per-player color tokens — visible on dark felt */
const PLAYER_COLORS = [
  {
    accent: "bg-rose-400",
    active: "border-rose-400/50 bg-rose-400/10 shadow-rose-900/40",
    chip: "border-rose-400/40 bg-rose-400/10 text-rose-300",
    badge: "border-rose-400/40 text-rose-400",
    btn: "border-rose-400/40 bg-rose-400/10 text-rose-300 hover:bg-rose-400/20",
  },
  {
    accent: "bg-sky-400",
    active: "border-sky-400/50 bg-sky-400/10 shadow-sky-900/40",
    chip: "border-sky-400/40 bg-sky-400/10 text-sky-300",
    badge: "border-sky-400/40 text-sky-400",
    btn: "border-sky-400/40 bg-sky-400/10 text-sky-300 hover:bg-sky-400/20",
  },
  {
    accent: "bg-violet-400",
    active: "border-violet-400/50 bg-violet-400/10 shadow-violet-900/40",
    chip: "border-violet-400/40 bg-violet-400/10 text-violet-300",
    badge: "border-violet-400/40 text-violet-400",
    btn: "border-violet-400/40 bg-violet-400/10 text-violet-300 hover:bg-violet-400/20",
  },
  {
    accent: "bg-amber-400",
    active: "border-amber-400/50 bg-amber-400/10 shadow-amber-900/40",
    chip: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    badge: "border-amber-400/40 text-amber-400",
    btn: "border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20",
  },
  {
    accent: "bg-teal-400",
    active: "border-teal-400/50 bg-teal-400/10 shadow-teal-900/40",
    chip: "border-teal-400/40 bg-teal-400/10 text-teal-300",
    badge: "border-teal-400/40 text-teal-400",
    btn: "border-teal-400/40 bg-teal-400/10 text-teal-300 hover:bg-teal-400/20",
  },
  {
    accent: "bg-fuchsia-400",
    active: "border-fuchsia-400/50 bg-fuchsia-400/10 shadow-fuchsia-900/40",
    chip: "border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-300",
    badge: "border-fuchsia-400/40 text-fuchsia-400",
    btn: "border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-300 hover:bg-fuchsia-400/20",
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

  return (
    <Card className="border-white/[0.08] bg-white/[0.03] shadow-xl shadow-black/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-white/70">
          プレイヤー &amp; ブラインド
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!setupFixed && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="sb" className="text-xs text-white/50">SB</Label>
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
                  className="border-white/[0.10] bg-white/[0.04] text-white/85"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bb" className="text-xs text-white/50">BB</Label>
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
                  className="border-white/[0.10] bg-white/[0.04] text-white/85"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="buyin" className="text-xs text-white/50">初期スタック</Label>
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
                className="border-white/[0.10] bg-white/[0.04] text-white/85"
              />
            </div>

            <Separator className="bg-white/[0.06]" />

            <div className="flex gap-2">
              <Input
                placeholder="名前"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { addPlayer(name); setName(""); }
                }}
                className="border-white/[0.10] bg-white/[0.04] text-white/85 placeholder:text-white/25"
              />
              <Button
                type="button"
                className="min-w-16"
                onClick={() => { addPlayer(name); setName(""); }}
              >
                追加
              </Button>
            </div>
          </>
        )}

        {/* Player cards */}
        <ul className="flex gap-2 overflow-x-auto pb-1.5">
          {poker.players.map((p, index) => {
            const isCurrent =
              poker.handInProgress && index === poker.currentPlayerIndex;
            const c = PLAYER_COLORS[index % PLAYER_COLORS.length];

            return (
              <li
                key={p.id}
                className={`relative min-w-[130px] shrink-0 overflow-hidden rounded-xl border px-3 py-2.5 transition-all duration-200 ${
                  isCurrent
                    ? `${c.active} shadow-md ring-1 ring-inset ring-white/10`
                    : "border-white/[0.08] bg-white/[0.03]"
                }`}
              >
                {/* top accent stripe */}
                <div className={`absolute inset-x-0 top-0 h-0.5 ${c.accent} ${isCurrent ? "opacity-100" : "opacity-40"}`} />

                <div className="mt-1 space-y-2">
                  <p className={`truncate text-sm font-semibold ${isCurrent ? "text-white" : "text-white/70"}`}>
                    {p.name}
                  </p>

                  {p.position && (
                    <span
                      className={`inline-flex h-5 items-center rounded border px-2 text-[9px] font-bold uppercase tracking-wide ${c.badge}`}
                    >
                      {p.position}
                    </span>
                  )}

                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`rounded-lg border px-2 py-0.5 font-mono text-base font-bold tabular-nums ${c.chip}`}
                    >
                      {p.stack}
                    </span>
                    <span className="text-[9px] text-white/30">chips</span>
                  </div>

                  {poker.handInProgress && (
                    <div className="text-[10px] tabular-nums text-white/35">
                      投入:{" "}
                      <span className={`font-semibold ${p.bet > 0 ? "text-white/70" : ""}`}>
                        {p.bet}
                      </span>
                    </div>
                  )}

                  {!setupFixed && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-full px-1 text-[10px] text-white/30 hover:text-white/60"
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
          className={`w-full ${
            confirmReset
              ? ""
              : "border-white/[0.10] bg-white/[0.03] text-white/40 hover:bg-white/[0.07] hover:text-white/70"
          }`}
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
