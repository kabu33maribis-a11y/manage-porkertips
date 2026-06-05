"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useGameStore } from "@/stores/game-store";

export function GameLog() {
  const history = useGameStore((s) => s.poker.history);

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <ScrollArea className="h-36 pr-2">
        <ul className="space-y-1">
          {history.length === 0 ? (
            <li className="text-[11px] text-muted-foreground">まだログはありません</li>
          ) : (
            history
              .slice()
              .reverse()
              .map((line, i) => (
                <li
                  key={`${line}-${i}`}
                  className={`break-words text-[11px] ${
                    i === 0 ? "font-medium text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {line}
                </li>
              ))
          )}
        </ul>
      </ScrollArea>
    </div>
  );
}
