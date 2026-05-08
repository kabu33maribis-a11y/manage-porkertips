"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { inCurrentHand } from "@/lib/poker";
import { useGameStore } from "@/stores/game-store";

const PLAYER_COLORS = [
  "border-rose-400/50 bg-rose-400/10 text-rose-300 hover:bg-rose-400/20",
  "border-sky-400/50 bg-sky-400/10 text-sky-300 hover:bg-sky-400/20",
  "border-violet-400/50 bg-violet-400/10 text-violet-300 hover:bg-violet-400/20",
  "border-amber-400/50 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20",
  "border-teal-400/50 bg-teal-400/10 text-teal-300 hover:bg-teal-400/20",
  "border-fuchsia-400/50 bg-fuchsia-400/10 text-fuchsia-300 hover:bg-fuchsia-400/20",
] as const;

export function ShowdownPanel() {
  const poker = useGameStore((s) => s.poker);
  const showdownWinner = useGameStore((s) => s.showdownWinner);
  const [error, setError] = useState<string | null>(null);

  const pending = poker.round === "Showdown" && poker.pot > 0;
  if (!pending) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 shadow-lg shadow-amber-950/30">
      <div>
        <p className="text-sm font-semibold text-amber-300">
          ショーダウン — 勝者を選択
        </p>
        <p className="mt-0.5 text-[11px] text-white/40">
          ポット {poker.pot} · 実カードで勝者を確認してタップ
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {poker.players.map((pl, i) => {
          const active = inCurrentHand(pl);
          return (
            <Button
              key={pl.id}
              type="button"
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                active
                  ? PLAYER_COLORS[i % PLAYER_COLORS.length]
                  : "border-white/[0.08] bg-white/[0.03] text-white/25"
              }`}
              disabled={!active}
              onClick={() => {
                const err = showdownWinner(i);
                setError(err);
              }}
            >
              {pl.name}
            </Button>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </section>
  );
}
