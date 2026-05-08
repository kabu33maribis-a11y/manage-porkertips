"use client";

import { useEffect } from "react";
import { useGameStore } from "@/stores/game-store";

export function useHydrateGame(): boolean {
  const hydrate = useGameStore((s) => s.hydrate);
  const hydrated = useGameStore((s) => s.hydrated);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return hydrated;
}
