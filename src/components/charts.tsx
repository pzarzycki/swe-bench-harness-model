// Small SVG chart primitives. Mark specs: bars at most 24px thick, 4px rounded data-end and square at the
// baseline, 2px surface gaps between touching segments, hairline recessive grid, text in text colours only.
import React, { ReactNode, useState } from "react";
import { Tip, useWidth } from "./ui";

/** Right-aligned row label for foreignObject: wraps to two lines, then clips. */
const LABEL: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.2, textAlign: "right", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "flex-end", overflow: "hidden" };

export const lin = (d0: number, d1: number, r0: number, r1: number) => (v: number) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);

/** Rectangle with the right-hand corners rounded (a horizontal bar's data-end). */
export function endRounded(x: number, y: number, w: number, h: number, r = 4) {
  if (w <= 0) return "";
  const rr = Math.min(r, w, h / 2);
  return `M${x},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h - rr}Q${x + w},${y + h} ${x + w - rr},${y + h}H${x}Z`;
}
/** Rectangle with the top corners rounded (a column's data-end). */
export function topRounded(x: number, y: number, w: number, h: number, r = 3) {
  if (h <= 0) return "";
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

function ticks(max: number, count = 5) {
  const step = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].find((s) => max / s <= count) ?? max / count;
  const out: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}

export interface Segment { key: string; value: number; color: string }
export interface StackRow { key: string; label: ReactNode; sub?: ReactNode; segments: Segment[]; total?: string; tip: ReactNode }

/** Horizontal stacked bars, one per row, with the total at the bar end. Values are shares in [0, 1]. */
export function StackedHBar({ rows, max = 1, tip, labelW = 120, fmt = (v: number) => `${Math.round(v * 100)}%`, highlight }: {
  rows: StackRow[]; max?: number; tip: Tip; labelW?: number; fmt?: (v: number) => string; highlight?: string | null;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const lw = width < 480 ? Math.min(labelW, 92) : labelW;
  const rowH = 32, bar = 18, right = 52, top = 4;
  const x = lin(0, max, lw, width - right);
  const h = rows.length * rowH + 24;
  return (
    <div ref={ref} className="chart-wrap">
      <svg width={width} height={h} role="img">
        <g className="axis">
          {ticks(max, width < 480 ? 3 : 5).map((t) => (
            <g key={t}><line x1={x(t)} x2={x(t)} y1={top} y2={h - 20} className="gridline" />
              <text x={x(t)} y={h - 6} textAnchor="middle">{fmt(t)}</text></g>
          ))}
        </g>
        {rows.map((r, i) => {
          const y = top + i * rowH + (rowH - bar) / 2;
          let acc = 0;
          const segs = r.segments.filter((s) => s.value > 0);
          const total = segs.reduce((a, s) => a + s.value, 0);
          return (
            <g key={r.key} className={highlight && highlight !== r.key ? "dim" : undefined}
              onMouseMove={(e) => tip.show(e, r.tip)} onMouseLeave={tip.hide}>
              <rect className="hit" x={0} y={top + i * rowH} width={width} height={rowH} />
              <text className="lbl" x={lw - 10} y={y + bar / 2 + 4} textAnchor="end">{r.label}</text>
              {segs.map((s, j) => {
                const x0 = x(acc), x1 = x(acc + s.value);
                acc += s.value;
                const last = j === segs.length - 1;
                const w = Math.max(0, x1 - x0 - (last ? 0 : 2));
                return last ? <path key={s.key} d={endRounded(x0, y, w, bar)} fill={s.color} />
                  : <rect key={s.key} x={x0} y={y} width={w} height={bar} fill={s.color} />;
              })}
              <text className="val" x={x(total) + 6} y={y + bar / 2 + 4}>{r.total ?? fmt(total)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export interface BarRow { key: string; label: ReactNode; value: number; lo?: number; hi?: number; valueLabel: string; color?: string; tip: ReactNode; muted?: boolean }

/** Single-series horizontal bars with optional interval whiskers. */
export function HBar({ rows, max, tip, labelW = 220, rowH = 26, color = "var(--agents)", fmt = (v: number) => `${Math.round(v * 100)}%` }: {
  rows: BarRow[]; max?: number; tip: Tip; labelW?: number; rowH?: number; color?: string; fmt?: (v: number) => string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const lw = width < 520 ? Math.min(labelW, width * 0.45) : labelW;
  const m = max ?? Math.max(...rows.map((r) => r.hi ?? r.value)) * 1.05;
  const bar = Math.min(16, rowH - 8), right = 56, top = 4;
  const x = lin(0, m, lw, width - right);
  const h = rows.length * rowH + 24;
  return (
    <div ref={ref} className="chart-wrap">
      <svg width={width} height={h} role="img">
        <g className="axis">
          {ticks(m, width < 480 ? 3 : 5).map((t) => (
            <g key={t}><line x1={x(t)} x2={x(t)} y1={top} y2={h - 20} className="gridline" />
              <text x={x(t)} y={h - 6} textAnchor="middle">{fmt(t)}</text></g>
          ))}
        </g>
        {rows.map((r, i) => {
          const y = top + i * rowH + (rowH - bar) / 2;
          const end = x(r.hi ?? r.value);
          return (
            <g key={r.key} onMouseMove={(e) => tip.show(e, r.tip)} onMouseLeave={tip.hide} opacity={r.muted ? 0.45 : 1}>
              <rect className="hit" x={0} y={top + i * rowH} width={width} height={rowH} />
              <foreignObject x={0} y={top + i * rowH} width={lw - 10} height={rowH}>
                <div style={{ ...LABEL, height: rowH }}><span>{r.label}</span></div>
              </foreignObject>
              <path d={endRounded(x(0), y, x(r.value) - x(0), bar)} fill={r.color ?? color} />
              {r.lo !== undefined && r.hi !== undefined && (
                <g stroke="var(--ink)" strokeWidth={1.2} opacity={0.55}>
                  <line x1={x(r.lo)} x2={x(r.hi)} y1={y + bar / 2} y2={y + bar / 2} />
                  <line x1={x(r.lo)} x2={x(r.lo)} y1={y + 3} y2={y + bar - 3} />
                  <line x1={x(r.hi)} x2={x(r.hi)} y1={y + 3} y2={y + bar - 3} />
                </g>
              )}
              <text className="val" x={end + 6} y={y + bar / 2 + 4}>{r.valueLabel}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export interface DumbRow { key: string; label: ReactNode; a: number; b: number; aLo?: number; aHi?: number; bLo?: number; bHi?: number; tip: ReactNode; muted?: boolean }

/** Two values per row joined by a line: e.g. ours vs the reference study, or mentioned vs ruled on. */
export function Dumbbell({ rows, tip, colorA, colorB, max = 1, labelW = 220, rowH = 28, fmt = (v: number) => `${Math.round(v * 100)}%` }: {
  rows: DumbRow[]; tip: Tip; colorA: string; colorB: string; max?: number; labelW?: number; rowH?: number; fmt?: (v: number) => string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const lw = width < 520 ? Math.min(labelW, width * 0.42) : labelW;
  const top = 6, right = 20;
  const x = lin(0, max, lw, width - right);
  const h = rows.length * rowH + 26;
  return (
    <div ref={ref} className="chart-wrap">
      <svg width={width} height={h} role="img">
        <g className="axis">
          {ticks(max, width < 480 ? 3 : 5).map((t) => (
            <g key={t}><line x1={x(t)} x2={x(t)} y1={top} y2={h - 20} className="gridline" />
              <text x={x(t)} y={h - 6} textAnchor="middle">{fmt(t)}</text></g>
          ))}
        </g>
        {rows.map((r, i) => {
          const cy = top + i * rowH + rowH / 2;
          return (
            <g key={r.key} onMouseMove={(e) => tip.show(e, r.tip)} onMouseLeave={tip.hide} opacity={r.muted ? 0.4 : 1}>
              <rect className="hit" x={0} y={top + i * rowH} width={width} height={rowH} />
              <foreignObject x={0} y={top + i * rowH} width={lw - 12} height={rowH}>
                <div style={{ ...LABEL, height: rowH }}><span>{r.label}</span></div>
              </foreignObject>
              <line x1={x(r.a)} x2={x(r.b)} y1={cy} y2={cy} stroke="var(--faint)" strokeWidth={2} />
              {r.aLo !== undefined && <line x1={x(r.aLo)} x2={x(r.aHi!)} y1={cy - 5} y2={cy - 5} stroke={colorA} strokeWidth={2} opacity={0.5} strokeLinecap="round" />}
              {r.bLo !== undefined && <line x1={x(r.bLo)} x2={x(r.bHi!)} y1={cy + 5} y2={cy + 5} stroke={colorB} strokeWidth={2} opacity={0.5} strokeLinecap="round" />}
              <circle cx={x(r.a)} cy={cy} r={5.5} fill={colorA} stroke="var(--surface)" strokeWidth={2} />
              <circle cx={x(r.b)} cy={cy} r={5.5} fill={colorB} stroke="var(--surface)" strokeWidth={2} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export interface DivRow { key: string; label: ReactNode; left: number; right: number; tip: ReactNode; hot?: boolean }

/** Diverging bars from a centre line: prohibitions to the left, requirements to the right (shares of files). */
export function Diverging({ rows, tip, max, labelW = 250, leftLabel, rightLabel }: {
  rows: DivRow[]; tip: Tip; max: number; labelW?: number; leftLabel: string; rightLabel: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const narrow = width < 560;
  const lw = narrow ? 0 : labelW;
  const rowH = narrow ? 44 : 32, bar = 16, top = 22;
  const plotW = width - lw - 8;
  const leftShare = 0.26;
  const cx = lw + plotW * leftShare;
  const sx = (v: number) => (v / max) * plotW * (1 - leftShare - 0.1);
  const h = rows.length * rowH + top + 6;
  return (
    <div ref={ref} className="chart-wrap">
      <svg width={width} height={h} role="img">
        <text className="lbl-m" x={cx - 8} y={12} textAnchor="end">← {leftLabel}</text>
        <text className="lbl-m" x={cx + 8} y={12}>{rightLabel} →</text>
        <line x1={cx} x2={cx} y1={top - 4} y2={h} stroke="var(--faint)" strokeWidth={1} />
        {rows.map((r, i) => {
          const y0 = top + i * rowH;
          const y = y0 + (narrow ? 20 : (rowH - bar) / 2);
          const lwid = sx(r.left), rwid = sx(r.right);
          return (
            <g key={r.key} onMouseMove={(e) => tip.show(e, r.tip)} onMouseLeave={tip.hide}>
              <rect className="hit" x={0} y={y0} width={width} height={rowH} />
              {r.hot && <rect x={0} y={y0 + 1} width={width} height={rowH - 2} rx={6} fill="var(--tint1)" />}
              {narrow
                ? <text className="lbl halo" x={0} y={y0 + 14}>{r.label}</text>
                : <foreignObject x={0} y={y0} width={lw - 12} height={rowH}>
                    <div style={{ ...LABEL, height: rowH, fontWeight: r.hot ? 600 : 400 }}><span>{r.label}</span></div>
                  </foreignObject>}
              {lwid > 0 && <path d={endRounded(cx - 1, y, lwid, bar)} transform={`translate(${2 * cx - 2},0) scale(-1,1)`} fill="var(--pro)" />}
              <path d={endRounded(cx + 1, y, rwid, bar)} fill="var(--req)" />
              {r.left > 0 && <text className="val" x={cx - lwid - 6} y={y + bar / 2 + 4} textAnchor="end">{(r.left * 100).toFixed(1)}%</text>}
              <text className="val" x={cx + rwid + 6} y={y + bar / 2 + 4}>{(r.right * 100).toFixed(1)}%</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export interface ForestRow { key: string; group: string; label: ReactNode; effect: number; lo: number; hi: number; met: boolean; sig: boolean; tip: ReactNode }

/** Forest plot of effects on a log scale with the null at 1. */
export function Forest({ rows, tip, min = 0.8, max = 2, labelW = 300 }: { rows: ForestRow[]; tip: Tip; min?: number; max?: number; labelW?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const narrow = width < 560;
  const lw = narrow ? 0 : labelW;
  const rowH = narrow ? 46 : 30, top = 8, right = 16;
  const lx = (v: number) => Math.log(v);
  const x = (v: number) => lin(lx(min), lx(max), lw + (narrow ? 16 : 8), width - right)(lx(Math.min(max, Math.max(min, v))));
  const h = rows.length * rowH + top + 26;
  const tks = [0.8, 0.9, 1, 1.25, 1.5, 2].filter((t) => t >= min && t <= max);
  return (
    <div ref={ref} className="chart-wrap">
      <svg width={width} height={h} role="img">
        <g className="axis">
          {tks.map((t) => (
            <g key={t}><line x1={x(t)} x2={x(t)} y1={top} y2={h - 20} className="gridline" />
              <text x={x(t)} y={h - 6} textAnchor="middle">{t}×</text></g>
          ))}
        </g>
        <line x1={x(1)} x2={x(1)} y1={top} y2={h - 20} stroke="var(--faint)" strokeWidth={1.5} />
        {rows.map((r, i) => {
          const y0 = top + i * rowH;
          const cy = y0 + (narrow ? 32 : rowH / 2);
          const c = !r.sig ? "var(--faint)" : r.met ? "var(--agents)" : "var(--pro)";
          return (
            <g key={r.key} onMouseMove={(e) => tip.show(e, r.tip)} onMouseLeave={tip.hide}>
              <rect className="hit" x={0} y={y0} width={width} height={rowH} />
              {narrow ? <foreignObject x={0} y={y0} width={width} height={22}><div style={{ fontSize: 12.5, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</div></foreignObject>
                : <foreignObject x={0} y={y0} width={lw - 8} height={rowH}>
                    <div style={{ ...LABEL, height: rowH }}><span>{r.label}</span></div>
                  </foreignObject>}
              <line x1={x(r.lo)} x2={x(r.hi)} y1={cy} y2={cy} stroke={c} strokeWidth={2} strokeLinecap="round" />
              <rect x={x(r.effect) - 5} y={cy - 5} width={10} height={10} rx={2} fill={c} stroke="var(--surface)" strokeWidth={2} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Small helper: a hoverable row list where the parent tracks which row is active. */
export function useActive<T>(initial: T) { return useState<T>(initial); }
