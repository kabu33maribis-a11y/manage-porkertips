"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { timeoutAction } from "@/lib/poker";
import { useGameStore } from "@/stores/game-store";

const TICK_MS = 200;
const WARN_SECONDS = 10;

function beep() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => void ctx.close();
  } catch {
    /* ignore */
  }
}

/**
 * 手番のカウントダウン。手番が変わるたびに親が key を変えて再マウントする。
 * 延長時間は「手番開始時のカード枚数 − 現在の枚数」から算出するので、
 * 「ひとつ戻る」でカードが戻ると延長分も自動で消える。
 */
export function TurnClock({ playerIndex }: { playerIndex: number }) {
  const seconds = useGameStore((s) => s.clock.seconds);
  const cardSeconds = useGameStore((s) => s.clock.cardSeconds);
  const cards = useGameStore((s) => s.poker.players[playerIndex]?.timeBankCards ?? 0);
  const spendTimeBankCard = useGameStore((s) => s.spendTimeBankCard);

  const timing = useRef({
    startedAt: 0,
    pausedAt: null as number | null,
    pausedTotal: 0,
    cardsAtStart: cards,
    fired: false,
  });
  const [view, setView] = useState({ remainingMs: seconds * 1000, totalMs: seconds * 1000 });
  const [paused, setPaused] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = timing.current;
    t.startedAt = Date.now();

    const update = () => {
      const { clock, poker } = useGameStore.getState();
      const nowCards = poker.players[playerIndex]?.timeBankCards ?? 0;
      const usedCards = Math.max(0, t.cardsAtStart - nowCards);
      const totalMs = (clock.seconds + usedCards * clock.cardSeconds) * 1000;
      const elapsed = (t.pausedAt ?? Date.now()) - t.startedAt - t.pausedTotal;
      const remainingMs = totalMs - elapsed;
      setView({ remainingMs, totalMs });

      if (remainingMs > 0) {
        if (t.fired) {
          // カード使用で時間が戻った
          t.fired = false;
          setTimedOut(false);
        }
        return;
      }
      if (t.fired) return;
      t.fired = true;
      setTimedOut(true);
      beep();
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        /* ignore */
      }
      const stillMyTurn =
        poker.handInProgress &&
        poker.round !== "Showdown" &&
        poker.currentPlayerIndex === playerIndex;
      if (!stillMyTurn) return;
      const action = timeoutAction(poker, playerIndex, clock.timeoutBehavior);
      if (action) {
        const err = useGameStore.getState().submitAction(playerIndex, action);
        if (err) setError(err);
      }
    };

    const id = setInterval(update, TICK_MS);
    return () => clearInterval(id);
  }, [playerIndex]);

  const togglePause = () => {
    const t = timing.current;
    if (t.pausedAt === null) {
      t.pausedAt = Date.now();
      setPaused(true);
    } else {
      t.pausedTotal += Date.now() - t.pausedAt;
      t.pausedAt = null;
      setPaused(false);
    }
  };

  const remainingSec = Math.ceil(view.remainingMs / 1000);
  const ratio = Math.max(0, Math.min(1, view.remainingMs / Math.max(1, view.totalMs)));
  const warn = remainingSec <= WARN_SECONDS;
  const display =
    view.remainingMs > 0 ? `${remainingSec}` : `+${Math.floor(-view.remainingMs / 1000)}`;

  return (
    <div
      className={`rounded-xl border px-2 py-1 transition-colors ${
        timedOut
          ? "animate-pulse border-danger bg-danger/10"
          : warn
            ? "border-danger/70 bg-danger/5"
            : "border-border bg-card"
      }`}
      role="timer"
      aria-label={`残り ${Math.max(0, remainingSec)} 秒`}
    >
      <div className="flex items-center gap-2">
        <p
          className={`w-14 shrink-0 font-mono text-lg font-extrabold leading-none tabular-nums ${
            timedOut || warn ? "text-danger" : "text-foreground"
          }`}
        >
          {display}
          <span className="ml-0.5 text-[10px] font-bold">s</span>
        </p>
        <div className="min-w-0 flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-[width] duration-200 ease-linear ${
                warn || timedOut ? "bg-danger" : "bg-royal"
              }`}
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={togglePause}
          aria-pressed={paused}
          className="h-7 shrink-0 rounded-lg px-2 text-[11px] font-medium"
        >
          {paused ? "▶ 再開" : "⏸ 停止"}
        </Button>
        <Button
          type="button"
          variant="cta"
          disabled={cards <= 0}
          onClick={() => setError(spendTimeBankCard(playerIndex))}
          className="h-7 shrink-0 rounded-lg px-2 text-[11px] font-bold disabled:opacity-40 disabled:shadow-none"
        >
          ＋{cardSeconds}秒（残{cards}）
        </Button>
      </div>
      {error && <p className="mt-0.5 text-[10px] text-danger">{error}</p>}
    </div>
  );
}
