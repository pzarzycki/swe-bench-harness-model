import { n } from "./data";
import { ThemeToggle, useScrollSpy } from "./components/ui";
import { Hero, KeyNumbers, SlotMatrix } from "./sections/Hero";
import { Design } from "./sections/Design";
import { Interaction } from "./sections/Interaction";
import { Funnel } from "./sections/Funnel";
import { Control } from "./sections/Control";
import { Mechanisms } from "./sections/Mechanisms";
import { Fragility } from "./sections/Fragility";
import { Common } from "./sections/Common";
import { Explorer } from "./sections/Explorer";

const TOC: [string, string][] = [
  ["top", "Introduction"], ["interaction", "No best pairing"], ["design", "The setup"], ["funnel", "Where runs part"],
  ["control", "Who controls what"], ["mechanisms", "Why pairings fail"], ["fragility", "Harness trigger points"],
  ["common", "Common ground"], ["explorer", "Explorer"], ["caveats", "Caveats"], ["about", "About"],
];
const IDS = TOC.map(([id]) => id);

function Caveats() {
  return (
    <section id="caveats" className="col">
      <h2>What this does and doesn't show</h2>
      <ul className="clean">
        <li><b>One attempt per slot.</b> Each slot was run once. Repeated runs of one agent on one task differ, and our intervals come from resampling tasks, not runs. The interaction is large against that noise; small differences between single lanes are not stable.</li>
        <li><b>Cohorts and serving routes.</b> Only the core block ran as one factorial on one route. Gemma-4 ran on another, much slower under the function-calling harnesses, and its results hold under its time budget only. The DeepSeek harness column mixes two configurations (a forced first tool call for three models, the default for Gemma-4). Every claim across cohorts is descriptive.</li>
        <li><b>Measurement.</b> Behaviour comes from a deterministic classifier validated against blind model coders and a first human pass, not against a large independent human sample. Its run class and edit-outcome flag are its weakest parts.</li>
        <li><b>What "harness" means.</b> Each harness is the harness as integrated here: addressed by the generic model name <code>unit</code>, so model-specific branches did not run; pinned to one version; and, for Codex CLI, with a tool menu that offered <code>apply_patch</code> in only {n("nCodexPatchMenu")} slots.</li>
        <li><b>Benchmark.</b> Success is the benchmark's grading predicate on a frozen split. Some task containers lack the toolchains their tests need. Contamination cannot be excluded; it would raise a model in every harness, and could create an interaction only if a harness changed how much a model draws on memorised fixes.</li>
        <li><b>Correlation, small grids.</b> Four models and five harnesses are not populations of either. The mechanisms are consistent with design facts; they are hypotheses for ablations, not causal estimates.</li>
      </ul>
    </section>
  );
}

function About() {
  return (
    <footer id="about" className="col">
      <p>
        <b>No Best Harness, No Best Model: Model × Harness Interaction in Compact MoE Coding Agents.</b> Pawel Zarzycki, 2026.
        Paper (arXiv) forthcoming. Dataset available on {" "}
        <a href="https://huggingface.co/datasets/pzarzycki/swebenchlive-harness-compact-moe" target="_blank" rel="noreferrer">Hugging Face ↗</a>.
      </p>
      <p>
        Every number in the text and the charts comes from the paper's analyses of these runs.
        The data: {n("nSlots")} slots, {n("nMessages")} trajectory messages. Trajectory excerpts are short,
        model-written replies and calls, attributed to their slot; no issue text or repository code is reproduced.
      </p>
      <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--muted)" }}>Citation <span className="badge">placeholder until the preprint is out</span></h4>
      <pre>{`@misc{zarzycki2026harness,
  title  = {No Best Harness, No Best Model: Model x Harness Interaction in Compact MoE Coding Agents},
  author = {Zarzycki, Pawel},
  year   = {2026},
  note   = {Preprint, forthcoming}
}`}</pre>
    </footer>
  );
}

export default function App() {
  const { active, progress } = useScrollSpy(IDS);
  return (
    <>
      <ThemeToggle />
      <div className="progress" style={{ width: `${progress * 100}%` }} />
      <nav className="toc" aria-label="Contents">
        <h4>Contents</h4>
        {TOC.map(([id, l]) => <a key={id} href={`#${id}`} className={active === id ? "on" : undefined}>{l}</a>)}
      </nav>
      <main className="page" id="top">
        <Hero />
        <KeyNumbers />
        <div className="wide"><SlotMatrix /></div>
        <Interaction />
        <Design />
        <Funnel />
        <Control />
        <Mechanisms />
        <Fragility />
        <Common />
        <Explorer />
        <Caveats />
        <About />
      </main>
    </>
  );
}
