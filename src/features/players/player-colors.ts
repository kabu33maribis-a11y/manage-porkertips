/** Per-player color tokens — AIR BLUE palette (royal / lime / orange / navy) */
export const PLAYER_COLORS = [
  {
    accent: "bg-royal",
    active: "border-royal bg-royal/10 shadow-md ring-2 ring-royal/50",
    chip: "border-royal/40 bg-royal/10 text-royal",
    badge: "border-royal/50 bg-royal/10 text-royal",
    btn: "border-royal/50 bg-royal/10 text-royal hover:bg-royal/20",
    /** 手番バッジ（▶ 番） */
    turnBadge: "bg-royal text-white",
    /** 手番バー（ホイール上の情報欄） */
    turnBar: "border-royal bg-royal/15",
    turnText: "text-royal",
  },
  {
    accent: "bg-lime",
    active: "border-lime bg-lime/10 shadow-md ring-2 ring-lime/50",
    chip: "border-lime/40 bg-lime/10 text-lime-ink",
    badge: "border-lime/50 bg-lime/10 text-lime-ink",
    btn: "border-lime/50 bg-lime/10 text-lime-ink hover:bg-lime/20",
    turnBadge: "bg-lime text-navy",
    turnBar: "border-lime bg-lime/20",
    turnText: "text-lime-ink",
  },
  {
    accent: "bg-orange",
    active: "border-orange bg-orange/10 shadow-md ring-2 ring-orange/50",
    chip: "border-orange/40 bg-orange/10 text-orange-ink",
    badge: "border-orange/50 bg-orange/10 text-orange-ink",
    btn: "border-orange/50 bg-orange/10 text-orange-ink hover:bg-orange/20",
    turnBadge: "bg-orange text-navy",
    turnBar: "border-orange bg-orange/15",
    turnText: "text-orange-ink",
  },
  {
    accent: "bg-navy",
    active: "border-navy bg-navy/10 shadow-md ring-2 ring-navy/50",
    chip: "border-navy/40 bg-navy/10 text-navy",
    badge: "border-navy/50 bg-navy/10 text-navy",
    btn: "border-navy/50 bg-navy/10 text-navy hover:bg-navy/20",
    turnBadge: "bg-navy text-white",
    turnBar: "border-navy bg-navy/10",
    turnText: "text-navy",
  },
] as const;

export function playerColor(index: number) {
  return PLAYER_COLORS[((index % PLAYER_COLORS.length) + PLAYER_COLORS.length) % PLAYER_COLORS.length];
}
