"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGameStore } from "@/stores/game-store";

const STREET_HINT: Record<string, string> = {
  Flop: "例: Ah Kd 7c",
  Turn: "例: Qs",
  River: "例: 2h",
};

/** フロップ〜リバーで出たボードをログへ記録 */
export function BoardCardLogger() {
  const round = useGameStore((s) => s.poker.round);
  const handInProgress = useGameStore((s) => s.poker.handInProgress);
  const board = useGameStore((s) => s.poker.board);
  const logBoardCards = useGameStore((s) => s.logBoardCards);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue("");
    setError(null);
  }, [round]);

  const canLog =
    handInProgress && (round === "Flop" || round === "Turn" || round === "River");
  if (!canLog) return null;

  const label =
    round === "Flop" ? "フロップ" : round === "Turn" ? "ターン" : "リバー";

  const onSubmit = () => {
    const err = logBoardCards(value);
    if (err) {
      setError(err);
      return;
    }
    setValue("");
    setError(null);
  };

  return (
    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3">
      <p className="text-[11px] font-semibold text-amber-800">
        {label}のカードを記録
      </p>
      <p className="mt-0.5 text-[10px] text-amber-700/80">
        AI判定用ログ · {STREET_HINT[round]}
        {board.length > 0 ? ` · 現在 ${board.join(" ")}` : ""}
      </p>
      <div className="mt-2 flex gap-2">
        <Input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
          placeholder={STREET_HINT[round]}
          className="h-9 text-sm"
        />
        <Button
          type="button"
          size="sm"
          className="h-9 shrink-0 bg-amber-600 text-white hover:bg-amber-700"
          onClick={onSubmit}
        >
          記録
        </Button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
