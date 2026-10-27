import { Fragment, useState } from "react";
import { n, records } from "../data";
import { Figure, Legend, Seg, TipRows, useTip, useWidth } from "../components/ui";
import { lin } from "../components/charts";

interface CM {
  feature: string; family: string; scale: string; n: number; prediction: string | null; p_prediction: number | null;
  supports: boolean | null; supports_bc: boolean | null; p_prediction_bc: number | null; dominant: string;
  [k: string]: number | string | boolean | null;
}

const FEATURE: Record<string, string> = {
  acted: "Acted at all", first_reply_action: "First reply takes an action", log_exec: "Executed actions (log)", patch: "Produced a patch",
  unoffered_any: "Called an unoffered tool", log_out_tok: "Output tokens (log)",
  sh_read: "Read share", sh_search: "Search share", sh_explore: "Explore share", sh_edit: "Edit share", sh_plan: "Plan share",
  verified_tb: "Test or build after last edit", verified_tbr: "… counting run commands too",
  protocol_any: "Any protocol failure", rep_consec_rate: "Repeats the previous action (rate)", err_rate: "Errors per action",
  log_first_edit: "Step of the first edit (log)", loc_recall: "Gold files touched (patches)",
  err_per_slot: "Errors per slot (log)", rep_per_slot: "Repeats per slot (log)", loc_recall_all: "Gold-file recall, all slots",
  success: "Success",
};
const FAMILY: Record<string, [string, string]> = {
  E: ["Engagement", "predicted: the pairing dominates"],
  W: ["Workflow", "predicted: harness > model"],
  Q: ["Action quality", "predicted: model > harness"],
  "-": ["Outcome", "not part of a family"],
};
const ADDED = new Set(["verified_tbr", "err_per_slot", "rep_per_slot", "loc_recall_all"]);
const COMP = [["model", "var(--c-model)", "Model"], ["harness", "var(--c-harness)", "Harness"], ["inter", "var(--c-inter)", "Pairing (interaction)"]] as const;

type Variant = "controlMap" | "controlMapOriginal" | "controlMapRepo";

function ControlMap() {
  const tip = useTip();
  const [v, setV] = useState<Variant>("controlMap");
  const [bc, setBc] = useState<"raw" | "bc">("raw");
  const [added, setAdded] = useState(false);
  const [predictions, setPredictions] = useState(false);
  const [ref, width] = useWidth<HTMLDivElement>();
  const rows = records<CM>(v).filter((r) => added || !ADDED.has(r.feature));
  const narrow = width < 600;
  const lw = narrow ? 0 : 250, rowH = narrow ? 44 : 30, right = 40, top = 4;
  const max = 2.2;
  const x = lin(0, max, lw + 8, width - right);
  const fams = ["E", "W", "Q", "-"].filter((f) => rows.some((r) => r.family === f));
  let yy = top;
  const layout = fams.map((f) => {
    const y0 = yy; yy += 26;
    const fr = rows.filter((r) => r.family === f).map((r) => { const y = yy; yy += rowH; return { r, y }; });
    yy += 6;
    return { f, y0, fr };
  });
  const h = yy + 22;
  const val = (r: CM, c: string) => Number(bc === "bc" ? r[`sd_${c}_bc`] : r[`sd_${c}`]);
  const supp = (r: CM) => (bc === "bc" ? r.supports_bc : r.supports);
  const pp = (r: CM) => (bc === "bc" ? r.p_prediction_bc : r.p_prediction);
  return (
    <>
      <Figure wide
        title="Who controls which behaviour"
        sub="For each behaviour: how much it varies with the model, with the harness, and with the particular pairing beyond both, task held fixed. Finite-population SDs, logit or log scale, with 95% task-bootstrap intervals (core block)."
        controls={<div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <Seg label="Rows" value={v} onChange={setV} options={[["controlMap", "All rows"], ["controlMapOriginal", "Original attempts only"], ["controlMapRepo", "Repository bootstrap"]]} />
          <Seg label="Estimate" value={bc} onChange={setBc} options={[["raw", "Original"], ["bc", "Bias-corrected"]]} />
        </div>}
        caption={<>Editing and planning vary most with the harness; reading and searching vary most with the particular pairing. A majority of workflow measures show stronger harness than model variation in every sensitivity check. Other behaviour groups give a less consistent picture. The grey tick marks the pairing's within-task permutation noise floor. Bias correction changes the points; intervals remain those of the original bootstrap. {predictions && <>✓ marks support for a family prediction at bootstrap support ≥ {n("pThresh")}; ✗ marks a feature below that threshold.</>}</>}
      >
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <Legend items={COMP.map(([, c, l]) => [c, l])} />
          <label className="note" style={{ display: "inline-flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={added} onChange={(e) => setAdded(e.target.checked)} /> show additional measures
          </label>
        </div>
        <div ref={ref} className="chart-wrap">
          <svg width={width} height={h} role="img" aria-label="Control map">
            <g className="axis">
              {[0, 0.5, 1, 1.5, 2].map((t) => (
                <g key={t}><line x1={x(t)} x2={x(t)} y1={top} y2={h - 20} className="gridline" />
                  <text x={x(t)} y={h - 5} textAnchor="middle">{t}</text></g>
              ))}
            </g>
            {layout.map(({ f, y0, fr }) => (
              <Fragment key={f}>
                <text x={0} y={y0 + 17} style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", fill: "var(--head)" }}>
                  {FAMILY[f][0]} {predictions && <tspan style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", fill: "var(--muted)" }}>· {FAMILY[f][1]}</tspan>}
                </text>
                {fr.map(({ r, y }) => {
                  const cy = y + (narrow ? 30 : rowH / 2);
                  const s = supp(r);
                  return (
                    <g key={r.feature} onMouseMove={(e) => tip.show(e, <TipRows title={FEATURE[r.feature] ?? r.feature}
                      rows={[...COMP.map(([c, , l]) => [l, `${val(r, c).toFixed(2)} [${Number(r[`sd_${c}_lo`]).toFixed(2)}, ${Number(r[`sd_${c}_hi`]).toFixed(2)}]`] as [string, string]),
                        ["Noise floor (pairing)", Number(r.sd_inter_null).toFixed(2)], ["Largest", r.dominant === "inter" ? "pairing" : r.dominant],
                        ...(predictions && r.prediction ? [["Support for prediction", pp(r) === null ? "–" : Number(pp(r)).toFixed(3)] as [string, string]] : []), ["Slots", r.n]]}
                      note={bc === "bc" ? "bias-corrected SDs; intervals are the raw bootstrap's" : ADDED.has(r.feature) ? "added after review round 1" : undefined} />)} onMouseLeave={tip.hide}>
                      <rect className="hit" x={0} y={y} width={width} height={rowH} />
                      {narrow
                        ? <text x={0} y={y + 13} className="lbl" style={{ fontSize: 12 }}>{FEATURE[r.feature]}{predictions && r.prediction ? (s ? "  ✓" : "  ✗") : ""}</text>
                        : <>
                          <text x={lw - 26} y={cy + 4} textAnchor="end" className="lbl" style={{ fontStyle: ADDED.has(r.feature) ? "italic" : undefined }}>{FEATURE[r.feature]}</text>
                          {predictions && r.prediction && <text x={lw - 8} y={cy + 4} textAnchor="end" style={{ fontSize: 12, fill: s ? "var(--c-inter)" : "var(--pro)", fontWeight: 700 }}>{s ? "✓" : "✗"}</text>}
                      </>}
                    <line x1={x(Number(r.sd_inter_null))} x2={x(Number(r.sd_inter_null))} y1={cy + 1} y2={cy + 9} stroke="var(--faint)" strokeWidth={2} />
                    {COMP.map(([c, col], k) => {
                      const off = (k - 1) * 4;
                      const lo = Number(r[`sd_${c}_lo`]), hi = Number(r[`sd_${c}_hi`]);
                      return (
                        <g key={c}>
                          <line x1={x(lo)} x2={x(Math.min(hi, max))} y1={cy + off} y2={cy + off} stroke={col} strokeWidth={1.6} opacity={0.55} strokeLinecap="round" />
                          <circle cx={x(Math.min(val(r, c), max))} cy={cy + off} r={4.6} fill={col} stroke="var(--surface)" strokeWidth={1.4} />
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </Fragment>
          ))}
        </svg>
      </div>
      {tip.node}
    </Figure>
    <details className="evidence">
      <summary>Evidence and methods: prediction checks and robustness</summary>
      <p>
        The analysis grouped behaviours into engagement, workflow and action quality. The pre-registered predictions
        were that engagement would vary most with the pairing, workflow more with the harness than the model,
        and action quality more with the model than the harness. These behaviour comparisons are exploratory.
      </p>
      <p>
        Under the registered rule, engagement meets its prediction on {n("famE")} features, workflow on {n("famW")},
        and action quality on {n("famQ")}. Only workflow meets the family rule in every variant.
        On original attempts only, engagement meets its prediction on {n("famEsens")}; under repository resampling,
        on {n("famErepo")}. The engagement and quality family claims do not survive the checks.
      </p>
      <label className="note">
        <input type="checkbox" checked={predictions} onChange={(e) => setPredictions(e.target.checked)} /> Show prediction checks on the chart
      </label>
      <p className="note">
        With checks shown, ✓ marks support for the family prediction at bootstrap support ≥ {n("pThresh")}; ✗ marks
        a feature below that threshold. Additional measures were added after review and are identified in the tooltips.
      </p>
    </details>
    </>
  );
}

export function Control() {
  return (
    <section id="control" className="col">
      <div className="rq">Behaviour by behaviour</div>
      <h2>Who controls what depends on the behaviour</h2>
      <p className="answer">Editing and planning vary more with the harness; protocol validity varies more with the model and its serving path; success varies most with the pairing.</p>
      <p>
        The chart separates variation associated with the model, the harness and their particular combination,
        comparing the same tasks in the core block. Switch to original attempts or repository resampling to see
        which patterns persist. These are exploratory associations, not causal estimates.
        {" "}<span className="tier">exploratory</span>
      </p>
      <ControlMap />
      <h3>What holds up</h3>
      <ul className="clean">
        <li><b>How much an agent edits and plans depends more on the harness than on the model.</b> Every workflow share depends more on the harness
          than on the model, and for editing and planning the harness component is also the largest. The edit share is the clearest case: harness SD {n("cmEditHarness")}
          against a model SD of {n("cmEditModel")}. For reading and searching the pairing component is larger still, so those shares depend on the particular
          combination. Different tool menus, prompted workflows and editors lead one to expect this. The workflow family is the only one that holds in every check.</li>
        <li><b>Protocol validity depends more on the model and its serving path.</b> Whether a slot has any protocol failure varies more with the model ({n("cmProtoModel")}) than with the
          harness ({n("cmProtoHarness")}), in every variant. "Model" here includes its serving path: the channel tokens gpt-oss leaks into tool names come
          through its chat template and the provider's parser. The rate of repeating the previous action is also model-led ({n("cmRepModel")} against {n("cmRepHarness")}).</li>
        <li><b>Errors and file coverage follow different patterns.</b> Errors per action barely depend on the model ({n("cmErrModel")}) and mostly on the pairing ({n("cmErrInter")}).
          Gold-file recall among patches sits at its noise floor ({n("cmLocBcInter")} bias-corrected against {n("cmLocNullInter")}).</li>
        <li><b>Success varies most with the pairing:</b> interaction SD {n("cmSuccInter")} against {n("cmSuccModel")} for the model and {n("cmSuccHarness")} for the harness,
          far above its noise floor ({n("cmSuccInterBc")} bias-corrected against {n("cmSuccInterNull")}).</li>
        <li><b>Two engagement features are harness-led.</b> Acting at all (harness SD {n("cmActedHarness")}), because the stopping rules of Codex CLI and
          OpenCode let a run end on a single prose reply; and calling an unoffered tool ({n("cmUnoffHarness")}), which depends on the tool menu.</li>
      </ul>
      <div className="takeaway">
        <strong>Takeaway.</strong> For these models and harnesses, how much an agent edits and plans depends more on the harness than on the model
        (reading and searching depend most on the pairing), and whether its tool calls are well formed depends more on the model and its serving path. Success varies most with the pairing.
        The broader engagement and action-quality patterns do not hold up across the checks.
      </div>
    </section>
  );
}
