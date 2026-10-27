import { Excerpt, HARNESS_LABEL, Harness, MODEL_COLOR, MODEL_LABEL, Model } from "../data";

/** One short, model-written excerpt of a trajectory, attributed to its slot (task, model, harness). */
export function TraceCard({ e }: { e: Excerpt }) {
  const m = e.model as Model, h = e.harness as Harness;
  return (
    <div className="trace">
      <div className="trace-head">
        <span className="who"><i className="sw" style={{ background: MODEL_COLOR[m] }} />{MODEL_LABEL[m]} × {HARNESS_LABEL[h]}</span>
        <span className="mono" style={{ color: "var(--muted)", fontSize: 11.5 }}>{e.task.split("__")[1]}</span>
      </div>
      <div className="trace-body">
        {e.kind === "reply" ? (
          e.channel === "reasoning" ? (
            <>
              <div className="turn reasoning"><span className="role">reasoning channel</span>{e.text}</div>
              <div className="turn text empty"><span className="role">visible reply</span>{e.visibleText || "(empty)"}</div>
              <div className="turn harness"><span className="role">harness</span>no command block found</div>
            </>
          ) : (
            <>
              <div className="turn text"><span className="role">first reply (no tool call)</span>{e.text}</div>
              <div className="turn harness"><span className="role">harness</span>run ends: the reply has no tool call</div>
            </>
          )
        ) : (
          <>
            <div className="turn call"><span className="role">tool call</span><b>{e.tool}</b>{e.args ? `\n${e.args}` : ""}</div>
            <div className="turn harness"><span className="role">harness</span>{e.result || "(no result recorded for this call)"}</div>
          </>
        )}
      </div>
      <div className="cap">{e.caption}</div>
      <div className="unit">{e.unit}</div>
    </div>
  );
}
