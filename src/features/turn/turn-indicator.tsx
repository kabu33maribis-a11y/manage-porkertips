"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/stores/game-store";

export function TurnIndicator() {
  const poker = useGameStore((s) => s.poker);
  const { handInProgress, currentPlayerIndex, players } = poker;

  if (!handInProgress || players.length === 0) {
    return (
      <div className="bg-muted/40 rounded-xl px-4 py-3 text-center text-sm">
        ハンド外 — プレイヤーを追加してハンドを開始してください
      </div>
    );
  }

  const current = players[currentPlayerIndex];
  const toCall = current ? Math.max(0, poker.currentBet - current.bet) : 0;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentPlayerIndex}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18 }}
        className="rounded-2xl border border-emerald-500/25 bg-emerald-500/12 px-4 py-3 shadow-lg shadow-emerald-950/30"
      >
        <p className="text-emerald-100/80 text-[11px] font-medium uppercase tracking-widest">
          現在のアクション
        </p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <p className="text-foreground text-xl font-semibold tracking-tight">
            {current?.name ?? "—"}
          </p>
          <div className="text-right">
            <p className="text-muted-foreground text-[11px]">要コール</p>
            <p className="text-sm font-semibold tabular-nums">{toCall}</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
