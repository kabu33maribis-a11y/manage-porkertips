import Dexie, { type Table } from "dexie";
import type { PokerState } from "@/types/poker";

interface GameSnapshotRow {
  id: number;
  json: string;
  updatedAt: number;
}

export class PokerGameDB extends Dexie {
  snapshots!: Table<GameSnapshotRow>;

  constructor() {
    super("poker-game");
    this.version(1).stores({
      snapshots: "id, updatedAt",
    });
  }
}

let dbInstance: PokerGameDB | null = null;

export function getGameDb(): PokerGameDB | null {
  if (typeof indexedDB === "undefined") return null;
  if (!dbInstance) dbInstance = new PokerGameDB();
  return dbInstance;
}

const SNAPSHOT_ID = 1;

export async function saveGameSnapshot(state: PokerState): Promise<void> {
  const db = getGameDb();
  if (!db) return;
  await db.snapshots.put({
    id: SNAPSHOT_ID,
    json: JSON.stringify(state),
    updatedAt: Date.now(),
  });
}

export async function loadGameSnapshot(): Promise<PokerState | null> {
  const db = getGameDb();
  if (!db) return null;
  const row = await db.snapshots.get(SNAPSHOT_ID);
  if (!row) return null;
  try {
    return JSON.parse(row.json) as PokerState;
  } catch {
    return null;
  }
}

export async function clearGameSnapshot(): Promise<void> {
  const db = getGameDb();
  if (!db) return;
  await db.snapshots.delete(SNAPSHOT_ID);
}
