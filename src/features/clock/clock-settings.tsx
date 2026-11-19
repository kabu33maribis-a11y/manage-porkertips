"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CLOCK_TIMEOUT_LABELS } from "@/lib/poker";
import { useGameStore } from "@/stores/game-store";
import type { ClockTimeoutBehavior } from "@/types/poker";

const BEHAVIORS: ClockTimeoutBehavior[] = ["check-fold", "fold", "notify"];

/** 数値入力（フォーカスが外れたら確定） */
function NumberField({
  id,
  label,
  value,
  min,
  suffix,
  onCommit,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  suffix: string;
  onCommit: (v: number) => void;
}) {
  const [str, setStr] = useState(String(value));
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="numeric"
          value={str}
          onChange={(e) => setStr(e.target.value)}
          onBlur={() => {
            const v = Math.floor(Number(str));
            if (!Number.isFinite(v) || v < min) {
              setStr(String(value));
              return;
            }
            onCommit(v);
            setStr(String(v));
          }}
          className="pr-8"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      </div>
    </div>
  );
}

export function ClockSettings({ showReset = false }: { showReset?: boolean }) {
  const clock = useGameStore((s) => s.clock);
  const players = useGameStore((s) => s.poker.players);
  const setClockConfig = useGameStore((s) => s.setClockConfig);
  const resetTimeBankCards = useGameStore((s) => s.resetTimeBankCards);
  const [confirmReset, setConfirmReset] = useState(false);

  const toggleExcluded = (id: string) => {
    const excluded = clock.excludedPlayerIds.includes(id)
      ? clock.excludedPlayerIds.filter((x) => x !== id)
      : [...clock.excludedPlayerIds, id];
    setClockConfig({ excludedPlayerIds: excluded });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">クロック</p>
          <p className="text-[11px] text-muted-foreground">手番ごとの持ち時間を計測</p>
        </div>
        <Button
          type="button"
          variant={clock.enabled ? "default" : "outline"}
          aria-pressed={clock.enabled}
          onClick={() => setClockConfig({ enabled: !clock.enabled })}
          className="h-9 min-w-16 rounded-full px-4 text-sm font-bold"
        >
          {clock.enabled ? "ON" : "OFF"}
        </Button>
      </div>

      {clock.enabled && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <NumberField
              id="clock-seconds"
              label="持ち時間"
              value={clock.seconds}
              min={1}
              suffix="秒"
              onCommit={(v) => setClockConfig({ seconds: v })}
            />
            <NumberField
              id="clock-card-seconds"
              label="カード1枚"
              value={clock.cardSeconds}
              min={1}
              suffix="秒"
              onCommit={(v) => setClockConfig({ cardSeconds: v })}
            />
            <NumberField
              id="clock-card-count"
              label="カード枚数"
              value={clock.cardCount}
              min={0}
              suffix="枚"
              onCommit={(v) => setClockConfig({ cardCount: v })}
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">時間切れのとき</p>
            <div className="grid grid-cols-3 gap-1.5">
              {BEHAVIORS.map((b) => (
                <Button
                  key={b}
                  type="button"
                  size="sm"
                  variant={clock.timeoutBehavior === b ? "default" : "outline"}
                  aria-pressed={clock.timeoutBehavior === b}
                  onClick={() => setClockConfig({ timeoutBehavior: b })}
                  className="h-auto min-h-9 rounded-xl px-1.5 py-1.5 text-[11px] leading-tight font-semibold whitespace-normal"
                >
                  {CLOCK_TIMEOUT_LABELS[b]}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              適用するユーザー（タップで切替）
            </p>
            {players.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">プレイヤーを追加してください</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {players.map((p) => {
                  const on = !clock.excludedPlayerIds.includes(p.id);
                  return (
                    <Button
                      key={p.id}
                      type="button"
                      size="sm"
                      variant={on ? "default" : "outline"}
                      aria-pressed={on}
                      onClick={() => toggleExcluded(p.id)}
                      className={`h-8 rounded-full px-3 text-sm font-semibold ${on ? "" : "opacity-60"}`}
                    >
                      {p.name}
                      <span className="ml-1.5 text-[11px] font-medium tabular-nums opacity-80">
                        ⏱×{p.timeBankCards ?? 0}
                      </span>
                    </Button>
                  );
                })}
              </div>
            )}
          </div>

          {showReset && players.length > 0 && (
            <Button
              type="button"
              variant={confirmReset ? "destructive" : "outline"}
              className="w-full"
              onClick={() => {
                if (!confirmReset) {
                  setConfirmReset(true);
                  return;
                }
                resetTimeBankCards();
                setConfirmReset(false);
              }}
              onBlur={() => setConfirmReset(false)}
            >
              {confirmReset
                ? "⚠ もう一度押してリセット確定"
                : `カード枚数をリセット（全員 ${clock.cardCount} 枚）`}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
