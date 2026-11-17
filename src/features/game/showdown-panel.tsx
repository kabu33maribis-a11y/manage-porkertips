"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inCurrentHand, unresolvedPots } from "@/lib/poker";
import { useGameStore } from "@/stores/game-store";

const PLAYER_COLORS = [
  "border-royal/50 bg-royal/10 text-royal hover:bg-royal/20",
  "border-lime/70 bg-lime/15 text-lime-ink hover:bg-lime/25",
  "border-orange/60 bg-orange/10 text-orange-ink hover:bg-orange/20",
  "border-navy/40 bg-navy/10 text-navy hover:bg-navy/20",
] as const;

const SELECTED_RING =
  "ring-2 ring-orange ring-offset-1 ring-offset-background";

export function ShowdownPanel() {
  const poker = useGameStore((s) => s.poker);
  const showdownResolve = useGameStore((s) => s.showdownResolve);
  const [selected, setSelected] = useState<number[]>([]);
  /** 決定済みの順位（強い順の席グループ。グループ内はチョップ） */
  const [ranking, setRanking] = useState<number[][]>([]);
  const [holeNotes, setHoleNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const pending = poker.round === "Showdown" && poker.pot > 0;
  if (!pending) return null;

  const contenders = poker.players
    .map((pl, i) => ({ pl, i }))
    .filter(({ pl }) => inCurrentHand(pl));

  const toIds = (r: number[][]) => r.map((tier) => tier.map((i) => poker.players[i].id));
  const nameOf = (id: string) => poker.players.find((p) => p.id === id)?.name ?? id;

  /** 今決める必要のあるサイドポット（最初の勝者決定後のみ） */
  const nextPot = ranking.length > 0 ? unresolvedPots(poker.players, toIds(ranking))[0] : undefined;
  const selectable = new Set(
    nextPot
      ? nextPot.contenderIds
      : contenders.map(({ pl }) => pl.id),
  );

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

  const resetAll = () => {
    setSelected([]);
    setRanking([]);
    setError(null);
  };

  /** 選択中のプレイヤーを次の順位として確定。全ポットの行き先が決まれば分配する */
  const confirmTier = () => {
    if (selected.length === 0) return;
    const next = [...ranking, selected];
    const remaining = unresolvedPots(poker.players, toIds(next));
    if (remaining.length > 0) {
      setRanking(next);
      setSelected([]);
      setError(null);
      return;
    }
    const err = showdownResolve(next, buildShowdownNote() || undefined);
    if (err) {
      setError(err);
      return;
    }
    setSelected([]);
    setRanking([]);
    setHoleNotes({});
    setError(null);
  };

  const decided = ranking.map((tier) =>
    tier.map((i) => poker.players[i].name).join(" と "),
  );

  return (
    <section className="flex h-full min-h-0 flex-col gap-2 overflow-hidden panel-glass rounded-2xl border-orange/50 p-3 shadow-[0_0_24px_rgb(255_138_31/0.15)]">
      <div className="shrink-0">
        <p className="text-sm font-bold text-orange-ink">
          {nextPot
            ? `サイドポット ${nextPot.amount.toLocaleString("en-US")} の勝者を選択`
            : "ショーダウン — 勝者を選択"}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {nextPot ? (
            <>対象: {nextPot.contenderIds.map(nameOf).join(" / ")}</>
          ) : (
            <>
              ポット {poker.pot}
              {poker.board.length > 0 ? ` · ボード ${poker.board.join(" ")}` : ""}
            </>
          )}
        </p>
        {decided.length > 0 && (
          <div className="mt-1 flex items-center justify-between gap-2 rounded-lg bg-background/50 px-2 py-1 text-[11px] text-foreground">
            <span className="min-w-0 truncate">
              {decided.map((d, k) => `${k + 1}位: ${d}`).join(" · ")}
            </span>
            <button
              type="button"
              onClick={resetAll}
              className="shrink-0 font-semibold text-orange-ink underline-offset-2 hover:underline"
            >
              やり直す
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-xl border border-border bg-background/50 p-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-ink/80">
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
          const active = inCurrentHand(pl) && selectable.has(pl.id);
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
          variant="orange"
          className="h-11 flex-1 rounded-full font-black"
          disabled={selected.length !== 1}
          onClick={confirmTier}
        >
          勝者確定
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 rounded-full border-orange/60 text-orange-ink hover:bg-orange/15"
          disabled={selected.length < 2}
          onClick={confirmTier}
        >
          チョップ
        </Button>
      </div>
      {error && <p className="shrink-0 text-sm text-danger">{error}</p>}
    </section>
  );
}
