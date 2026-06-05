"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/stores/game-store";

export function TurnIndicator() {
  const poker = useGameStore((s) => s.poker);
  const { handInProgress, currentPlayerIndex, players } = poker;

  if (!handInProgress || players.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-center text-sm text-muted-foreground">
        ハンド外 — プレイヤーを追加してハンドを開始してください
      </div>
    );
  }

  const current = players[currentPlayerIndex];
  const toCall = current ? Math.max(0, poker.currentBet - current.bet) : 0;
  const posLabel =
    current?.position === "D" &&
    players.filter((p) => p.status !== "out").length === 2
      ? "BTN/SB"
      : current?.position;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentPlayerIndex}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 px-4 py-3 shadow-md shadow-emerald-200/60"
      >
        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">
          現在のアクション
        </p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <div>
            <p className="text-2xl font-bold tracking-tight text-emerald-900">
              {current?.name ?? "—"}
            </p>
            {posLabel && (
              <p className="mt-0.5 text-xs font-semibold text-emerald-600">
                席: {posLabel}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[11px] font-medium text-emerald-600">要コール</p>
            <p className="text-xl font-bold tabular-nums text-emerald-800">{toCall}</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
