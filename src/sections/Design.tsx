import { useState } from "react";
import { HARNESSES, HARNESS_LABEL, Harness, MODELS, MODEL_COLOR, MODEL_FULL, n, table } from "../data";
import { Figure } from "../components/ui";

const rowOf = (key: string, first: string) => {
  const t = table(key);
  const r = t.rows.find((x) => x[0] === first);
  if (!r) throw new Error(`no row ${first} in ${key}`);
  return Object.fromEntries(t.columns.map((c, i) => [c, r[i]]));
};

const ROLE: Record<Harness, string> = {
  "mini-swe-agent": "one fenced shell command per reply",
  "swe-agent": "three tools; runs until submit",
  "codex-cli": "stops at a reply with no tool call",
  "opencode-cli": "stops at a reply with no tool call",
  "deepseek-harness": "25 tools; first call forced (ext.)",
};

function Models() {
  return (
    <div className="stats" style={{ margin: "18px 0" }}>
      {MODELS.map((m) => {
        const r = rowOf("models", m);
        return (
          <div key={m} className="stat" style={{ borderTop: `3px solid ${MODEL_COLOR[m]}` }}>
            <div style={{ fontWeight: 600, color: "var(--head)", fontSize: 15 }}>{MODEL_FULL[m]}{m === "gemma-4-26b-a4b" && <span className="flag"> · ext.</span>}</div>
            <div className="l" style={{ marginTop: 4 }}>
              {r["Total / active parameters"].replace(/\s*\(.*\)/, "")} parameters<br />
              {r["Experts"]} experts · {r["Context"]} context
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Harnesses() {
  const [h, setH] = useState<Harness>("codex-cli");
  const a = rowOf("harnessArch", h), v = rowOf("harnessVersions", h);
  return (
    <Figure title="Five harnesses, five designs" sub="Pick a harness. Each ran pinned, with upstream defaults: no prompt, tool, step or token overrides.">
      <div className="hcards" role="group" aria-label="Harness">
        {HARNESSES.map((x) => (
          <button key={x} className="hcard" aria-pressed={x === h} onClick={() => setH(x)}>
            <b>{HARNESS_LABEL[x]}</b><span>{ROLE[x]}</span>
          </button>
        ))}
      </div>
      <dl className="kv">
        <dt>Version</dt><dd><code>{v["Version"]}</code></dd>
        <dt>Action protocol</dt><dd>{v["Action protocol"]}</dd>
        <dt>Run ends when</dt><dd>{a["Run ends when"]}</dd>
        <dt>Tools offered</dt><dd>{a["Tools offered"]}</dd>
        <dt>Editing</dt><dd>{a["Editing"]}</dd>
        <dt>Prompted workflow</dt><dd>{a["Prompted workflow"]}</dd>
      </dl>
    </Figure>
  );
}

export function Design() {
  const cohorts = table("cohorts");
  const cohortColumns = cohorts.columns
    .map((label, index) => ({ label, index }))
    .filter(({ label }) => label !== "Lock" && label !== "Run date");
  return (
    <section id="design" className="col">
      <h2>The setup</h2>
      <p>
        The four models are compact mixture-of-experts models: {n("moeTotalLo")}–{n("moeTotalHi")}B parameters in total,
        {" "}{n("moeActiveLo")}–{n("moeActiveHi")}B active per token. Each model works inside a harness that supplies
        its tools, prompts and stopping rules.
      </p>
      <p>
        The tasks are the {n("nTasks")} issues of SWE-bench-Live's multi-language Linux split, from {n("nRepos")} repositories,
        frozen at revision <code>{n("benchRevision")}</code>. Every lane gets all {n("nTasks")}; the benchmark assigns them. A slot succeeds
        when at least one fail-to-pass test passes and no test is observed failing. The agent has {n("agentDeadline")} seconds.
      </p>
      <h3>The core comparison and its extensions</h3>
      <p>
        The grid was run in three cohorts. The <strong>core block</strong> (three models × four harnesses, {n("nCoreSlots")} slots)
        ran as one factorial on one serving route and supports the main statistical comparisons. Two extensions are
        shown throughout and interpreted separately:
      </p>
      <ul className="clean">
        <li><b>The DeepSeek harness column</b> ({n("nDshSlots")} slots) was run separately, with a variant that forces a tool call in the first reply.</li>
        <li><b>Gemma-4</b> ({n("nGemmaSlots")} slots) ran on another provider route, much slower under the function-calling harnesses, with its own grading budget. Its results hold under that time budget only.</li>
      </ul>
      <details className="evidence">
        <summary>Study details: models, harnesses and measurement</summary>
        <Models />
        <Harnesses />
        <div className="table-scroll">
          <table className="dtable">
            <thead><tr>{cohortColumns.map(({ label }) => <th key={label}>{label}</th>)}</tr></thead>
            <tbody>{cohorts.rows.map((r) => <tr key={r[0]}>{cohortColumns.map(({ label, index }) => <td key={label} className={label === "Slots" ? "n" : undefined}>{r[index]}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <div className="callout neutral">
          <p><b>How behaviour is measured.</b> A deterministic classifier labels each of the {n("nActions")} actions (edit, test, build, search,
            read, explore, plan, protocol failure, unoffered tool …) and each first reply. On a held-out set labelled
            blind by two model coders it scores {n("valHoldCls")} on action class ({n("valHoldClsW")} reweighted to the population mix);
            a first, independent human pass agreed {n("valPiFirst")}. Its run class (precision {n("valRunPrec")}) is never compared across harnesses.</p>
        </div>
      </details>
    </section>
  );
}
