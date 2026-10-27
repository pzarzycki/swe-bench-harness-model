import { useState } from "react";
import { HARNESSES, HARNESS_LABEL, HARNESS_SHORT, Harness, MODELS, MODEL_LABEL, Model, isCore, n, pct, records } from "../data";
import { Figure, Seg, TipRows, useTip, useWidth } from "../components/ui";
import { lin } from "../components/charts";

const STEPS = ["acted", "edited", "patch", "success"] as const;
const STEP_LABEL = { acted: "Acted at all", edited: "Edited a file", patch: "Produced a patch", success: "Solved the task" };
// harness colours for this chart only (one model at a time): the two stop-on-prose harnesses warm, the two submit harnesses cool
export const H_COLOR: Record<Harness, string> = { "codex-cli": "var(--c-harness)", "opencode-cli": "var(--r-silent)", "deepseek-harness": "var(--faint)", "swe-agent": "var(--c-inter)", "mini-swe-agent": "var(--c-model)" };

/** Spread label positions so no two are closer than `gap` px, keeping their order. */
export function spread(ys: number[], gap: number, lo: number, hi: number) {
  const idx = ys.map((y, i) => [y, i] as const).sort((a, b) => a[0] - b[0]);
  const out = [...ys];
  let prev = -Infinity;
  for (const [y, i] of idx) { const v = Math.max(y, prev + gap); out[i] = v; prev = v; }
  const over = Math.max(...out) - hi;
  if (over > 0) for (let k = idx.length - 1, cap = hi; k >= 0; k--) { const i = idx[k][1]; out[i] = Math.min(out[i], cap); cap = out[i] - gap; }
  return out.map((v) => Math.max(lo, v));
}

interface F { model_id: Model; harness_family: Harness; acted: number; edited: number; patch: number; success: number }

function FunnelLines() {
  const tip = useTip();
  const [m, setM] = useState<Model>("nemotron-nano-3-30b");
  const [hover, setHover] = useState<Harness | null>(null);
  const [ref, width] = useWidth<HTMLDivElement>();
  const F = records<F>("funnel").filter((r) => r.model_id === m);
  const left = 44, right = width < 520 ? 70 : 130, top = 14, h = 290, bottom = 34;
  const x = (i: number) => lin(0, 3, left + 16, width - right)(i);
  const y = lin(0, 1, h - bottom, top);
  const labelY = spread(HARNESSES.map((hh) => y(F.find((f) => f.harness_family === hh)!.success) + 4), 13, top, h - bottom + 4);
  return (
    <Figure
      title="Where the runs part: the funnel"
      sub="Share of the 413 slots that reach each step, one line per harness. Pick a model."
      controls={<Seg label="Model" value={m} onChange={setM} options={MODELS.map((x) => [x, MODEL_LABEL[x]] as [Model, string])} />}
      table={{ head: ["Harness", ...STEPS.map((s) => STEP_LABEL[s])], rows: F.map((r) => [HARNESS_LABEL[r.harness_family], ...STEPS.map((s) => pct(r[s], 1))]) }}
      caption={<>For Nemotron the lines split at the first step. It acts at all in only <b>{n("funNemoCodexActed")}</b> of its Codex CLI slots and <b>{n("funNemoOpenActed")}</b> of its OpenCode slots, against nearly all of them under mini-SWE-agent and SWE-agent, where it reaches a patch in {n("funNemoMiniPatch")} and {n("funNemoSwePatch")}. gpt-oss under mini-SWE-agent acts in {n("funGptMiniActed")} and reaches a patch in {n("funGptMiniPatch")}. Estimates suggest smaller pairing differences after a patch exists, but uncertainty prevents a firm ordering of the stages.</>}
    >
      <div ref={ref} className="chart-wrap">
        <svg width={width} height={h} role="img" aria-label={`Funnel for ${MODEL_LABEL[m]}`}>
          <g className="axis">
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <g key={t}><line x1={left} x2={width - right + 10} y1={y(t)} y2={y(t)} className="gridline" />
                <text x={left - 8} y={y(t) + 4} textAnchor="end">{pct(t)}</text></g>
            ))}
            {STEPS.map((s, i) => <text key={s} x={x(i)} y={h - bottom + 20} textAnchor="middle" style={{ fontSize: width < 520 ? 10 : 12, fill: "var(--ink)" }}>{STEP_LABEL[s]}</text>)}
          </g>
          {HARNESSES.map((hh, hi) => {
            const r = F.find((f) => f.harness_family === hh)!;
            const ly = labelY[hi];
            const pts = STEPS.map((s, i) => [x(i), y(r[s])] as const);
            const dim = hover && hover !== hh;
            return (
              <g key={hh} opacity={dim ? 0.18 : 1} style={{ transition: "opacity .15s" }} onMouseEnter={() => setHover(hh)} onMouseLeave={() => { setHover(null); tip.hide(); }}
                onMouseMove={(e) => tip.show(e, <TipRows title={`${MODEL_LABEL[m]} × ${HARNESS_LABEL[hh]}`} rows={STEPS.map((s) => [STEP_LABEL[s], pct(r[s], 1)] as [string, string])} note={isCore(m, hh) ? "core block" : "extension lane"} />)}>
                <path d={pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join("")} fill="none" stroke={H_COLOR[hh]} strokeWidth={hover === hh ? 3.4 : 2.2} strokeDasharray={isCore(m, hh) ? undefined : "5 4"} />
                <path d={pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join("")} fill="none" stroke="transparent" strokeWidth={14} />
                {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={3.4} fill={H_COLOR[hh]} stroke="var(--surface)" strokeWidth={1.2} />)}
                <text x={pts[3][0] + 8} y={ly} className="lbl" style={{ fontSize: 11.5, fill: H_COLOR[hh] }}>{width < 520 ? HARNESS_SHORT[hh] : HARNESS_LABEL[hh]}{isCore(m, hh) ? "" : "*"}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="note">Dashed line and *: extension lane. Hover a line to isolate it.</div>
      {tip.node}
    </Figure>
  );
}

interface B { quantity: string; mean: number; lo95: number; hi95: number }
function StepSD() {
  const tip = useTip();
  const [ref, width] = useWidth<HTMLDivElement>();
  const b = records<B>("bayesH4");
  const f = records<Record<string, number | string>>("h4f")[0];
  const rows = [
    { k: "acted", label: "Acted", b: b.find((r) => r.quantity === "sd_inter[acted]")!, f: "acted" },
    { k: "edited", label: "Edited | acted", b: b.find((r) => r.quantity === "sd_inter[edited|acted]")!, f: "edited" },
    { k: "patch", label: "Patch | edited", b: b.find((r) => r.quantity === "sd_inter[patch|edited]")!, f: "patch" },
    { k: "success", label: "Success | patch", b: b.find((r) => r.quantity === "sd_inter[success|patch]")!, f: "success" },
  ];
  const lw = width < 520 ? 104 : 140, rowH = 46, top = 6, right = 20;
  const x = lin(0, 2.6, lw, width - right);
  const h = rows.length * rowH + 30;
  return (
    <Figure
      title="How large the interaction is at each step"
      sub="Interaction SD on the logit scale (core block). Blue: Bayesian continuation-ratio model, mean and 95% interval. Orange: frequentist estimate, with its task-bootstrap interval."
      caption={<>Both methods estimate larger pairing differences at the early steps, but their statistical support differs. The frequentist estimate at the last step is unstable: gpt-oss under mini-SWE-agent has almost no successes among its few patches, and its interval reaches 2.5. The early-versus-late comparison remains <b>uncertain</b>. The frequentist model uses marginal logits for its first two steps and conditional logits for the last two.</>}
    >
      <div ref={ref} className="chart-wrap">
        <svg width={width} height={h} role="img" aria-label="Interaction SD per funnel step">
          <g className="axis">
            {[0, 0.5, 1, 1.5, 2, 2.5].map((t) => (
              <g key={t}><line x1={x(t)} x2={x(t)} y1={top} y2={h - 22} className="gridline" />
                <text x={x(t)} y={h - 6} textAnchor="middle">{t}</text></g>
            ))}
          </g>
          {rows.map((r, i) => {
            const cy = top + i * rowH + rowH / 2;
            const fm = Number(f[`sd_${r.f}`]), flo = Number(f[`sd_${r.f}_lo`]), fhi = Number(f[`sd_${r.f}_hi`]);
            return (
              <g key={r.k} onMouseMove={(e) => tip.show(e, <TipRows title={r.label} rows={[["Bayesian mean", r.b.mean.toFixed(2)], ["95% interval", `${r.b.lo95.toFixed(2)}–${r.b.hi95.toFixed(2)}`], ["Frequentist", fm.toFixed(2)], ["bootstrap interval", `${flo.toFixed(2)}–${fhi.toFixed(2)}`], ["method", String(f[`method_${r.f}`])]]} />)} onMouseLeave={tip.hide}>
                <rect className="hit" x={0} y={cy - rowH / 2} width={width} height={rowH} />
                <text x={lw - 12} y={cy + 4} textAnchor="end" className="lbl">{r.label}</text>
                <line x1={x(r.b.lo95)} x2={x(r.b.hi95)} y1={cy - 6} y2={cy - 6} stroke="var(--c-model)" strokeWidth={2.4} strokeLinecap="round" />
                <circle cx={x(r.b.mean)} cy={cy - 6} r={5.5} fill="var(--c-model)" stroke="var(--surface)" strokeWidth={2} />
                <line x1={x(flo)} x2={x(Math.min(fhi, 2.6))} y1={cy + 7} y2={cy + 7} stroke="var(--c-harness)" strokeWidth={1.6} strokeLinecap="round" opacity={0.7} />
                <rect x={x(fm) - 4.5} y={cy + 2.5} width={9} height={9} fill="var(--c-harness)" stroke="var(--surface)" strokeWidth={1.5} />
              </g>
            );
          })}
        </svg>
      </div>
      {tip.node}
    </Figure>
  );
}

export function Funnel() {
  return (
    <section id="funnel" className="col">
      <div className="rq">Where the gap opens</div>
      <h2>Where the runs part</h2>
      <p className="answer">Some pairings diverge before the agent edits a file. Estimated pairing differences are larger before a patch is produced, but the evidence does not establish that ordering reliably.</p>
      <p>
        Follow every slot through four steps: did the agent take any action, did it edit a file, did it produce a patch,
        and did the patch solve the task? Success among patches is conditioned on getting there, so we never read it as
        "quality".
      </p>
      <FunnelLines />
      <h3>How much the pairing matters at each step</h3>
      <p>
        Every estimator puts the early steps above success given a patch at its point estimate. The Bayesian fit's
        interaction SD is {n("hFourStepActed")} at the first step, {n("hFourStepPatch")} at the patch step and {n("hFourStepSucc")} at the last. On the probability
        scale, which avoids the logit's sensitivity to cells near zero or one, the interaction is {n("hFourRdActed")} percentage points at
        acting and {n("hFourRdPatch")} at reaching a patch, against {n("hFourRdSucc")} at success given a patch (descriptive).
      </p>
      <StepSD />
      <details className="evidence">
        <summary>Evidence and methods: why the stage comparison is uncertain</summary>
        <p>
          The pre-registered comparison (H4) required stronger interaction at acting and at reaching a patch after an edit
          than at success given a patch. Bayesian posterior support is {n("hFourBa")} and {n("hFourBb")};
          frequentist task-bootstrap support is {n("hFourFa")} and {n("hFourFb")}, against a threshold of {n("hFourThresh")}.
          The methods disagree, so H4 remains unresolved under its decision rule.
        </p>
        <p>
          The Bayesian support is itself fragile. With a tighter prior the order holds but every SD shrinks, the first
          step's most (to {n("hFourActedPrior")}). Counting any edit attempt as an edit, the second inequality falls just short ({n("hFourBedAny")}).
        </p>
      </details>
      <p>
        Acting is not the whole story either: the DeepSeek harness (an extension) forces a tool call in the first
        reply, so Nemotron acts in {n("dshNemoActed")} of its slots there, yet it edits in only {n("dshNemoEdited")} and solves {n("dshNemoSucc")},
        against {n("subNemoSuccLo")}–{n("subNemoSuccHi")} under the two harnesses that wait for an explicit submit.
      </p>
      <div className="takeaway">
        <strong>Takeaway.</strong> Reaching an action or a patch is a major source of separation between these pairings.
        Whether pairing differences are reliably larger at those stages than among produced patches remains uncertain.
      </div>
    </section>
  );
}
