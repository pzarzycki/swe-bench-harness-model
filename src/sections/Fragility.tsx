import { useState } from "react";
import { CORE_HARNESSES, CORE_MODELS, HARNESS_LABEL, Harness, MODEL_COLOR, MODEL_LABEL, MODEL_SHORT, Model, n, pct, records } from "../data";
import { Figure, Legend, Seg, TipRows, useTip } from "../components/ui";

interface Cls { harness: Harness; trigger: string; trigger_name: string; qwen_share: number; nemotron_share: number; gptoss_share: number; class: string }
interface Led { cohort: string; model: Model; harness: Harness; trigger: string; slots: number; slot_share: number; events_per_slot: number; forgiveness: number | null; trigger_name: string }

const CLASS: Record<string, [string, string]> = {
  universal: ["Universal", "even Qwen3-Coder trips on it (≥ 20% of its slots)"],
  "tolerance-dependent": ["Tolerance-dependent", "Qwen3-Coder avoids it (≤ 5%), another model trips on it (≥ 20%)"],
  intermediate: ["Intermediate", "neither pattern"],
};
const CLASS_COLOR: Record<string, string> = { universal: "var(--pro)", "tolerance-dependent": "var(--c-model)", intermediate: "var(--faint)" };

function Bars({ led, metric }: { led: Led[]; metric: "slot_share" | "forgiveness" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 8 }}>
      {CORE_MODELS.map((m) => {
        const r = led.find((x) => x.model === m);
        const v = r ? r[metric] : null;
        return (
          <div key={m} style={{ display: "grid", gridTemplateColumns: "64px 1fr 40px", gap: 6, alignItems: "center", fontSize: 11.5 }}>
            <span style={{ color: "var(--muted)" }}>{MODEL_SHORT[m]}</span>
            <span style={{ background: "var(--o-empty)", borderRadius: 3, height: 9, overflow: "hidden" }}>
              {v !== null && v !== undefined && <i style={{ display: "block", height: "100%", width: `${Math.max(1, v * 100)}%`, background: MODEL_COLOR[m] }} />}
            </span>
            <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{v === null || v === undefined ? "–" : pct(v)}</span>
          </div>
        );
      })}
    </div>
  );
}

function Ledger() {
  const tip = useTip();
  const [metric, setMetric] = useState<"slot_share" | "forgiveness">("slot_share");
  const ledger = records<Led>("fragilityLedger");
  const classes = records<Cls>("fragilityClassification");
  return (
    <Figure wide
      title="A ledger of harness trigger points"
      sub="Each card is a harness design point that some core model trips on in at least 10% of its slots. Bars: share of each model's slots that hit it, or how often the model is back on track within three actions."
      controls={<Seg label="Bars" value={metric} onChange={setMetric} options={[["slot_share", "Slots that hit it"], ["forgiveness", "Recovered within 3 actions"]]} />}
      caption={<>Only <b>{n("fhTol")} of {n("fhN")}</b> trigger points are tolerance-dependent, while <b>{n("fhUniv")}</b> are universal: even Qwen3-Coder trips on them. At the Codex CLI tool menu, the one universal point where the models recover differently, Qwen3-Coder's advantage lies more in recovering than in avoiding (exploratory). It calls an unoffered tool in {n("fragQwenCodexUnoff")} of its slots, more than either other model, most of them the <code>apply_patch</code> its prompt asks for, and is back on track after {n("forgQwenCodexUnoff")} of those calls, against {n("forgNemoCodexUnoff")} for Nemotron, whose calls are other names. On the same prompted call, Qwen3-Coder is back on track after {n("recQwenAp")} and gpt-oss after {n("recGptAp")}.</>}
    >
      <Legend items={Object.entries(CLASS).map(([k, [l]]) => [CLASS_COLOR[k], l])} />
      {(["universal", "tolerance-dependent", "intermediate"] as const).map((c) => (
        <div key={c} style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 600, color: "var(--head)", margin: "0 0 6px" }}>
            {CLASS[c][0]} <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--muted)" }}>· {CLASS[c][1]}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {classes.filter((x) => x.class === c).map((x) => {
              const led = ledger.filter((l) => l.harness === x.harness && l.trigger === x.trigger && l.cohort === "core-r7");
              return (
                <div key={x.harness + x.trigger} style={{ border: "1px solid var(--line)", borderLeft: `3px solid ${CLASS_COLOR[c]}`, borderRadius: 8, padding: "9px 11px", background: "var(--surface)" }}
                  onMouseMove={(e) => tip.show(e, <TipRows title={`${HARNESS_LABEL[x.harness]} · ${x.trigger_name}`} rows={CORE_MODELS.map((m) => {
                    const r = led.find((l) => l.model === m);
                    return [MODEL_LABEL[m], r ? `${pct(r.slot_share)} of slots · ${r.forgiveness === null ? "–" : pct(r.forgiveness)} recovered` : "–"] as [string, string];
                  })} />)} onMouseLeave={tip.hide}>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{HARNESS_LABEL[x.harness]} · {x.trigger}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--head)", lineHeight: 1.3 }}>{x.trigger_name}</div>
                  <Bars led={led} metric={metric} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {tip.node}
    </Figure>
  );
}

export function Fragility() {
  return (
    <section id="fragility" className="col">
      <div className="rq">Harness failure points</div>
      <h2>Failure points, and how models recover</h2>
      <p className="answer">The traces expose prompt–tool mismatches and other harness failure points. Even the most successful model encounters several of them; at the Codex CLI tool menu, it stands out more for recovering than for avoiding failures.</p>
      <p>
        The cards group recurring failures at tool menus, argument schemas, stopping rules, editors and tool infrastructure.
        Switch from how often a model hits a failure to how often it gets back on track within three actions.
        {" "}<span className="tier">exploratory</span>
      </p>
      <Ledger />
      <p>
        The universal points also trip Qwen3-Coder often (though not every model hits each one: OpenCode's tool
        infrastructure catches Qwen3-Coder and gpt-oss far more often than Nemotron). Some are harness defects at this
        scale, such as the Codex CLI prompt asking for a tool its menu lacks and an OpenCode search tool that fails in the
        task containers; others, such as SWE-agent's exact-match edit rejections, are friction that models usually recover from. For harness authors this suggests testing with models at this
        scale, where such failures are visible. Our data contain no frontier model, so whether stronger models hide them is a
        hypothesis, not a finding.
      </p>
      <details className="evidence">
        <summary>Evidence and methods: failure classification and the original prediction</summary>
        <p>
          The registered ledger covered strict argument schemas (T1), tool menus (T2), tool-name handling (T3), the
          text action protocol (T4), stopping on a reply without a tool call (T5), exact-match editing (T6), tool
          infrastructure (T7) and per-command time limits (T8). The classification rule is pre-registered;
          this analysis is exploratory.
        </p>
        <p>
          We predicted that most trigger points would be tolerance-dependent: Qwen3-Coder would avoid them while
          another model would trip on them. That prediction was not supported: {n("fhTol")} of {n("fhN")} meet the rule,
          and {n("fhUniv")} also trip Qwen3-Coder often. The card labels state the thresholds used for each class.
        </p>
      </details>
      <p className="note">Core harnesses only: {CORE_HARNESSES.map((h) => HARNESS_LABEL[h]).join(", ")}.</p>
    </section>
  );
}
