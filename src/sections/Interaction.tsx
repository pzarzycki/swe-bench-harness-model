import { Fragment, useState } from "react";
import {
  CORE_HARNESSES, CORE_MODELS, HARNESSES, HARNESS_LABEL, HARNESS_SHORT, Harness, MODELS, MODEL_COLOR, MODEL_LABEL, Model,
  fmtInt, isCore, n, num, records, table,
} from "../data";
import { Figure, Seg, TipRows, useTip, useWidth } from "../components/ui";
import { HBar, lin } from "../components/charts";

interface Lane { lane: string; model: Model; harness: Harness; cohort: string; success: number; failure: number; empty: number; ungradable: number; submit_pct: number; p_success_given_submit: number }
export const lanes = () => records<Lane>("lanes");
export const laneRow = (m: string, h: string) => lanes().find((l) => l.model === m && l.harness === h)!;

const MARK: Record<Model, (x: number, y: number, c: string) => JSX.Element> = {
  "qwen3-coder-30b-a3b": (x, y, c) => <circle cx={x} cy={y} r={5} fill={c} stroke="var(--surface)" strokeWidth={1.5} />,
  "nemotron-nano-3-30b": (x, y, c) => <rect x={x - 4.5} y={y - 4.5} width={9} height={9} fill={c} stroke="var(--surface)" strokeWidth={1.5} />,
  "gpt-oss-20b": (x, y, c) => <path d={`M${x},${y - 6}L${x + 6},${y}L${x},${y + 6}L${x - 6},${y}Z`} fill={c} stroke="var(--surface)" strokeWidth={1.5} />,
  "gemma-4-26b-a4b": (x, y, c) => <path d={`M${x},${y - 6}L${x + 6},${y + 4.5}L${x - 6},${y + 4.5}Z`} fill={c} stroke="var(--surface)" strokeWidth={1.5} />,
};
export const Mark = ({ m, x, y }: { m: Model; x: number; y: number }) => MARK[m](x, y, MODEL_COLOR[m]);

export function ModelChips({ on, toggle }: { on: Set<Model>; toggle: (m: Model) => void }) {
  return (
    <div className="chips" role="group" aria-label="Models">
      {MODELS.map((m) => (
        <button key={m} className="chip" aria-pressed={on.has(m)} onClick={() => toggle(m)}>
          <svg width={12} height={12}><Mark m={m} x={6} y={6} /></svg>{MODEL_LABEL[m]}{m === "gemma-4-26b-a4b" ? " (ext.)" : ""}
        </button>
      ))}
    </div>
  );
}

export function useModelSet(initial: Model[] = MODELS) {
  const [on, setOn] = useState(new Set<Model>(initial));
  const toggle = (m: Model) => setOn((s) => { const t = new Set(s); t.has(m) ? t.delete(m) : t.add(m); return t.size ? t : s; });
  return [on, toggle] as const;
}

function ReactionNorms() {
  const tip = useTip();
  const [on, toggle] = useModelSet();
  const [hover, setHover] = useState<Model | null>(null);
  const [ref, width] = useWidth<HTMLDivElement>();
  const left = 40, right = width < 520 ? 16 : 120, top = 14, h = 300, bottom = 40;
  const x = (i: number) => lin(0, HARNESSES.length - 1, left + 20, width - right - 10)(i);
  const y = lin(0, 110, h - bottom, top);
  const step = x(1) - x(0);
  return (
    <Figure
      title="Same model, different harness: the lines cross"
      sub={`Tasks solved (of ${n("nTasks")}) for each model in each harness. Hover a point for the lane's outcomes.`}
      controls={<ModelChips on={on} toggle={toggle} />}
      table={{ head: ["Model", ...HARNESSES.map((hh) => HARNESS_LABEL[hh])], rows: MODELS.map((m) => [MODEL_LABEL[m], ...HARNESSES.map((hh) => laneRow(m, hh).success)]) }}
      caption={<>If model and harness combined additively, the lines would run roughly parallel. Instead <b>Nemotron</b> solves {n("nemoMini")} under mini-SWE-agent and {n("nemoSwe")} under SWE-agent but {n("nemoCodex")} under Codex CLI and OpenCode, while <b>gpt-oss</b> does the opposite: {n("gptCodex")} under Codex CLI, {n("gptMini")} under mini-SWE-agent. Dashed line and shaded column: extensions, run separately.</>}
    >
      <div ref={ref} className="chart-wrap">
        <svg width={width} height={h} role="img" aria-label="Successes per model across harnesses">
          <rect x={x(2) - step / 2} y={top} width={step} height={h - bottom - top} fill="var(--panel)" />
          <g className="axis">
            {[0, 20, 40, 60, 80, 100].map((t) => (
              <g key={t}><line x1={left} x2={width - right} y1={y(t)} y2={y(t)} className="gridline" />
                <text x={left - 8} y={y(t) + 4} textAnchor="end">{t}</text></g>
            ))}
            {HARNESSES.map((hh, i) => (
              <text key={hh} x={x(i)} y={h - bottom + 18} textAnchor="middle" style={{ fontSize: width < 520 ? 10 : 12, fill: "var(--ink)" }}>
                {width < 520 ? HARNESS_SHORT[hh] : HARNESS_LABEL[hh]}
              </text>
            ))}
            <text x={x(2)} y={h - bottom + 32} textAnchor="middle" style={{ fontSize: 10.5 }}>extension</text>
          </g>
          {MODELS.filter((m) => on.has(m)).map((m) => {
            const pts = HARNESSES.map((hh, i) => [x(i), y(laneRow(m, hh).success)] as const);
            const dim = hover && hover !== m;
            const last = pts[pts.length - 1];
            return (
              <g key={m} opacity={dim ? 0.2 : 1} onMouseEnter={() => setHover(m)} onMouseLeave={() => setHover(null)} style={{ transition: "opacity .15s" }}>
                <path d={pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join("")} fill="none" stroke={MODEL_COLOR[m]} strokeWidth={hover === m ? 3 : 2.2}
                  strokeDasharray={m === "gemma-4-26b-a4b" ? "6 4" : undefined} />
                {pts.map((p, i) => {
                  const r = laneRow(m, HARNESSES[i]);
                  return (
                    <g key={i} onMouseMove={(e) => tip.show(e, <TipRows title={`${MODEL_LABEL[m]} × ${HARNESS_LABEL[HARNESSES[i]]}`}
                      rows={[["Success", r.success], ["Patch, tests fail", r.failure], ["No patch", r.empty], ["Patch produced", `${r.submit_pct}%`], ["Success among patches", `${r.p_success_given_submit}%`]]}
                      note={isCore(m, HARNESSES[i]) ? "core block" : "extension lane"} />)} onMouseLeave={tip.hide}>
                      <circle cx={p[0]} cy={p[1]} r={12} fill="transparent" />
                      <Mark m={m} x={p[0]} y={p[1]} />
                    </g>
                  );
                })}
                {width >= 520 && <text x={last[0] + 12} y={last[1] + 4 + (m === "gemma-4-26b-a4b" ? -6 : m === "nemotron-nano-3-30b" ? 7 : 0)} className="lbl">{MODEL_LABEL[m]}</text>}
              </g>
            );
          })}
        </svg>
      </div>
      {tip.node}
    </Figure>
  );
}

type Best = "none" | "harness" | "model";
function SuccessGrid() {
  const tip = useTip();
  const [best, setBest] = useState<Best>("harness");
  // core block only (H2's bootstrap): extension lanes are never starred
  const bp = records<{ question: string; for: string; best: string; share: number }>("bestPairingCore").map((r) => ({ ...r, winner: r.best }));
  const L = lanes();
  const max = Math.max(...L.map((l) => l.success));
  const stab = (q: string, f: string) => bp.filter((r) => r.question === q && r.for === f).sort((a, b) => b.share - a.share);
  const top = (q: string, f: string) => stab(q, f)[0]?.winner;
  const isBest = (m: Model, h: Harness) => !isCore(m, h) ? false : best === "harness" ? top("best harness for model", m) === h
    : best === "model" ? top("best model for harness", h) === m : false;
  const shade = (v: number) => `color-mix(in srgb, var(--heat1) ${Math.round((v / max) * 88)}%, var(--heat0))`;
  return (
    <Figure
      title="The success grid"
      sub="Successes of 413 per lane. Stars mark the most frequent winner within the core block over 2,000 task-bootstrap resamples; hover a cell for how stable that is."
      controls={<Seg label="Mark" value={best} onChange={setBest} options={[["harness", "Best harness per model"], ["model", "Best model per harness"], ["none", "None"]]} />}
      caption={<>Each model's best harness is another model's worst. In the core block, Qwen3-Coder is the best model in only two of the four harnesses: gpt-oss leads under Codex CLI and Nemotron under mini-SWE-agent. Hatched cells are extension lanes and take no part in the stars. A bootstrap share is a stability measure, not a p-value.</>}
    >
      <div className="table-scroll">
        <div className="heat" style={{ gridTemplateColumns: `minmax(96px, 130px) repeat(${HARNESSES.length}, minmax(52px, 1fr))`, minWidth: 420 }}>
          <div />
          {HARNESSES.map((h) => <div key={h} className="hd">{HARNESS_LABEL[h]}{h === "deepseek-harness" ? " (ext.)" : ""}</div>)}
          {MODELS.map((m) => (
            <Fragment key={m}>
              <div className="rl"><span><i className="dot" style={{ background: MODEL_COLOR[m], width: 8, height: 8, borderRadius: 2, display: "inline-block", marginRight: 6 }} />{MODEL_LABEL[m]}{m === "gemma-4-26b-a4b" ? " (ext.)" : ""}</span></div>
              {HARNESSES.map((h) => {
                const r = L.find((l) => l.model === m && l.harness === h)!;
                const dark = r.success / max > 0.5;
                const q = best === "model" ? stab("best model for harness", h) : stab("best harness for model", m);
                return (
                  <div key={`${m}-${h}`} className={`cell${isCore(m, h) ? "" : " ext"}`} style={{ background: shade(r.success), color: dark ? "#fff" : "var(--ink)" }}
                    onMouseMove={(e) => tip.show(e, <TipRows title={`${MODEL_LABEL[m]} × ${HARNESS_LABEL[h]}`}
                      rows={[["Successes", r.success], ["Patch produced", `${r.submit_pct}%`], ...(best !== "none" && isCore(m, h) ? q.map((x) => [best === "model" ? `best model: ${MODEL_LABEL[x.winner as Model]}` : `best harness: ${HARNESS_LABEL[x.winner as Harness]}`, `${Math.round(x.share * 1000) / 10}% of resamples`] as [string, string]) : [])]}
                      note={isCore(m, h) ? "core block" : "extension lane; descriptive comparison"} />)} onMouseLeave={tip.hide}>
                    {isBest(m, h) && <span className="star">★</span>}
                    <span className="big">{r.success}</span>
                    <span className="sm">{Math.round(r.submit_pct)}% patch</span>
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
      {tip.node}
    </Figure>
  );
}

function Regret() {
  const tip = useTip();
  const [block, setBlock] = useState<"core" | "full">("core");
  const rows = records<{ choice: string; level: string; regret: number }>(block === "core" ? "regretCore" : "regret");
  const label = (r: { choice: string; level: string }) => r.choice.includes("harness") ? `${HARNESS_LABEL[r.level as Harness]} for every model` : `${MODEL_LABEL[r.level as Model]} in every harness`;
  const sorted = [...rows].sort((a, b) => a.choice.localeCompare(b.choice) || a.regret - b.regret);
  return (
    <Figure
      title="What a single choice costs"
      sub="Successes lost against each row's best, if one harness is used for every model (orange) or one model in every harness (blue)."
      controls={<Seg label="Block" value={block} onChange={setBlock} options={[["core", "Core block"], ["full", "All 20 lanes"]]} />}
      caption={<>In the core block the best single harness, SWE-agent, loses <b>{n("regretHarnessCore")}</b> successes and the best single model, Qwen3-Coder, <b>{n("regretModelCore")}</b>. Across all 20 lanes the losses are {n("regretHarness")} and {n("regretModel")}, most of the difference coming from Gemma-4.</>}
    >
      <HBar tip={tip} labelW={230} fmt={(v) => `${Math.round(v)}`}
        rows={sorted.map((r) => ({ key: r.choice + r.level, label: label(r), value: r.regret, valueLabel: `${r.regret}`,
          color: r.choice.includes("harness") ? "var(--c-harness)" : "var(--c-model)",
          tip: <TipRows title={label(r)} rows={[["Successes lost", r.regret]]} /> }))} />
      {tip.node}
    </Figure>
  );
}

function Confirmatory() {
  const t = table("confirmatory");
  let last = "";
  return (
    <div className="table-scroll" style={{ margin: "20px 0" }}>
      <table className="dtable">
        <thead><tr>{t.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>
          {t.rows.map((r, i) => {
            const hyp = r[0] || last; last = hyp;
            const dec = r[3];
            return (
              <tr key={i}>
                <td style={{ fontWeight: r[0] ? 600 : 400, color: "var(--head)" }}>{r[0]}</td>
                <td>{r[1]}</td><td>{r[2]}</td>
                <td><span className={`tier ${/unresolved/.test(dec) ? "u" : /not supported/.test(dec) ? "" : "c"}`}>{dec.replace(/\s*\(.*\)/, "")}</span>
                  {/\(/.test(dec) && <div className="note" style={{ fontSize: 11.5 }}>{dec.match(/\((.*)\)/)![1]}</div>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Interaction() {
  return (
    <section id="interaction" className="col">
      <div className="rq">The main result</div>
      <h2>No best harness, no best model</h2>
      <p className="answer">The model and harness work as a pair. In the core comparison, no harness is best for every model, and no model is best in every harness.</p>
      <ReactionNorms />
      <p>
        Qwen3-Coder is the most consistent model and reaches {n("qwenSwe")} under SWE-agent (and {n("qwenDsh")} under the
        DeepSeek harness, an extension). It still loses two of the four core harnesses. Gemma-4 peaks under mini-SWE-agent with
        {" "}{n("gemmaMini")}, a result that holds under its time budget only.
      </p>
      <SuccessGrid />
      <Regret />
      <details className="evidence">
        <summary>Evidence and methods: interaction and ranking stability</summary>
        <p>
          All three pre-registered estimators reject the additive model in the core block. The mixed-model likelihood
          ratio is {n("hOneLR")} on six degrees of freedom, and none of {n("nPboot")} parametric-bootstrap simulations reached it. The
          Bayesian fit improves the expected log predictive density by {n("hOneElpd")} ± {n("hOneElpdSE")}, with an interaction SD
          of {n("hOneSD")} on the logit scale; the conditional logit grouped by task gives {n("hOneClogit")}. Across {n("nTaskBoot")}
          {" "}task-bootstrap resamples, one harness was best for all three core models in {n("hTwoA")} of them, and one model best in
          all four harnesses in {n("hTwoB")}. The registered rank swap (gpt-oss ahead of Nemotron under Codex CLI, behind it under
          mini-SWE-agent) held in {n("hThree")}; the pair was chosen from crossovers already visible, so this is a consistency check.
        </p>
        <Confirmatory />
      </details>
      <div className="takeaway">
        <strong>Takeaway.</strong> Outcomes are not additive in model and harness: the same compact model ranges from {n("nemoCodex")} to {n("nemoMini")} successes
        depending on the harness. A leaderboard that fixes one harness would rank these models in different orders depending on which
        harness it picked.
      </div>
      <p className="note">Core block: {CORE_MODELS.map((m) => MODEL_LABEL[m]).join(", ")} × {CORE_HARNESSES.map((h) => HARNESS_LABEL[h]).join(", ")}; {fmtInt(num(n("nCoreSlots")))} slots.</p>
    </section>
  );
}
