export type HandLogGroup = {
  handNumber: number;
  title: string;
  lines: string[];
  summary: string;
};

const HAND_START = "ハンド開始";

/** history をハンド単位に分割（時系列・古い順） */
export function groupHistoryByHand(history: string[]): HandLogGroup[] {
  const groups: HandLogGroup[] = [];
  let current: HandLogGroup | null = null;

  for (const line of history) {
    if (line.includes(HAND_START)) {
      current = {
        handNumber: groups.length + 1,
        title: line,
        lines: [line],
        summary: "",
      };
      groups.push(current);
      continue;
    }

    if (!current) {
      current = {
        handNumber: 0,
        title: "その他",
        lines: [line],
        summary: "",
      };
      groups.push(current);
      continue;
    }

    current.lines.push(line);
  }

  for (const g of groups) {
    g.summary = summarizeHand(g.lines);
  }

  return groups;
}

function summarizeHand(lines: string[]): string {
  const result = [...lines].reverse().find((l) => l.startsWith("結果:"));
  if (result) return result.replace(/^結果:\s*/, "");

  const board = lines
    .filter((l) => /^(フロップ|ターン|リバー):/.test(l))
    .map((l) => l.replace(/^(フロップ|ターン|リバー):\s*/, ""))
    .join(" ");
  if (board) return `ボード ${board}`;

  return `${lines.length} 行`;
}

/** AI 貼り付け用のプレーンテキスト */
export function formatHandLogForCopy(group: HandLogGroup): string {
  return group.lines.join("\n");
}

export function formatAllHandsForCopy(groups: HandLogGroup[]): string {
  return groups
    .map((g) => formatHandLogForCopy(g))
    .join("\n\n---\n\n");
}
