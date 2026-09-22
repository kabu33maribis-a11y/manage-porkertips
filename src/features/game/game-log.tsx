"use client";

import { useMemo, useState } from "react";
import { ScrollTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  formatAllHandsForCopy,
  formatHandLogForCopy,
  groupHistoryByHand,
} from "@/lib/poker";
import { useGameStore } from "@/stores/game-store";

function lineClassName(line: string) {
  if (
    line.startsWith("結果:") ||
    line.startsWith("フロップ:") ||
    line.startsWith("ターン:") ||
    line.startsWith("リバー:") ||
    line.startsWith("ボード:") ||
    line.startsWith("公開:")
  ) {
    return "font-medium text-foreground";
  }
  if (line.startsWith("---")) {
    return "pt-1 text-[10px] font-semibold tracking-wide text-amber-700";
  }
  return "text-muted-foreground";
}

export function GameLog() {
  const history = useGameStore((s) => s.poker.history);
  const groups = useMemo(() => groupHistoryByHand(history), [history]);
  const newestFirst = useMemo(() => [...groups].reverse(), [groups]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="relative h-full min-h-14 w-11 shrink-0 rounded-xl border-border bg-card shadow-sm"
            aria-label="ゲームログを開く"
          />
        }
      >
        <ScrollTextIcon className="size-5" />
        {groups.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-0.5 text-[9px] font-bold text-white">
            {groups.length > 99 ? "99+" : groups.length}
          </span>
        )}
      </DialogTrigger>

      <DialogContent
        className="flex max-h-[min(85dvh,640px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        showCloseButton
      >
        <DialogHeader className="shrink-0 gap-1 border-b border-border px-4 py-3 pr-12">
          <DialogTitle>ゲームログ</DialogTitle>
          <DialogDescription className="text-[11px]">
            ハンドごとに開閉 · AI判定用にコピー可
          </DialogDescription>
          {groups.length > 0 && (
            <div className="pt-1">
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
            </div>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {newestFirst.length === 0 ? (
            <p className="px-1 text-[11px] text-muted-foreground">
              まだログはありません
            </p>
          ) : (
            <ul className="space-y-1.5">
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
                              className={`break-words text-[11px] leading-relaxed ${lineClassName(line)}`}
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
      </DialogContent>
    </Dialog>
  );
}
