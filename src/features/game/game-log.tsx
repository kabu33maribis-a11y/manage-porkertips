"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useGameStore } from "@/stores/game-store";

export function GameLog() {
  const history = useGameStore((s) => s.poker.history);

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
      <ScrollArea className="h-36 pr-2">
        <ul className="space-y-1">
          {history.length === 0 ? (
            <li className="text-[11px] text-white/25">まだログはありません</li>
          ) : (
            history
              .slice()
              .reverse()
              .map((line, i) => (
                <li
                  key={`${line}-${i}`}
                  className={`break-words text-[11px] ${
                    i === 0 ? "text-white/70" : "text-white/35"
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
