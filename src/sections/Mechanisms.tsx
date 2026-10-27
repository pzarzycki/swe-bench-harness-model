import { Fragment, useState } from "react";
import {
  HARNESSES, HARNESS_LABEL, HARNESS_SHORT, Harness, MODELS, MODEL_COLOR, MODEL_LABEL, MODEL_SHORT, Model, excerpt, isCore, n, pct, records,
  splitLane, table,
} from "../data";
import { Figure, Legend, Seg, TipRows, useTip } from "../components/ui";
import { StackedHBar } from "../components/charts";
import { TraceCard } from "../components/TraceCard";

type Scope = "core" | "all";
const laneOrder = (lanes: string[]) => MODELS.flatMap((m) => HARNESSES.map((h) => `${m}|${h}`)).filter((l) => lanes.includes(l));
const LaneLabel = ({ lane }: { lane: string }) => {
  const { model, harness } = splitLane(lane);
  return <tspan><tspan fill={MODEL_COLOR[model]}>■ </tspan>{MODEL_SHORT[model]} · {HARNESS_SHORT[harness]}{isCore(model, harness) ? "" : "*"}</tspan>;
};

const REPLY: [string, string, string][] = [
  ["action", "Takes an action", "var(--r-action)"],
  ["prose_stop", "Prose (plan, announcement, question)", "var(--r-prose)"],
  ["text_tool_call", "Tool call written as text", "var(--r-text)"],
  ["silent", "Silent or protocol failure", "var(--r-silent)"],
];

function FirstReply() {
  const tip = useTip();
  const [scope, setScope] = useState<Scope>("core");
  const rows = records<Record<string, number | string>>("firstReply");
  const lanes = laneOrder(rows.map((r) => String(r.lane))).filter((l) => scope === "all" || isCore(splitLane(l).model, splitLane(l).harness));
  return (
    <Figure
      title="What the first reply contains"
      sub="Share of each lane's slots, by the content of the agent's first main reply."
      controls={<Seg label="Lanes" value={scope} onChange={setScope} options={[["core", "Core block"], ["all", "All 20 lanes"]]} />}
      caption={<>Nemotron's first reply takes an action in only <b>{n("pOneCodex")}</b> of its Codex CLI slots and <b>{n("pOneOpencode")}</b> of its OpenCode slots, against {n("pOneMini")} and {n("pOneSwe")} under mini-SWE-agent and SWE-agent. Under mini-SWE-agent's text protocol, <b>{n("pTwoMini")}</b> of gpt-oss's first replies contain no command, against {n("pTwoSwe")} under SWE-agent's function calls. * extension lane.</>}
    >
      <Legend items={REPLY.map(([, l, c]) => [c, l])} />
      <StackedHBar tip={tip} labelW={150}
        rows={lanes.map((l) => {
          const r = rows.find((x) => x.lane === l)!;
          const v = (k: string) => Number(r[k]) + (k === "silent" ? Number(r.protocol_multi_block) : 0);
          return {
            key: l, label: <LaneLabel lane={l} />,
            segments: REPLY.map(([k, , c]) => ({ key: k, value: v(k), color: c })), total: " ",
            tip: <TipRows title={`${MODEL_LABEL[splitLane(l).model]} × ${HARNESS_LABEL[splitLane(l).harness]}`} rows={REPLY.map(([k, lab]) => [lab, pct(v(k))] as [string, string])} />,
          };
        })} />
      {tip.node}
    </Figure>
  );
}

const END_GROUPS: [string, string, string[], string][] = [
  ["prose", "Prose reply ended the run", ["prose_stop"], "var(--r-prose)"],
  ["text", "Tool call written as text", ["text_tool_call"], "var(--r-text)"],
  ["proto", "Protocol failure or silent", ["protocol:mini_no_block", "protocol_collapse", "protocol:bad_args", "silent", "unoffered_only"], "var(--r-silent)"],
  ["early", "Stopped before editing", ["stopped_before_edit"], "var(--desc-c)"],
  ["edits", "Edits rejected, reverted or scratch only", ["edit_rejected", "edited_reverted", "edited_scratch_only"], "var(--m-gemma)"],
  ["failed", "Patch failed the tests", ["patch_failed"], "var(--c-model)"],
  ["budget", "Time budget or loop", ["budget", "loop"], "var(--pro)"],
  ["other", "Other or not captured", ["not_captured", "other_outcome"], "var(--neither)"],
];

function Endings() {
  const tip = useTip();
  const [scope, setScope] = useState<Scope>("core");
  const rows = records<Record<string, number | string>>("endings");
  const lanes = laneOrder(rows.map((r) => String(r.lane))).filter((l) => scope === "all" || isCore(splitLane(l).model, splitLane(l).harness));
  return (
    <Figure
      title="How the runs that did not succeed end"
      sub="Share of each lane's non-successes, by the last thing that happened."
      controls={<Seg label="Lanes" value={scope} onChange={setScope} options={[["core", "Core block"], ["all", "All 20 lanes"]]} />}
      caption={<>A prose stop ends <b>{n("outcNemoOpenProse")}</b> of Nemotron's non-successes under OpenCode and {n("outcNemoCodexProse")} under Codex CLI. A prose stop cannot end a mini-SWE-agent or SWE-agent run, and none does. Replies without a command block end {n("outcGptMiniNoBlock")} of gpt-oss's mini-SWE-agent non-successes. For Gemma-4 (extension), the time budget and loops account for up to {n("outcGemmaBudgetHi")} and {n("outcGemmaLoopHi")}.</>}
    >
      <Legend items={END_GROUPS.map(([, l, , c]) => [c, l])} />
      <StackedHBar tip={tip} labelW={150}
        rows={lanes.map((l) => {
          const r = rows.find((x) => x.lane === l)!;
          const keys = Object.keys(r).filter((k) => k !== "cohort" && k !== "lane");
          const tot = keys.reduce((a, k) => a + Number(r[k]), 0);
          const g = END_GROUPS.map(([k, lab, ks, c]) => ({ key: k, lab, value: ks.reduce((a, x) => a + Number(r[x] ?? 0), 0) / tot, color: c }));
          return {
            key: l, label: <LaneLabel lane={l} />, segments: g, total: `${tot}`,
            tip: <TipRows title={`${MODEL_LABEL[splitLane(l).model]} × ${HARNESS_LABEL[splitLane(l).harness]}`} rows={g.filter((x) => x.value > 0).map((x) => [x.lab, pct(x.value)] as [string, string])} note={`${tot} non-successes`} />,
          };
        })} />
      <div className="note">Number at the bar end: the lane's non-successes.</div>
      {tip.node}
    </Figure>
  );
}

const VOCAB: [string, string, string][] = [
  ["swe_openhands", "SWE-agent / OpenHands names", "var(--c-model)"],
  ["cline_roo", "Cline / Roo names", "var(--r-text)"],
  ["codex", "Codex names", "var(--c-harness)"],
  ["claude_code_opencode", "Claude Code / OpenCode names", "var(--r-silent)"],
  ["generic", "Generic names", "var(--desc-c)"],
];

function Leakage() {
  const tip = useTip();
  const rows = records<Record<string, number | string>>("leakage");
  const names = records<{ lane: string; intended: string; n: number }>("leakageNames");
  const lanes = laneOrder(rows.map((r) => String(r.lane)));
  return (
    <Figure
      title="Calls to tools the harness never offered, by whose vocabulary they use"
      sub="Unoffered tool calls by the vocabulary their names come from. Share of each lane's unoffered calls."
      caption={<>Under Codex CLI, <b>{n("pFive")}</b> of Nemotron's unoffered calls use SWE-agent or OpenHands names such as <code>str_replace_editor</code> and <code>finish</code>, and another {n("pFiveCline")} use Cline names. Codex never prompts these names; they are consistent with Nemotron's training on OpenHands and SWE-agent trajectories, as its model card describes. The Codex names have a different explanation: <b>{n("pSix")}</b> of gpt-oss's unoffered calls (and most of Qwen's) use Codex's own names; {n("gptApplyPatch")} of gpt-oss's are <code>apply_patch</code>. Codex CLI's recorded system prompt tells the model to use that tool, but its menu offered it in only {n("nCodexPatchMenu")} slots. These calls reflect that prompt–menu mismatch and do not establish a training habit. Hover a bar for the most frequent names.</>}
    >
      <Legend items={VOCAB.map(([, l, c]) => [c, l])} />
      <StackedHBar tip={tip} labelW={150}
        rows={lanes.map((l) => {
          const r = rows.find((x) => x.lane === l)!;
          const top = names.filter((x) => x.lane === l).sort((a, b) => b.n - a.n).slice(0, 5);
          return {
            key: l, label: <LaneLabel lane={l} />, total: `${r.n_unoffered}`,
            segments: VOCAB.map(([k, , c]) => ({ key: k, value: Number(r[k]), color: c })),
            tip: <TipRows title={`${MODEL_LABEL[splitLane(l).model]} × ${HARNESS_LABEL[splitLane(l).harness]}`}
              rows={[...top.map((x) => [x.intended, x.n] as [string, number]), ["next call unoffered again", pct(Number(r.p_next_unoffered))]]} note={`${r.n_unoffered} unoffered calls`} />,
          };
        })} />
      <div className="note">Number at the bar end: unoffered calls in the lane.</div>
      {tip.node}
    </Figure>
  );
}

const RECOVERY: [string, string][] = [["verbatim_repeat", "Repeats it verbatim"], ["revised_retry", "Retries, revised"], ["switch", "Switches action"], ["stop", "Stops"], ["protocol_next", "Protocol failure next"]];

function Recovery() {
  const tip = useTip();
  const [k, setK] = useState("verbatim_repeat");
  const rows = records<Record<string, number | string>>("recovery");
  const get = (m: Model, h: Harness) => rows.find((r) => r.lane === `${m}|${h}`);
  const max = Math.max(...rows.map((r) => Number(r[k])));
  const shade = (v: number) => `color-mix(in srgb, var(--heat1) ${Math.round((v / (max || 1)) * 88)}%, var(--heat0))`;
  return (
    <Figure
      title="What follows a failed action"
      sub="Share of failed actions (of any class) followed by each kind of next action."
      controls={<Seg label="Next action" value={k} onChange={setK} options={RECOVERY.map(([a, b]) => [a, b] as [string, string])} />}
      caption={<>The grid counts repeats after any failed action. Qwen3-Coder almost never repeats one verbatim, in any harness. After a failed <i>edit</i>, Gemma-4 (extension) submits the identical edit again in {n("pThreeLo")}–{n("pThreeHi")} of cases under the harnesses we had grouped as exact-match editors, against {n("pThreeMini")} under mini-SWE-agent. That pattern does not establish an exact-match-editor explanation: Gemma repeats nearly as often under Codex CLI, which edits through the shell ({n("gemmaAdapterCodex")} on slots captured by the adapter).</>}
    >
      <div className="table-scroll">
        <div className="heat" style={{ gridTemplateColumns: `minmax(96px, 130px) repeat(5, minmax(52px, 1fr))`, minWidth: 420 }}>
          <div />
          {HARNESSES.map((h) => <div key={h} className="hd">{HARNESS_LABEL[h]}</div>)}
          {MODELS.map((m) => (
            <Fragment key={m}>
              <div className="rl">{MODEL_LABEL[m]}</div>
              {HARNESSES.map((h) => {
                const r = get(m, h);
                if (!r) return <div key={h} className="cell" style={{ background: "var(--panel)", cursor: "default" }}><span className="sm">no failures</span></div>;
                const v = Number(r[k]);
                return (
                  <div key={h} className={`cell${isCore(m, h) ? "" : " ext"}`} style={{ background: shade(v), color: v / (max || 1) > 0.5 ? "#fff" : "var(--ink)", cursor: "default" }}
                    onMouseMove={(e) => tip.show(e, <TipRows title={`${MODEL_LABEL[m]} × ${HARNESS_LABEL[h]}`} rows={[...RECOVERY.map(([a, b]) => [b, pct(Number(r[a]), 1)] as [string, string]), ["Failed actions", Number(r.n_failed).toLocaleString("en-US")]]} />)} onMouseLeave={tip.hide}>
                    <span className="big">{pct(v)}</span><span className="sm">of {Number(r.n_failed).toLocaleString("en-US")}</span>
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

function Predictions() {
  const t = table("predictions");
  const ci = (c: string) => t.columns.indexOf(c);
  return (
    <div className="table-scroll" style={{ margin: "20px 0" }}>
      <table className="dtable">
        <thead><tr><th>Prediction</th><th>Verdict</th><th>Evidence</th></tr></thead>
        <tbody>{t.rows.map((r) => (
          <tr key={r[0]}>
            <td style={{ fontWeight: 600, color: "var(--head)" }}>{r[ci("prediction")]}</td>
            <td><span className={`tier ${/^confirmed/.test(r[ci("verdict")]) ? "c" : /signature/.test(r[ci("verdict")]) ? "u" : ""}`}>{r[ci("verdict")].replace(/\s*\(.*\)/, "")}</span></td>
            <td>{r[ci("evidence")]}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export function Mechanisms() {
  return (
    <section id="mechanisms" className="col">
      <div className="rq">Failure patterns</div>
      <h2>Mis-pairings leave signatures in the trajectories</h2>
      <p className="answer">Some runs stop on a prose reply, some write tool calls as text, and some repeatedly call tools outside the offered menu. The trajectories show how these failures line up with the harness design.</p>
      <p>
        These are exploratory explanations consistent with the observed traces. The study did not change individual
        harness features to establish their causal effects.
        {" "}<span className="tier">exploratory</span>
      </p>

      <h3>The first reply matters</h3>
      <p>
        Codex CLI, OpenCode and the DeepSeek harness end a run at the first reply that contains no tool call; mini-SWE-agent
        and SWE-agent wait for an explicit submit. A model that narrates before it acts, or writes its tool call into the
        text, meets that stopping rule on turn one.
      </p>
      <FirstReply />
      <p>
        Under Codex CLI many of Nemotron's non-acting first replies are not prose but tool calls written as text: of
        the {n("ttNemoCodexN")} such replies, {n("ttPlanJson")} are the arguments of Codex's plan tool (an explanation and a list of steps).
        Counted as actions, its first-reply action share under Codex CLI would rise to {n("ttCodexFirst")}. gpt-oss fails differently:
        it writes tool calls in a separate Harmony output channel, which a fenced-text protocol never reads.
      </p>
      <div className="traces">
        <TraceCard e={excerpt("plan-as-text")} />
        <TraceCard e={excerpt("prose-stop")} />
        <TraceCard e={excerpt("reasoning-only")} />
      </div>
      <Endings />

      <h3>Tool names from training scaffolds, and from the harness's own prompt</h3>
      <p>
        Calls to unoffered tools can resemble names from a model's training scaffolds or names requested by the harness's
        own prompt. Models also differ in whether they adapt after the refusal: after an unoffered call, Nemotron's next call
        under Codex CLI is again unoffered in {n("adaptNemoCodex")} of cases, Qwen3-Coder's in {n("adaptQwenCodex")}.
      </p>
      <Leakage />
      <p className="note">
        Our initial interpretation of the unoffered <code>apply_patch</code> calls as a training prior is withdrawn:
        Codex CLI's own prompt asks for the tool while its menu usually omits it. The prompt–menu mismatch is visible
        in the recorded integration.
      </p>
      <div className="traces">
        <TraceCard e={excerpt("unoffered-editor")} />
        <TraceCard e={excerpt("apply-patch")} />
        <TraceCard e={excerpt("channel-token")} />
      </div>

      <h3>Repair after failure</h3>
      <Recovery />
      <p>
        At least some repeats are not lost feedback. In an inspected case the rejection text was in Gemma's next input and it
        resubmitted the same edit. A revised hypothesis, which these data cannot test: Gemma uses feedback that arrives as plain
        user text (as in mini-SWE-agent) but not feedback in tool-result messages. Every function-calling harness returns
        results as tool messages (at least {n("toolRoleShare")} of them), so the channel moves together with the protocol.
      </p>
      <details className="evidence">
        <summary>Evidence and methods: prediction checks and interpretation changes</summary>
        <p>
          We registered these case-pattern predictions before running this stage. All but P7 restate patterns already
          seen during exploration, so their registration does not make them independent discoveries. Each check names
          combinations where a pattern should appear and where it should not. With four models and five harnesses,
          these checks do not establish causal effects of architecture.
        </p>
        <Predictions />
        <p className="note">P6's pattern holds, but its mechanism reading (a training prior for Codex's tool names) is withdrawn: Codex CLI's own system prompt asks for <code>apply_patch</code>, which its menu mostly lacked, so the calls are a prompt–menu mismatch in the integration. P5 (Nemotron's SWE-agent, OpenHands and Cline names, which no harness prompts) stands.</p>
        <p className="note">P7 expected that offering <code>apply_patch</code> in Codex CLI would remove unoffered <code>apply_patch</code> calls. It holds by construction, since an offered tool cannot be unoffered, so it is uninformative. In the {n("nCodexPatchMenu")} slots whose menu offered it, the share of acting first replies did not differ detectably.</p>
      </details>
      <div className="takeaway">
        <strong>Takeaway.</strong> Mis-pairings leave signatures that are consistent with concrete design facts: a stopping rule meets a model that
        narrates or writes its tool calls as text; a text protocol meets a model whose actions live in a separate channel; a tool menu meets a
        model trained on other scaffolds, whose tool names it keeps calling. One apparent model trait, calling <code>apply_patch</code> under
        Codex CLI, turned out to be the harness contradicting itself.
      </div>
    </section>
  );
}
