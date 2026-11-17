"use client";

import { useId, useRef, useState } from "react";

export type WheelAnchor = { label: string; value: number };

type Props = {
  /** 弧上のアンカー（最低額〜オールイン、昇順）。空なら弧は無効 */
  anchors: WheelAnchor[];
  /** スライド時の額の刻み */
  step: number;
  isBetting: boolean;
  callTitle: string;
  callSub?: string;
  canCall: boolean;
  canRaise: boolean;
  onFold: () => void;
  onCall: () => void;
  onRaise: (value: number) => void;
};

/* ── geometry (viewBox units) ── */
const VB_W = 320;
const VB_H = 250;
const CX = 245;
const CY = 200;
const DISC_R = 100;
const ARC_R = 152;
const CHIP_R = 22;
const THUMB_R = 28;
const TICK_R = 182;
const TICKS = 24;
const START = Math.PI; // 9時
const END = Math.PI * 1.5; // 12時
const DRAG_THRESHOLD = 6;
const GAP = 1.6; // FOLD / CALL の間の隙間

const SANS = "var(--font-sora), var(--font-noto-jp), system-ui, sans-serif";
const MONO = "var(--font-sora), ui-monospace, monospace";

const polar = (r: number, a: number) => ({
  x: CX + r * Math.cos(a),
  y: CY + r * Math.sin(a),
});
const angleAt = (t: number) => START + (END - START) * t;
const fmt = (n: number) => n.toLocaleString("en-US");

/** 弧の一部 (t0..t1) のパス */
const arcPath = (r: number, t0: number, t1: number) => {
  const s0 = polar(r, angleAt(t0));
  const s1 = polar(r, angleAt(t1));
  return `M ${s0.x} ${s0.y} A ${r} ${r} 0 0 1 ${s1.x} ${s1.y}`;
};

/** 円周上の点 → 弧上の位置 t (0..1) */
function tFromPoint(x: number, y: number) {
  let a = Math.atan2(y - CY, x - CX);
  if (a < 0) a += Math.PI * 2;
  if (a < Math.PI / 2) return a < Math.PI / 4 ? 1 : 0; // 右下側は近い端へ
  return Math.min(1, Math.max(0, (a - START) / (END - START)));
}

const anchorT = (i: number, n: number) => (n <= 1 ? 1 : i / (n - 1));

/** t → 額（アンカー間を線形補間して step に丸める） */
function valueAt(t: number, anchors: WheelAnchor[], step: number) {
  const n = anchors.length;
  if (n === 0) return 0;
  const min = anchors[0].value;
  const max = anchors[n - 1].value;
  if (n === 1 || t >= 0.995) return max;
  if (t <= 0) return min;
  const pos = t * (n - 1);
  const i = Math.min(n - 2, Math.floor(pos));
  const f = pos - i;
  const raw = anchors[i].value + (anchors[i + 1].value - anchors[i].value) * f;
  const rounded = Math.round(raw / step) * step;
  return Math.min(max, Math.max(min, rounded));
}

/** 額 → t（つまみ位置用） */
function tFromValue(v: number, anchors: WheelAnchor[]) {
  const n = anchors.length;
  if (n <= 1) return 1;
  for (let i = 0; i < n - 1; i++) {
    const a = anchors[i].value;
    const b = anchors[i + 1].value;
    if (v <= b) {
      const f = b === a ? 0 : (v - a) / (b - a);
      return (i + Math.max(0, Math.min(1, f))) / (n - 1);
    }
  }
  return 1;
}

type Half = "fold" | "call";

export function ActionWheel({
  anchors,
  step,
  isBetting,
  callTitle,
  callSub,
  canCall,
  canRaise,
  onFold,
  onCall,
  onRaise,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const press = useRef<{
    x: number;
    y: number;
    dragging: boolean;
    anchor: number | null;
    onPending: boolean;
  } | null>(null);
  /** スライド中の額 */
  const [dragValue, setDragValue] = useState<number | null>(null);
  /** 指を離した後の確定待ちの額（タップで確定） */
  const [pending, setPending] = useState<number | null>(null);
  const [pressedHalf, setPressedHalf] = useState<Half | null>(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gid = (name: string) => `${uid}-${name}`;
  const url = (name: string) => `url(#${gid(name)})`;

  const raiseEnabled = canRaise && anchors.length > 0;
  const maxValue = anchors.length ? anchors[anchors.length - 1].value : 0;
  const raiseWord = isBetting ? "BET" : "RAISE";

  const toSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y };
  };

  const onArcDown = (e: React.PointerEvent<SVGGElement>) => {
    if (!raiseEnabled) return;
    e.stopPropagation();
    const target = e.target as Element;
    const chip = target.closest("[data-anchor]");
    press.current = {
      x: e.clientX,
      y: e.clientY,
      dragging: false,
      anchor: chip ? Number(chip.getAttribute("data-anchor")) : null,
      onPending: !!target.closest("[data-pending]"),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onArcMove = (e: React.PointerEvent<SVGGElement>) => {
    const p = press.current;
    if (!p) return;
    if (!p.dragging) {
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_THRESHOLD) return;
      p.dragging = true;
      setPending(null);
    }
    const { x, y } = toSvg(e.clientX, e.clientY);
    setDragValue(valueAt(tFromPoint(x, y), anchors, step));
  };

  const onArcUp = () => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    if (p.dragging) {
      setPending(dragValue);
      setDragValue(null);
      return;
    }
    // タップ
    if (p.onPending && pending !== null) {
      const v = pending;
      setPending(null);
      onRaise(v);
    } else if (p.anchor !== null && anchors[p.anchor]) {
      setPending(null);
      onRaise(anchors[p.anchor].value);
    } else {
      // 弧の帯をタップ → その位置の額を確定待ちに
      const { x, y } = toSvg(p.x, p.y);
      setPending(valueAt(tFromPoint(x, y), anchors, step));
    }
  };

  const onArcCancel = () => {
    press.current = null;
    setDragValue(null);
  };

  const thumbValue = dragValue ?? pending;
  const thumbT = thumbValue !== null ? tFromValue(thumbValue, anchors) : 0;
  const thumbPos = thumbValue !== null ? polar(ARC_R, angleAt(thumbT)) : null;
  const thumbIsAllIn = thumbValue !== null && thumbValue >= maxValue;

  /* disc halves: diagonal from upper-left (225°) to lower-right (45°) */
  const pUL = polar(DISC_R, (Math.PI * 5) / 4);
  const pLR = polar(DISC_R, Math.PI / 4);
  const foldPath = `M ${pUL.x} ${pUL.y} A ${DISC_R} ${DISC_R} 0 0 0 ${pLR.x} ${pLR.y} Z`;
  const callPath = `M ${pUL.x} ${pUL.y} A ${DISC_R} ${DISC_R} 0 0 1 ${pLR.x} ${pLR.y} Z`;

  const halfProps = (half: Half, enabled: boolean, action: () => void) => ({
    style: {
      cursor: enabled ? "pointer" : "default",
      transformBox: "view-box",
      transformOrigin: `${CX}px ${CY}px`,
      scale: pressedHalf === half ? "0.975" : "1",
      filter: pressedHalf === half ? "brightness(1.12)" : "none",
      transition: "scale 120ms ease, filter 120ms ease",
    } as React.CSSProperties,
    onPointerDown: (e: React.PointerEvent) => {
      e.stopPropagation();
      if (enabled) setPressedHalf(half);
    },
    onPointerUp: () => setPressedHalf(null),
    onPointerLeave: () => setPressedHalf(null),
    onPointerCancel: () => setPressedHalf(null),
    onClick: () => {
      if (!enabled) return;
      setPending(null);
      action();
    },
  });

  const readoutLabel = thumbIsAllIn ? "ALL-IN" : isBetting ? "BET" : "RAISE TO";

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="mx-auto block w-full max-w-[340px] select-none"
      style={{ touchAction: "none", fontFamily: SANS, WebkitTapHighlightColor: "transparent" }}
      onPointerDown={() => setPending(null)}
      role="group"
      aria-label="アクション選択"
    >
      <defs>
        <linearGradient id={gid("fold")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b4f8c" />
          <stop offset="1" stopColor="#0b1f4d" />
        </linearGradient>
        <linearGradient id={gid("call")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5a90ff" />
          <stop offset="1" stopColor="#1f5cff" />
        </linearGradient>
        <linearGradient id={gid("track")} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#8fb3ff" />
          <stop offset="1" stopColor="#1f5cff" />
        </linearGradient>
        <radialGradient id={gid("ivory")} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e1e9fa" />
        </radialGradient>
        <radialGradient id={gid("gold")} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#ffc088" />
          <stop offset="1" stopColor="#ff8a1f" />
        </radialGradient>
        <radialGradient id={gid("onyx")} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#3b4f8c" />
          <stop offset="1" stopColor="#0b1f4d" />
        </radialGradient>
        <filter id={gid("shadow")} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.2" floodColor="#0b1f4d" floodOpacity="0.28" />
        </filter>
        <filter id={gid("disc-shadow")} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#0b1f4d" floodOpacity="0.3" />
        </filter>
        <filter id={gid("glow")} x="-70%" y="-70%" width="240%" height="240%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#0b1f4d" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* ── 読み出し（左上） ── */}
      {raiseEnabled && (
        <g pointerEvents="none">
          {thumbValue === null ? null : (
            <>
              <text
                x={14}
                y={20}
                fontSize={8.5}
                fontWeight={600}
                fill="#55648a"
                letterSpacing="0.16em"
              >
                {readoutLabel}
              </text>
              <text
                x={13}
                y={44}
                fontSize={24}
                fontWeight={700}
                fill="#0b1f4d"
                fontFamily={MONO}
                letterSpacing="-0.03em"
              >
                {fmt(thumbValue)}
              </text>
              {pending !== null && (
                <text x={14} y={60} fontSize={9.5} fontWeight={600} fill="#b04d00">
                  チップをタップで確定
                </text>
              )}
            </>
          )}
        </g>
      )}

      {/* ── 外周の弧 ── */}
      <g
        onPointerDown={onArcDown}
        onPointerMove={onArcMove}
        onPointerUp={onArcUp}
        onPointerCancel={onArcCancel}
        opacity={raiseEnabled ? 1 : 0.3}
        style={{ cursor: raiseEnabled ? "pointer" : "default", transition: "opacity 200ms" }}
      >
        {/* 当たり判定用の太い帯 */}
        <path
          d={arcPath(ARC_R, 0, 1)}
          fill="none"
          stroke="transparent"
          strokeWidth={CHIP_R * 2 + 16}
          pointerEvents="stroke"
        />

        {/* 目盛り */}
        {Array.from({ length: TICKS + 1 }, (_, i) => {
          const t = i / TICKS;
          const a = angleAt(t);
          const major = i % 6 === 0;
          const p0 = polar(TICK_R - (major ? 7 : 4), a);
          const p1 = polar(TICK_R, a);
          const lit = thumbValue !== null && t <= thumbT + 1e-6;
          return (
            <line
              key={i}
              x1={p0.x}
              y1={p0.y}
              x2={p1.x}
              y2={p1.y}
              stroke={lit ? "#1f5cff" : "#b9c6e6"}
              strokeWidth={major ? 1.6 : 1}
              strokeLinecap="round"
              pointerEvents="none"
            />
          );
        })}

        {/* トラック */}
        <path
          d={arcPath(ARC_R, 0, 1)}
          fill="none"
          stroke="#dbe4f7"
          strokeWidth={4}
          strokeLinecap="round"
        />
        {thumbValue !== null && thumbT > 0 && (
          <path
            d={arcPath(ARC_R, 0, thumbT)}
            fill="none"
            stroke={url("track")}
            strokeWidth={4}
            strokeLinecap="round"
          />
        )}

        {/* チップ */}
        {anchors.map((a, i) => {
          const pos = polar(ARC_R, angleAt(anchorT(i, anchors.length)));
          const isAllIn = i === anchors.length - 1 && anchors.length > 1;
          const isMin = i === 0 && anchors.length > 1;
          const accent = isAllIn || isMin;
          const active = thumbValue === a.value;
          const face = isAllIn ? "onyx" : isMin ? "gold" : "ivory";
          const spot = isAllIn ? "#ffffff" : isMin ? "#fff7e6" : "#1f5cff";
          const labelColor = isAllIn ? "#cfe0ff" : isMin ? "#7a3a00" : "#7a88ad";
          const valueColor = accent ? "#ffffff" : "#1c1917";
          return (
            <g key={`${a.label}-${a.value}`} data-anchor={i} filter={url("shadow")}>
              <circle cx={pos.x} cy={pos.y} r={CHIP_R} fill={url(face)} />
              {/* チップの縁の模様 */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={CHIP_R - 3.5}
                fill="none"
                stroke={spot}
                strokeWidth={3}
                strokeDasharray="3.2 5.6"
                opacity={accent ? 0.55 : 0.4}
              />
              <circle
                cx={pos.x}
                cy={pos.y}
                r={CHIP_R}
                fill="none"
                stroke={active ? "#1f5cff" : accent ? "transparent" : "#c9d4ec"}
                strokeWidth={active ? 2.5 : 1}
              />
              <text
                x={pos.x}
                y={pos.y - 3}
                textAnchor="middle"
                fontSize={7.5}
                fontWeight={700}
                fill={labelColor}
                letterSpacing="0.08em"
              >
                {a.label}
              </text>
              <text
                x={pos.x}
                y={pos.y + 9}
                textAnchor="middle"
                fontSize={10}
                fontWeight={700}
                fill={valueColor}
                fontFamily={MONO}
                letterSpacing="-0.03em"
              >
                {fmt(a.value)}
              </text>
            </g>
          );
        })}

        {/* つまみ（スライド中 / 確定待ち） */}
        {thumbPos && thumbValue !== null && (
          <g data-pending="">
            {pending !== null && (
              <circle
                cx={thumbPos.x}
                cy={thumbPos.y}
                r={THUMB_R}
                fill="none"
                stroke="#1f5cff"
                strokeWidth={2}
                pointerEvents="none"
              >
                <animate
                  attributeName="r"
                  from={THUMB_R}
                  to={THUMB_R + 10}
                  dur="1.2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.7"
                  to="0"
                  dur="1.2s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
            <circle
              cx={thumbPos.x}
              cy={thumbPos.y}
              r={THUMB_R}
              fill={url("gold")}
              stroke="#ffffff"
              strokeWidth={3}
              filter={url("glow")}
            />
            <text
              x={thumbPos.x}
              y={thumbPos.y - 4}
              textAnchor="middle"
              fontSize={7.5}
              fontWeight={800}
              fill="#7c2d12"
              letterSpacing="0.1em"
            >
              {thumbIsAllIn ? "ALL-IN" : raiseWord}
            </text>
            <text
              x={thumbPos.x}
              y={thumbPos.y + 10}
              textAnchor="middle"
              fontSize={11.5}
              fontWeight={800}
              fill="#431407"
              fontFamily={MONO}
              letterSpacing="-0.03em"
            >
              {fmt(thumbValue)}
            </text>
          </g>
        )}
      </g>

      {/* ── FOLD / CALL ディスク ── */}
      <g filter={url("disc-shadow")}>
        <g transform={`translate(${-GAP} ${GAP})`}>
          <path d={foldPath} fill={url("fold")} {...halfProps("fold", true, onFold)} />
        </g>
        <g transform={`translate(${GAP} ${-GAP})`}>
          <path
            d={callPath}
            fill={canCall ? url("call") : "#cfd8ea"}
            {...halfProps("call", canCall, onCall)}
          />
        </g>
      </g>
      {/* 内側のハイライトリング */}
      <circle
        cx={CX}
        cy={CY}
        r={DISC_R - 8}
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.12}
        strokeWidth={1.5}
        pointerEvents="none"
      />
      <g pointerEvents="none">
        <text
          x={CX - 40}
          y={CY + 40}
          textAnchor="middle"
          fontSize={17}
          fontWeight={700}
          fill="#f5f5f4"
          letterSpacing="0.14em"
        >
          FOLD
        </text>
        <text
          x={CX + 32}
          y={callSub ? CY - 42 : CY - 32}
          textAnchor="middle"
          fontSize={17}
          fontWeight={700}
          fill="#ffffff"
          letterSpacing="0.14em"
        >
          {callTitle}
        </text>
        {callSub && (
          <text
            x={CX + 32}
            y={CY - 22}
            textAnchor="middle"
            fontSize={14}
            fontWeight={600}
            fill="#e6f0ff"
            fontFamily={MONO}
            letterSpacing="-0.02em"
          >
            {callSub}
          </text>
        )}
      </g>
    </svg>
  );
}
