import { ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/** Width of a container, kept current with a ResizeObserver, for responsive SVG charts. */
export function useWidth<T extends HTMLElement>(initial = 680): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(initial);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    setW(el.clientWidth || initial);
    const ro = new ResizeObserver(() => { if (el.clientWidth) setW(el.clientWidth); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export interface Tip { show: (e: React.MouseEvent | React.FocusEvent, content: ReactNode) => void; hide: () => void; node: ReactNode }

/** A hover tooltip that follows the pointer (fixed position, clamped to the viewport). */
export function useTip(): Tip {
  const [state, setState] = useState<{ x: number; y: number; content: ReactNode } | null>(null);
  const show = useCallback((e: React.MouseEvent | React.FocusEvent, content: ReactNode) => {
    let x: number, y: number;
    if ("clientX" in e) { x = e.clientX; y = e.clientY; }
    else { const r = (e.target as Element).getBoundingClientRect(); x = r.left + r.width / 2; y = r.top; }
    setState({ x, y, content });
  }, []);
  const hide = useCallback(() => setState(null), []);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  useLayoutEffect(() => {
    if (!state || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    let left = state.x + 14, top = state.y + 14;
    if (left + r.width > window.innerWidth - 8) left = state.x - r.width - 14;
    if (top + r.height > window.innerHeight - 8) top = state.y - r.height - 14;
    setPos({ left: Math.max(8, left), top: Math.max(8, top) });
  }, [state]);
  const node = state ? <div ref={ref} className="tip" style={pos} role="tooltip">{state.content}</div> : null;
  return { show, hide, node };
}

export function TipRows({ title, rows, note }: { title: ReactNode; rows: [ReactNode, ReactNode][]; note?: ReactNode }) {
  return (
    <div>
      <b>{title}</b>
      {rows.map(([k, v], i) => <div className="row" key={i}><span>{k}</span><span>{v}</span></div>)}
      {note && <div style={{ color: "var(--muted)", marginTop: 4, fontSize: 12 }}>{note}</div>}
    </div>
  );
}

export function Seg<T extends string>({ options, value, onChange, label }: { options: [T, string][]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([k, l]) => (
        <button key={k} aria-pressed={value === k} onClick={() => onChange(k)}>{l}</button>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="legend">
      {items.map(([c, l]) => <span key={l}><i className="sw" style={{ background: c }} />{l}</span>)}
    </div>
  );
}

/** A figure card: title, optional controls, chart, caption, source, and a table view of the same data. */
export function Figure({ title, sub, controls, children, caption, source, table, wide }: {
  title: ReactNode; sub?: ReactNode; controls?: ReactNode; children: ReactNode; caption?: ReactNode; source?: string;
  table?: { head: string[]; rows: (string | number)[][] }; wide?: boolean;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <figure className={wide ? "wide" : undefined}>
      <div className="fig">
        <div className="fig-head">
          <div><div className="fig-title">{title}</div>{sub && <div className="fig-sub">{sub}</div>}</div>
          {controls}
        </div>
        {children}
        {showTable && table && <DataTable {...table} />}
        <div className="fig-foot">
          {source && <div className="src">source: {source}</div>}
          {table && <button className="linkbtn" onClick={() => setShowTable((s) => !s)}>{showTable ? "hide table" : "show as table"}</button>}
        </div>
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="table-scroll">
      <table className="dtable">
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j > 0 ? "n" : undefined}>{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

const prefersDark = () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
const currentTheme = (): "light" | "dark" => {
  const t = document.documentElement.dataset.theme;
  return t === "light" || t === "dark" ? t : prefersDark() ? "dark" : "light";
};

/** The theme in effect, updated when the toggle or the OS setting changes it. */
export function useTheme(): ["light" | "dark", (t: "light" | "dark") => void] {
  const [theme, setThemeState] = useState(currentTheme);
  useEffect(() => {
    const sync = () => setThemeState(currentTheme());
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", sync);
    return () => { mo.disconnect(); mq.removeEventListener("change", sync); };
  }, []);
  const setTheme = (t: "light" | "dark") => {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("theme", t); } catch { /* storage unavailable: the choice lasts this visit */ }
  };
  return [theme, setTheme];
}

export function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button className="theme-btn" onClick={() => setTheme(next)} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
      {theme === "dark"
        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" /></svg>}
    </button>
  );
}

/** Scroll progress and the section the reader is in, for the progress bar and the table of contents. */
export function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      setProgress(h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight));
      let cur = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.3) cur = id;
      }
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [ids]);
  return { active, progress };
}
