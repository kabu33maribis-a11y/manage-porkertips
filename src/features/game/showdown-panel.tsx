"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inCurrentHand } from "@/lib/poker";
import { useGameStore } from "@/stores/game-store";

const PLAYER_COLORS = [
  "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100",
  "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100",
  "border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100",
  "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100",
] as const;

const SELECTED_RING =
  "ring-2 ring-amber-500 ring-offset-1 ring-offset-amber-50";

export function ShowdownPanel() {
  const poker = useGameStore((s) => s.poker);
  const showdownWinner = useGameStore((s) => s.showdownWinner);
  const showdownChop = useGameStore((s) => s.showdownChop);
  const [selected, setSelected] = useState<number[]>([]);
  const [holeNotes, setHoleNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const pending = poker.round === "Showdown" && poker.pot > 0;
  if (!pending) return null;

  const contenders = poker.players
    .map((pl, i) => ({ pl, i }))
    .filter(({ pl }) => inCurrentHand(pl));

  const buildShowdownNote = () => {
    const parts = contenders
      .map(({ pl }) => {
        const cards = (holeNotes[pl.id] ?? "").trim();
        return cards ? `${pl.name}: ${cards}` : null;
      })
      .filter(Boolean);
    return parts.join(" / ");
  };

  const toggle = (index: number) => {
    setError(null);
    setSelected((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index],
    );
  };

  const confirmWinner = () => {
    if (selected.length !== 1) return;
    const err = showdownWinner(selected[0], buildShowdownNote() || undefined);
    if (err) {
      setError(err);
      return;
    }
    setSelected([]);
    setHoleNotes({});
    setError(null);
  };

  const confirmChop = () => {
    if (selected.length < 2) return;
    const err = showdownChop(selected, buildShowdownNote() || undefined);
    if (err) {
      setError(err);
      return;
    }
    setSelected([]);
    setHoleNotes({});
    setError(null);
  };

  return (
    <section className="flex h-full min-h-0 flex-col gap-2 overflow-hidden rounded-2xl border border-amber-300 bg-amber-50 p-3 shadow-sm">
      <div className="shrink-0">
        <p className="text-sm font-semibold text-amber-800">
          ショーダウン — 勝者を選択
        </p>
        <p className="mt-0.5 text-[11px] text-amber-700/70">
          ポット {poker.pot}
          {poker.board.length > 0 ? ` · ボード ${poker.board.join(" ")}` : ""}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-xl border border-amber-200 bg-white/70 p-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/80">
          公開ハンド（任意）
        </p>
        {contenders.map(({ pl }) => (
          <div key={pl.id} className="flex items-center gap-2">
            <span className="w-16 shrink-0 truncate text-[11px] font-medium text-foreground">
              {pl.name}
            </span>
            <Input
              value={holeNotes[pl.id] ?? ""}
              onChange={(e) =>
                setHoleNotes((prev) => ({ ...prev, [pl.id]: e.target.value }))
              }
              placeholder="例: Ah Kd"
              className="h-7 text-sm"
            />
          </div>
        ))}
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-1.5">
        {poker.players.map((pl, i) => {
          const active = inCurrentHand(pl);
          const isSelected = selected.includes(i);
          return (
            <Button
              key={pl.id}
              type="button"
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition-all ${
                active
                  ? `${PLAYER_COLORS[i % PLAYER_COLORS.length]}${isSelected ? ` ${SELECTED_RING}` : ""}`
                  : "border-border bg-muted/30 text-muted-foreground"
              }`}
              disabled={!active}
              onClick={() => toggle(i)}
            >
              {pl.name}
            </Button>
          );
        })}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          className="h-10 flex-1 rounded-xl bg-amber-600 text-white hover:bg-amber-700"
          disabled={selected.length !== 1}
          onClick={confirmWinner}
        >
          勝者確定
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 flex-1 rounded-xl border-amber-400 text-amber-800 hover:bg-amber-100"
          disabled={selected.length < 2}
          onClick={confirmChop}
        >
          チョップ
        </Button>
      </div>
      {error && <p className="shrink-0 text-sm text-red-500">{error}</p>}
    </section>
  );
}
