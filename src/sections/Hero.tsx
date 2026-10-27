import { useEffect, useMemo, useRef, useState } from "react";
import { HARNESS_SHORT, Harness, MODEL_COLOR, MODEL_LABEL, Model, n, slots, laneLabel, isCore } from "../data";
import { Figure, Legend, Seg, TipRows, useTheme, useTip, useWidth } from "../components/ui";

export function Hero() {
  return (
    <header className="hero col">
      <div className="kicker">Model × harness interaction · {n("nSlots")} agent runs with full trajectories</div>
      <h1>No Best Harness, No Best Model</h1>
      <p className="subtitle">The same compact coding model solves {n("nemoMini")} issues in one harness and {n("nemoCodex")} in another. Where do the runs part, and why?</p>
      <p className="lede">
        A coding agent is a model inside a harness: the loop, prompts, tools and stopping rules that turn a language
        model into something that reads a repository, edits files and runs tests. Evaluations usually hold one of the
        two fixed. We studied <strong>{n("nModels")} compact open-weight mixture-of-experts models across {n("nHarnesses")} harnesses
        on {n("nTasks")} multi-language SWE-bench-Live tasks</strong>, one attempt per combination, {n("nSlots")} slots. Every slot keeps its trajectory:
        {" "}{n("nCalls")} model calls, {n("nActions")} actions, and the tool schemas each harness offered.
      </p>
      <p className="note">
        The main comparisons use a core block of three models and four harnesses on one serving route.
        The DeepSeek harness column and Gemma-4 row are separate extensions. Gemma-4 used another serving route
        and time budget; comparisons involving these extensions are descriptive.
      </p>
      <div className="byline">
        <div><h4>Author</h4><div>Pawel Zarzycki</div></div>
        <div><h4>Resources</h4><div>Paper (arXiv, forthcoming)<br /><a href="https://huggingface.co/datasets/pzarzycki/swebenchlive-harness-compact-moe" target="_blank" rel="noreferrer">Dataset (Hugging Face) ↗</a></div></div>
        <div><h4>Benchmark</h4><div>SWE-bench-Live MultiLang<br />Linux split, {n("nTasks")} tasks</div></div>
      </div>
    </header>
  );
}

export function KeyNumbers() {
  return (
    <div className="col">
      <div className="stats">
        <div className="stat"><div className="v">{n("nemoMini")} <small>vs {n("nemoCodex")}</small></div><div className="l">tasks solved by Nemotron-Nano-3 under mini-SWE-agent, and under Codex CLI</div></div>
        <div className="stat"><div className="v">{n("gptCodex")} <small>vs {n("gptMini")}</small></div><div className="l">for gpt-oss-20b, the other way round: Codex CLI, then mini-SWE-agent</div></div>
        <div className="stat"><div className="v">{n("hOneLR")}</div><div className="l">likelihood ratio against an additive model (6 df); none of {n("nPboot")} bootstrap simulations came close</div></div>
        <div className="stat"><div className="v">{n("tasksUnsolved")} <small>of {n("nTasks")}</small></div><div className="l">tasks that no pairing solves: whatever the interaction, the agents share a ceiling</div></div>
      </div>
    </div>
  );
}

const OUT_COLOR: Record<string, string> = { s: "--o-success", f: "--o-failure", e: "--o-empty", x: "--o-other" };
const OUT_LABEL: Record<string, string> = { s: "Success", f: "Patch, tests fail", e: "No patch", x: "Censored or not graded" };
const MODEL_ORDER: Model[] = ["qwen3-coder-30b-a3b", "nemotron-nano-3-30b", "gpt-oss-20b", "gemma-4-26b-a4b"];
const H_ORDER: Harness[] = ["mini-swe-agent", "swe-agent", "codex-cli", "opencode-cli", "deepseek-harness"];

/** Every slot as one cell: 20 lanes (rows) × 413 tasks (columns), tasks sorted by how many lanes solve them. */
export function SlotMatrix() {
  const tip = useTip();
  const [theme] = useTheme();
  const [mode, setMode] = useState<"outcome" | "success">("outcome");
  const [ref, width] = useWidth<HTMLDivElement>(900);
  const canvas = useRef<HTMLCanvasElement>(null);
  const rows = useMemo(() => MODEL_ORDER.flatMap((m) => H_ORDER.map((h) => ({ m, h, j: slots.lanes.findIndex((l) => l.model === m && l.harness === h) }))), []);
  const order = useMemo(() => {
    const solved = slots.outcome.map((o) => [...o].filter((c) => c === "s").length);
    return slots.tasks.map((_, i) => i).sort((a, b) => solved[b] - solved[a] || a - b);
  }, []);
  const narrow = width < 560;
  const lw = narrow ? 66 : 150;
  const plotW = width - lw;
  const cw = plotW / order.length;
  const rh = narrow ? 9 : 12, gap = narrow ? 18 : 6;
  // on narrow screens each model's name sits on its own line above its five rows
  const yOf = (r: number) => r * rh + Math.floor(r / 5) * gap + (narrow ? gap - 4 : 0);
  const height = yOf(rows.length - 1) + rh + 4;

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = plotW * dpr; cv.height = height * dpr;
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, plotW, height);
    const css = getComputedStyle(document.documentElement);
    const col = (v: string) => css.getPropertyValue(v).trim();
    const c = Object.fromEntries(Object.entries(OUT_COLOR).map(([k, v]) => [k, col(v)]));
    const off = col("--o-empty");
    rows.forEach((r, ri) => {
      const y = yOf(ri);
      order.forEach((ti, x) => {
        const o = slots.outcome[ti][r.j];
        ctx.fillStyle = mode === "success" ? (o === "s" ? c.s : off) : c[o];
        ctx.fillRect(x * cw, y, Math.max(1, cw - (cw > 2.5 ? 0.6 : 0)), rh - 2);
      });
    });
  }, [plotW, height, mode, theme, cw]);

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - b.left) / cw), y = e.clientY - b.top;
    const ri = rows.findIndex((_, i) => y >= yOf(i) && y < yOf(i) + rh);
    if (x < 0 || x >= order.length || ri < 0) return tip.hide();
    const ti = order[x], r = rows[ri], t = slots.tasks[ti];
    const o = slots.outcome[ti][r.j];
    const solvedBy = [...slots.outcome[ti]].filter((c) => c === "s").length;
    tip.show(e, <TipRows title={t.id.replace("__", "/")} rows={[["Lane", laneLabel(r.m, r.h)], ["Outcome", OUT_LABEL[o]], ["Language", t.language], ["Lanes solving this task", `${solvedBy} of 20`]]}
      note={isCore(r.m, r.h) ? undefined : "extension lane"} />);
  };

  return (
    <Figure wide
      title={`Every slot, one cell: ${n("nSlots")} runs`}
      sub="Rows are the 20 model × harness lanes, grouped by model. Columns are the 413 tasks, sorted by how many lanes solve them."
      controls={<Seg label="Colour" value={mode} onChange={setMode} options={[["outcome", "Outcome"], ["success", "Successes only"]]} />}
      caption={<>Read across a row to see one pairing; read down a block to see one model in five harnesses. Rows within a model differ far more than an additive model allows. Successes concentrate on the left: <b>{n("tasksUnsolved")}</b> tasks (all of the right-hand part) are solved by no lane, and no task by more than {n("tasksMaxLanes")} of 20.</>}
    >
      <Legend items={(["s", "f", "e", "x"] as const).map((k) => [`var(${OUT_COLOR[k]})`, OUT_LABEL[k]])} />
      <div ref={ref} className="chart-wrap" style={{ display: "flex" }}>
        <div style={{ width: lw, flex: "none", position: "relative", height }}>
          {rows.map((r, ri) => (
            <div key={`${r.m}${r.h}`} style={{ position: "absolute", top: yOf(ri) - 2, right: 8, height: rh, fontSize: narrow ? 9 : 11, lineHeight: `${rh}px`, color: "var(--muted)", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
              {ri % 5 === 0 && !narrow && <b style={{ color: "var(--head)", fontWeight: 600 }}>{MODEL_LABEL[r.m]}</b>}
              <span>{HARNESS_SHORT[r.h]}{isCore(r.m, r.h) ? "" : "*"}</span>
              <i className="dot" style={{ width: 7, height: 7, borderRadius: 2, background: MODEL_COLOR[r.m], display: "inline-block" }} />
            </div>
          ))}
          {narrow && rows.map((r, ri) => ri % 5 === 0 && (
            <div key={r.m} style={{ position: "absolute", left: 0, top: yOf(ri) - gap + 1, fontSize: 11, fontWeight: 600, color: "var(--head)", whiteSpace: "nowrap" }}>{MODEL_LABEL[r.m]}</div>
          ))}
        </div>
        <canvas ref={canvas} style={{ width: plotW, height, display: "block", cursor: "crosshair" }} onMouseMove={onMove} onMouseLeave={tip.hide} />
      </div>
      <div className="note" style={{ marginTop: 6 }}>* extension lane (separate run: the DeepSeek harness column, and every Gemma-4 row)</div>
      {tip.node}
    </Figure>
  );
}
