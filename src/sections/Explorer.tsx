import { Fragment, useMemo, useState } from "react";
import {
  HARNESSES, HARNESS_LABEL, HARNESS_SHORT, Harness, MODELS, MODEL_COLOR, MODEL_LABEL, MODEL_SHORT, Model, COHORT_LABEL, cohortOf, isCore,
  pct, records, slots,
} from "../data";
import { Figure } from "../components/ui";

const laneIdx = (m: string, h: string) => slots.lanes.findIndex((l) => l.model === m && l.harness === h);
const mismatch = new Set(slots.mismatch.map(([i, j]) => `${i}:${j}`));

// coarse reply classes only: the fine subtypes (announce, plan, question) are not compared (validation use rules)
const COARSE: Record<string, [string, string]> = {
  action: ["action", "Takes an action"], prose: ["prose", "Prose"], announce: ["prose", "Prose"], plan: ["prose", "Prose"],
  question: ["prose", "Prose"], text_tool_call: ["text", "Tool call as text"], reasoning_only: ["silent", "Silent or protocol"],
  empty: ["silent", "Silent or protocol"], protocol_multi_block: ["silent", "Silent or protocol"],
};
const COARSE_COLOR: Record<string, string> = { action: "var(--r-action)", prose: "var(--r-prose)", text: "var(--r-text)", silent: "var(--r-silent)" };
const OUT: Record<string, [string, string]> = {
  s: ["Success", "var(--o-success)"], f: ["Patch, tests fail", "var(--o-failure)"], e: ["No patch", "var(--o-empty)"], x: ["Censored or not graded", "var(--o-other)"],
};
const ENDING: Record<string, string> = {
  budget: "Time budget", loop: "Loop", edit_rejected: "Edit rejected", edited_reverted: "Edits reverted", edited_scratch_only: "Scratch files only",
  not_captured: "Not captured", other_outcome: "Other outcome", patch_failed: "Patch failed tests", prose_stop: "Prose reply ended the run",
  "protocol:bad_args": "Protocol: bad arguments", "protocol:mini_no_block": "Protocol: no command block", protocol_collapse: "Protocol collapse",
  silent: "Silent", stopped_before_edit: "Stopped before editing", text_tool_call: "Tool call written as text", unoffered_only: "Unoffered tools only",
};

function Bar({ parts }: { parts: { k: string; v: number; c: string; l: string }[] }) {
  const tot = parts.reduce((a, p) => a + p.v, 0) || 1;
  return (
    <>
      <div className="minibar">{parts.filter((p) => p.v > 0).map((p) => <i key={p.k} title={`${p.l}: ${p.v}`} style={{ width: `${(p.v / tot) * 100}%`, background: p.c }} />)}</div>
      <div className="legend" style={{ marginTop: 6 }}>{parts.filter((p) => p.v > 0).map((p) => <span key={p.k}><i className="sw" style={{ background: p.c }} />{p.l} {p.v}</span>)}</div>
    </>
  );
}

function LaneProfile({ m, h }: { m: Model; h: Harness }) {
  const j = laneIdx(m, h);
  const funnel = records<{ model_id: string; harness_family: string; acted: number; edited: number; patch: number; success: number }>("funnel").find((r) => r.model_id === m && r.harness_family === h)!;
  const leak = records<Record<string, number | string>>("leakage").find((r) => r.lane === `${m}|${h}`);
  const rec = records<Record<string, number | string>>("recovery").find((r) => r.lane === `${m}|${h}`);
  const frag = records<{ cohort: string; model: string; harness: string; trigger: string; trigger_name: string; slot_share: number; forgiveness: number | null }>("fragilityLedger")
    .filter((r) => r.model === m && r.harness === h && r.slot_share >= 0.1).sort((a, b) => b.slot_share - a.slot_share);
  const stats = useMemo(() => {
    const o: Record<string, number> = { s: 0, f: 0, e: 0, x: 0 };
    const fr: Record<string, number> = {};
    const en: Record<string, number> = {};
    const acts: number[] = [];
    slots.tasks.forEach((_, i) => {
      o[slots.outcome[i][j]]++;
      const f = slots.first[i][j];
      if (f >= 0) { const c = COARSE[slots.firstClasses[f]][0]; fr[c] = (fr[c] ?? 0) + 1; }
      const e = slots.ending[i][j];
      if (e >= 0 && !mismatch.has(`${i}:${j}`)) { const k = slots.endingClasses[e]; en[k] = (en[k] ?? 0) + 1; }
      if (slots.actions[i][j] >= 0) acts.push(slots.actions[i][j]);
    });
    acts.sort((a, b) => a - b);
    return { o, fr, en, median: acts.length ? acts[Math.floor(acts.length / 2)] : 0 };
  }, [j]);
  const endings = Object.entries(stats.en).sort((a, b) => b[1] - a[1]);
  const totEnd = endings.reduce((a, [, v]) => a + v, 0);
  return (
    <div className="profile">
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}><span style={{ color: MODEL_COLOR[m] }}>■</span> {MODEL_LABEL[m]} × {HARNESS_LABEL[h]}</h3>
        <span className={`tier${isCore(m, h) ? " c" : ""}`}>{COHORT_LABEL[cohortOf(m, h)]}</span>
      </div>
      <h4 style={{ marginTop: 14 }}>Outcomes of the 413 slots</h4>
      <Bar parts={(["s", "f", "e", "x"] as const).map((k) => ({ k, v: stats.o[k], c: OUT[k][1], l: OUT[k][0] }))} />
      <h4>Funnel</h4>
      <div className="rowlist">
        {(["acted", "edited", "patch", "success"] as const).map((k) => (
          <div key={k} className="r"><span>{{ acted: "Acted at all", edited: "Edited a file", patch: "Produced a patch", success: "Solved" }[k]}</span>
            <span className="minibar" style={{ height: 10 }}><i style={{ width: `${funnel[k] * 100}%`, background: MODEL_COLOR[m] }} /></span><span>{pct(funnel[k])}</span></div>
        ))}
      </div>
      <h4>First reply</h4>
      <Bar parts={(["action", "prose", "text", "silent"] as const).map((k) => ({ k, v: stats.fr[k] ?? 0, c: COARSE_COLOR[k], l: { action: "Action", prose: "Prose", text: "Tool call as text", silent: "Silent or protocol" }[k] }))} />
      <h4>How the non-successes end</h4>
      <div className="rowlist">
        {endings.slice(0, 6).map(([k, v]) => (
          <div key={k} className="r"><span>{ENDING[k] ?? k}</span><span className="minibar" style={{ height: 10 }}><i style={{ width: `${(v / totEnd) * 100}%`, background: "var(--c-model)" }} /></span><span>{pct(v / totEnd)}</span></div>
        ))}
      </div>
      <h4>Habits</h4>
      <ul className="clean" style={{ fontSize: 14, margin: 0 }}>
        <li>Median of {stats.median} actions per slot.</li>
        {leak ? <li>{Number(leak.n_unoffered).toLocaleString("en-US")} calls to tools the harness never offered; after one, the next call is unoffered again in {pct(Number(leak.p_next_unoffered))} of cases.</li>
          : <li>Few or no calls to unoffered tools.</li>}
        {rec && <li>After a failed action: verbatim repeat {pct(Number(rec.verbatim_repeat))}, revised retry {pct(Number(rec.revised_retry))}, switch {pct(Number(rec.switch))} (of {Number(rec.n_failed).toLocaleString("en-US")} failures).</li>}
        {frag.map((f) => <li key={f.trigger}>Trigger point {f.trigger}, {f.trigger_name}: hit in {pct(f.slot_share)} of slots{f.forgiveness === null ? "" : `, recovered after ${pct(f.forgiveness)}`}.</li>)}
      </ul>
    </div>
  );
}

function LaneExplorer() {
  const [sel, setSel] = useState<[Model, Harness]>(["nemotron-nano-3-30b", "codex-cli"]);
  return (
    <Figure wide title="Lane explorer" sub="Pick any of the 20 lanes for its profile: outcomes, funnel, first replies, endings and habits.">
      <div className="explorer">
        <div>
          <div className="heat" style={{ gridTemplateColumns: "74px repeat(5, minmax(0, 1fr))", gap: 3 }}>
            <div />
            {HARNESSES.map((h) => <div key={h} className="hd" style={{ fontSize: 10.5 }}>{HARNESS_SHORT[h]}</div>)}
            {MODELS.map((m) => (
              <Fragment key={m}>
                <div className="rl" style={{ fontSize: 11.5 }}>{MODEL_SHORT[m]}</div>
                {HARNESSES.map((h) => {
                  const j = laneIdx(m, h);
                  const s = slots.outcome.reduce((a, o) => a + (o[j] === "s" ? 1 : 0), 0);
                  const on = sel[0] === m && sel[1] === h;
                  return (
                    <button key={h} className={`cell${on ? " on" : ""}${isCore(m, h) ? "" : " ext"}`} onClick={() => setSel([m, h])} aria-pressed={on}
                      aria-label={`${MODEL_LABEL[m]} × ${HARNESS_LABEL[h]}: ${s} successes`}
                      style={{ background: `color-mix(in srgb, ${MODEL_COLOR[m]} ${Math.round((s / 110) * 62) + 6}%, var(--heat0))`, color: "var(--head)", padding: "6px 2px" }}>
                      <span className="big" style={{ fontSize: 15 }}>{s}</span>
                    </button>
                  );
                })}
              </Fragment>
            ))}
          </div>
          <p className="note" style={{ marginTop: 10 }}>Cell: successes of 413. Hatched: extension lane (separate run; compare with care).</p>
        </div>
        <LaneProfile m={sel[0]} h={sel[1]} />
      </div>
    </Figure>
  );
}

function TaskExplorer() {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(slots.tasks.findIndex((t) => t.id === "AutoMQ__automq-2699"));
  const solved = useMemo(() => slots.outcome.map((o) => [...o].filter((c) => c === "s").length), []);
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    return slots.tasks.map((t, i) => ({ t, i })).filter(({ t }) => !s || t.id.toLowerCase().includes(s) || t.language.toLowerCase() === s || t.repo.toLowerCase().includes(s)).slice(0, 80);
  }, [q]);
  const t = slots.tasks[sel];
  const pr = t.id.match(/-(\d+)$/)?.[1];
  return (
    <Figure wide title="Task explorer" sub="Search the 413 tasks by repository, instance id or language, and see what all 20 lanes did on one of them.">
      <div className="explorer">
        <div>
          <input className="search" placeholder="Search, e.g. rust, mongoose, kubernetes" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tasks" />
          <div className="tasklist" role="listbox" aria-label="Tasks">
            {hits.map(({ t: x, i }) => (
              <button key={x.id} className={i === sel ? "on" : undefined} onClick={() => setSel(i)} role="option" aria-selected={i === sel}>
                <span>{x.id.replace("__", "/")}</span><span className="mono">{solved[i]}/20</span>
              </button>
            ))}
            {hits.length === 0 && <div className="note" style={{ padding: 10 }}>No task matches.</div>}
          </div>
          <p className="note" style={{ marginTop: 6 }}>Right: lanes solving the task, of 20.</p>
        </div>
        <div>
          <h3 style={{ margin: "0 0 4px" }}>{t.id.replace("__", "/")}</h3>
          <div className="note">
            {t.language} · created {t.created} · gold patch {t.goldFiles} file{t.goldFiles === 1 ? "" : "s"}, {t.goldLines} lines · solved by {solved[sel]} of 20 lanes
            {pr && <> · <a href={`https://github.com/${t.repo}/pull/${pr}`} target="_blank" rel="noreferrer">pull request ↗</a></>}
          </div>
          <div className="strip" style={{ marginTop: 12 }}>
            <div />
            {HARNESSES.map((h) => <div key={h} className="hd" style={{ fontSize: 11, color: "var(--muted)", textAlign: "center" }}>{HARNESS_SHORT[h]}</div>)}
            {MODELS.map((m) => (
              <Fragment key={m}>
                <div style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}><i className="sw" style={{ background: MODEL_COLOR[m] }} />{MODEL_LABEL[m]}</div>
                {HARNESSES.map((h) => {
                  const j = laneIdx(m, h);
                  const o = slots.outcome[sel][j];
                  const f = slots.first[sel][j], e = slots.ending[sel][j], a = slots.actions[sel][j];
                  const fl = f >= 0 ? COARSE[slots.firstClasses[f]][1] : "–";
                  const el = o === "s" ? "solved" : e >= 0 ? ENDING[slots.endingClasses[e]] ?? slots.endingClasses[e] : "–";
                  return (
                    <div key={h} className="sc" style={{ background: OUT[o][1], color: o === "s" || o === "f" ? "#fff" : "var(--ink)" }}
                      title={`${MODEL_LABEL[m]} × ${HARNESS_LABEL[h]}\n${OUT[o][0]}\nfirst reply: ${fl}\nending: ${el}\nactions: ${a}${mismatch.has(`${sel}:${j}`) ? "\n(attempt-identity mismatch)" : ""}`}>
                      <b>{OUT[o][0].split(",")[0]}</b><small>{el}</small><small>{a >= 0 ? `${a} actions` : ""}</small>
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
          <p className="note" style={{ marginTop: 8 }}>Hover a cell for the first-reply class. DSH column and Gemma-4 row are extension lanes.</p>
        </div>
      </div>
    </Figure>
  );
}

export function Explorer() {
  return (
    <section id="explorer" className="wide">
      <div className="col">
        <div className="rq">Explore</div>
        <h2>Every lane, every task</h2>
        <p className="answer">The slot-level data behind the figures above: pick a pairing for its profile, or a task to see what each pairing did with it.</p>
      </div>
      <LaneExplorer />
      <TaskExplorer />
    </section>
  );
}
