"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { inCurrentHand } from "@/lib/poker";
import { useGameStore } from "@/stores/game-store";

const PLAYER_COLORS = [
  "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100",
  "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100",
  "border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100",
  "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100",
] as const;

export function ShowdownPanel() {
  const poker = useGameStore((s) => s.poker);
  const showdownWinner = useGameStore((s) => s.showdownWinner);
  const [error, setError] = useState<string | null>(null);

  const pending = poker.round === "Showdown" && poker.pot > 0;
  if (!pending) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-amber-800">
          ショーダウン — 勝者を選択
        </p>
        <p className="mt-0.5 text-[11px] text-amber-700/70">
          ポット {poker.pot} · 実カードで勝者を確認してタップ
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {poker.players.map((pl, i) => {
          const active = inCurrentHand(pl);
          return (
            <Button
              key={pl.id}
              type="button"
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                active
                  ? PLAYER_COLORS[i % PLAYER_COLORS.length]
                  : "border-border bg-muted/30 text-muted-foreground"
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
      {error && <p className="text-sm text-red-500">{error}</p>}
    </section>
  );
}
