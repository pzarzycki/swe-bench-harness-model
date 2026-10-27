import { Fragment } from "react";
import { HARNESSES, HARNESS_LABEL, Harness, MODELS, MODEL_COLOR, MODEL_LABEL, Model, isCore, n, pct, records } from "../data";
import { Figure, TipRows, useTip, useWidth } from "../components/ui";
import { HBar, lin, topRounded } from "../components/charts";

function Ceiling() {
  const tip = useTip();
  const [ref, width] = useWidth<HTMLDivElement>();
  const rows = records<{ lanes_solving_of_20: number; tasks: number }>("tasksByLanes");
  const left = 40, right = 10, top = 10, h = 230, bottom = 36;
  const x = lin(0, 21, left, width - right);
  const y = lin(0, 230, h - bottom, top);
  const bw = (x(1) - x(0)) * 0.78;
  return (
    <Figure
      title="A shared ceiling"
      sub="Tasks by the number of the 20 lanes that solve them."
      caption={<><b>{n("tasksUnsolved")}</b> of the {n("nTasks")} tasks are solved by no lane at all, and no task by more than {n("tasksMaxLanes")} of the twenty. Task traits explain little of which tasks are hard. In exploratory, uncorrected regressions, Rust tasks are solved less often in the core block (p {n("rustP")}), larger gold patches less often and tasks with more fail-to-pass tests more often; none of these would survive a correction for multiple tests.</>}
    >
      <div ref={ref} className="chart-wrap">
        <svg width={width} height={h} role="img" aria-label="Tasks by number of lanes solving them">
          <g className="axis">
            {[0, 50, 100, 150, 200].map((t) => (
              <g key={t}><line x1={left} x2={width - right} y1={y(t)} y2={y(t)} className="gridline" />
                <text x={left - 8} y={y(t) + 4} textAnchor="end">{t}</text></g>
            ))}
            {[0, 4, 8, 12, 16, 20].map((t) => <text key={t} x={x(t + 0.5)} y={h - bottom + 16} textAnchor="middle">{t}</text>)}
            <text x={(left + width) / 2} y={h - 4} textAnchor="middle" style={{ fontSize: 11.5 }}>lanes solving the task (of 20)</text>
          </g>
          {rows.map((r) => (
            <g key={r.lanes_solving_of_20} onMouseMove={(e) => tip.show(e, <TipRows title={`Solved by ${r.lanes_solving_of_20} of 20 lanes`} rows={[["Tasks", r.tasks]]} />)} onMouseLeave={tip.hide}>
              <rect className="hit" x={x(r.lanes_solving_of_20)} y={top} width={x(1) - x(0)} height={h - bottom - top} />
              <path d={topRounded(x(r.lanes_solving_of_20 + 0.5) - bw / 2, y(r.tasks), bw, y(0) - y(r.tasks))} fill={r.lanes_solving_of_20 === 0 ? "var(--accent)" : "var(--c-model)"} />
              {r.lanes_solving_of_20 === 0 && <text x={x(0.5) + bw / 2 + 6} y={y(r.tasks) + 12} className="lbl">{r.tasks} tasks: no lane solves them</text>}
            </g>
          ))}
        </svg>
      </div>
      {tip.node}
    </Figure>
  );
}

function Scratch() {
  const tip = useTip();
  const rows = records<{ lane: string; py_scratch_nonpy: number }>("laneWeaknesses");
  const get = (m: Model, h: Harness) => rows.find((r) => r.lane === `${m}|${h}`)?.py_scratch_nonpy ?? 0;
  const max = 0.4;
  const shade = (v: number) => `color-mix(in srgb, var(--accent) ${Math.round(Math.min(1, v / max) * 85)}%, var(--heat0))`;
  return (
    <Figure
      title="A habit that comes with the harness"
      sub="Share of slots on non-Python repositories that write a Python scratch script."
      caption={<>SWE-agent's prompt calls every task a Python code repository and suggests reproducing the issue with a Python script. Under SWE-agent, {n("pyScratchSweLo")}–{n("pyScratchSweHi")} of slots on non-Python repositories write one for Qwen3-Coder, Nemotron and Gemma-4, against at most {n("pyScratchOther")} in any other harness. gpt-oss is the exception: it rarely writes scratch scripts in any harness.</>}
    >
      <div className="table-scroll">
        <div className="heat" style={{ gridTemplateColumns: `minmax(96px, 130px) repeat(5, minmax(52px, 1fr))`, minWidth: 420 }}>
          <div />
          {HARNESSES.map((h) => <div key={h} className="hd">{HARNESS_LABEL[h]}</div>)}
          {MODELS.map((m) => (
            <Fragment key={m}>
              <div className="rl">{MODEL_LABEL[m]}</div>
              {HARNESSES.map((h) => {
                const v = get(m, h);
                return (
                  <div key={h} className={`cell${isCore(m, h) ? "" : " ext"}`} style={{ background: shade(v), color: v > max / 2 ? "#fff" : "var(--ink)", cursor: "default" }}
                    onMouseMove={(e) => tip.show(e, <TipRows title={`${MODEL_LABEL[m]} × ${HARNESS_LABEL[h]}`} rows={[["Python scratch script, non-Python repo", pct(v, 1)]]} />)} onMouseLeave={tip.hide}>
                    <span className="big">{pct(v, v > 0 && v < 0.01 ? 1 : 0)}</span>
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

function Convergence() {
  const tip = useTip();
  const rows = records<{ pair: string; group: string; file_jaccard: number; pairs: number }>("convergenceCore");
  const lab = (r: { pair: string; group: string }) => r.pair === "same_model" ? `${MODEL_LABEL[r.group as Model]} across harnesses` : `${HARNESS_LABEL[r.group as Harness]} across models`;
  return (
    <Figure
      title="Same files, different code"
      sub="Overlap in edited files (Jaccard) between two successful patches for the same task, by kind of pair (core block)."
      caption={<>When two lanes solve the same task they mostly edit the same files but rarely write the same patch: only {n("convIdenticalCore")} of pairs are byte-identical. Pooled over the core block, same-model pairs (mean Jaccard {n("convModelCore")}) overlap about as much as same-harness pairs ({n("convHarnessCore")}); the per-group means bracket these. Pairs condition on two successes and are not independent, so we read them descriptively.</>}
    >
      <HBar tip={tip} labelW={230} max={1} fmt={(v) => v.toFixed(1)}
        rows={rows.map((r) => ({
          key: r.pair + r.group, label: lab(r), value: r.file_jaccard, valueLabel: r.file_jaccard.toFixed(2),
          color: r.pair === "same_model" ? MODEL_COLOR[r.group as Model] : "var(--c-harness)",
          tip: <TipRows title={lab(r)} rows={[["File Jaccard", r.file_jaccard.toFixed(2)], ["Pairs", r.pairs]]} />,
        }))} />
      {tip.node}
    </Figure>
  );
}

export function Common() {
  const langs = records<{ lang6: string; tasks: number; share_tasks_unsolved: number }>("byLanguage");
  return (
    <section id="common" className="col">
      <div className="rq">Common ground</div>
      <h2>A shared ceiling, and habits that come with a harness</h2>
      <p className="answer">Pairings matter, but within a common ceiling. More than half of the tasks are solved by no lane, and we find no evidence that the interaction differs by language.</p>
      <Ceiling />
      <h3>No evidence that the interaction depends on language</h3>
      <p>
        A permutation test found no evidence that the model × harness pattern differs between
        languages (p = {n("omnibusP")}), nor that the harness ranking does (Holm-adjusted p = {n("omnibusHP")}). With {n("langMinTasks")} to {n("langMaxTasks")} tasks per language
        group, the test can detect only large differences; a non-rejection does not show that the pattern is identical.
      </p>
      <div className="table-scroll">
        <table className="dtable">
          <thead><tr><th>Language</th><th>Tasks</th><th>Unsolved by every lane</th></tr></thead>
          <tbody>{langs.map((l) => <tr key={l.lang6}><td>{l.lang6}</td><td className="n">{l.tasks}</td><td className="n">{pct(l.share_tasks_unsolved)}</td></tr>)}</tbody>
        </table>
      </div>
      <Scratch />
      <p>
        Build and test tools are also often missing from the task containers: under SWE-agent, {n("toolSweGo")} of Go and {n("toolSweRust")} of Rust slots
        hit a "command not found" for one. That is a property of the benchmark environment, reported in the paper's annex.
      </p>
      <Convergence />
      <div className="takeaway">
        <strong>Takeaway.</strong> Whatever the pairing, the studied agents share a ceiling: more than half of the tasks are solved by no lane,
        and we find no evidence that the interaction differs by language.
      </div>
    </section>
  );
}
