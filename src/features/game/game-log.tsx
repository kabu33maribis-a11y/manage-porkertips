"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  formatAllHandsForCopy,
  formatHandLogForCopy,
  groupHistoryByHand,
} from "@/lib/poker";
import { useGameStore } from "@/stores/game-store";

export function GameLog() {
  const history = useGameStore((s) => s.poker.history);
  const groups = useMemo(() => groupHistoryByHand(history), [history]);
  const newestFirst = useMemo(() => [...groups].reverse(), [groups]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] text-muted-foreground">
          ハンドごとに開閉 · AI判定用にコピー可
        </p>
        {groups.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[10px] text-muted-foreground"
            onClick={() =>
              void copyText("all", formatAllHandsForCopy(groups))
            }
          >
            {copiedId === "all" ? "コピー済" : "全ハンドコピー"}
          </Button>
        )}
      </div>

      {newestFirst.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">まだログはありません</p>
      ) : (
        <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {newestFirst.map((group) => {
            const key = `${group.handNumber}-${group.title}`;
            const label =
              group.handNumber > 0 ? `#${group.handNumber}` : "メモ";
            return (
              <li key={key}>
                <details className="group rounded-lg border border-border/80 bg-background/60 open:bg-muted/30">
                  <summary className="flex cursor-pointer list-none items-start gap-2 px-2.5 py-2 [&::-webkit-details-marker]:hidden">
                    <span className="mt-0.5 text-[10px] text-muted-foreground transition-transform group-open:rotate-90">
                      ▸
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-semibold text-foreground">
                        {label}{" "}
                        <span className="font-normal text-muted-foreground">
                          {group.title.replace(/^#\d+\s*/, "")}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                        {group.summary}
                      </span>
                    </span>
                  </summary>
                  <div className="space-y-2 border-t border-border/60 px-2.5 py-2">
                    <ul className="space-y-1">
                      {group.lines.map((line, i) => (
                        <li
                          key={`${line}-${i}`}
                          className={`break-words text-[11px] leading-relaxed ${
                            line.startsWith("結果:") ||
                            line.startsWith("フロップ:") ||
                            line.startsWith("ターン:") ||
                            line.startsWith("リバー:") ||
                            line.startsWith("ボード:") ||
                            line.startsWith("公開:")
                              ? "font-medium text-foreground"
                              : line.startsWith("---")
                                ? "pt-1 text-[10px] font-semibold tracking-wide text-amber-700"
                                : "text-muted-foreground"
                          }`}
                        >
                          {line}
                        </li>
                      ))}
                    </ul>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 w-full text-[10px]"
                      onClick={() =>
                        void copyText(key, formatHandLogForCopy(group))
                      }
                    >
                      {copiedId === key
                        ? "コピーしました"
                        : "このハンドをコピー（AI用）"}
                    </Button>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
