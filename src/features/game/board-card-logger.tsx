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
    <div className="shrink-0 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[11px] font-semibold text-amber-800">
          {label}記録
          <span className="ml-1.5 font-normal text-amber-700/80">
            {board.length > 0 ? board.join(" ") : STREET_HINT[round]}
          </span>
        </p>
      </div>
      <div className="mt-1.5 flex gap-2">
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
          className="h-8 text-sm"
        />
        <Button
          type="button"
          size="sm"
          className="h-8 shrink-0 bg-amber-600 text-white hover:bg-amber-700"
          onClick={onSubmit}
        >
          記録
        </Button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
