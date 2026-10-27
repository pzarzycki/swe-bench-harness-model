// Static data, exported by `npm run data` (analysis/site/export.py). Every number in the prose comes from
// `site.numbers`, each verified verbatim against metadata/findings.md or parameters.md at export. Chart series are
// copies of the per-stage aggregates in analysis/out/; the slot table backs the explorer.
import site from "./data/site.json";

export const meta = site.meta;
const numbers = site.numbers as Record<string, string>;

/** A number exactly as printed in findings.md / parameters.md. Unknown keys fail loudly, so prose can't drift. */
export function n(key: string): string {
  const v = numbers[key];
  if (v === undefined) throw new Error(`unknown number: ${key}`);
  return v;
}

export interface Table { source?: string; columns: string[]; rows: string[][] }
const tables = site.tables as unknown as Record<string, Table>;
export function table(key: string): Table {
  const t = tables[key];
  if (!t) throw new Error(`unknown table: ${key}`);
  return t;
}

type Cell = number | string | boolean | null;
export interface Series { source?: string; columns: string[]; rows: Cell[][] }
const allSeries = site.series as unknown as Record<string, Series>;
export function series(key: string): Series {
  const s = allSeries[key];
  if (!s) throw new Error(`unknown series: ${key}`);
  return s;
}
/** A series as an array of objects keyed by column name. */
export function records<T = Record<string, Cell>>(key: string): T[] {
  const s = series(key);
  return s.rows.map((r) => Object.fromEntries(s.columns.map((c, i) => [c, r[i]])) as T);
}

export interface Excerpt {
  id: string; unit: string; task: string; model: string; harness: string; caption: string; kind: "reply" | "call";
  channel?: "text" | "reasoning"; text?: string; visibleText?: string; tool?: string; args?: string; result?: string; cls?: string;
}
export const excerpts = site.excerpts as Excerpt[];
export function excerpt(id: string): Excerpt {
  const e = excerpts.find((x) => x.id === id);
  if (!e) throw new Error(`unknown excerpt ${id}`);
  return e;
}

export interface SlotTable {
  lanes: { model: string; harness: string; cohort: string }[];
  tasks: { id: string; repo: string; lang: string; language: string; created: string; goldFiles: number; goldLines: number }[];
  outcome: string[]; first: number[][]; firstClasses: string[]; ending: number[][]; endingClasses: string[];
  actions: number[][]; mismatch: [number, number][];
}
export const slots = site.slots as unknown as SlotTable;

// ------------------------------------------------------------------ study vocabulary (paper/tools/figstyle.py)
export type Model = "qwen3-coder-30b-a3b" | "nemotron-nano-3-30b" | "gpt-oss-20b" | "gemma-4-26b-a4b";
export type Harness = "codex-cli" | "opencode-cli" | "deepseek-harness" | "swe-agent" | "mini-swe-agent";
export const MODELS: Model[] = ["qwen3-coder-30b-a3b", "nemotron-nano-3-30b", "gpt-oss-20b", "gemma-4-26b-a4b"];
/** Paper order: the two harnesses that stop at a tool-free reply, the extension, then the two that wait for submit. */
export const HARNESSES: Harness[] = ["codex-cli", "opencode-cli", "deepseek-harness", "swe-agent", "mini-swe-agent"];
export const CORE_MODELS: Model[] = ["qwen3-coder-30b-a3b", "nemotron-nano-3-30b", "gpt-oss-20b"];
export const CORE_HARNESSES: Harness[] = ["codex-cli", "opencode-cli", "swe-agent", "mini-swe-agent"];

export const MODEL_LABEL: Record<Model, string> = {
  "qwen3-coder-30b-a3b": "Qwen3-Coder", "nemotron-nano-3-30b": "Nemotron-Nano-3", "gpt-oss-20b": "gpt-oss-20b",
  "gemma-4-26b-a4b": "Gemma-4",
};
export const MODEL_SHORT: Record<Model, string> = {
  "qwen3-coder-30b-a3b": "Qwen", "nemotron-nano-3-30b": "Nemotron", "gpt-oss-20b": "gpt-oss", "gemma-4-26b-a4b": "Gemma",
};
export const MODEL_FULL: Record<Model, string> = {
  "qwen3-coder-30b-a3b": "Qwen3-Coder-30B-A3B", "nemotron-nano-3-30b": "Nemotron-Nano-3-30B", "gpt-oss-20b": "gpt-oss-20b",
  "gemma-4-26b-a4b": "Gemma-4-26B-A4B",
};
export const MODEL_COLOR: Record<Model, string> = {
  "qwen3-coder-30b-a3b": "var(--m-qwen)", "nemotron-nano-3-30b": "var(--m-nemo)", "gpt-oss-20b": "var(--m-gpt)",
  "gemma-4-26b-a4b": "var(--m-gemma)",
};
export const HARNESS_LABEL: Record<Harness, string> = {
  "codex-cli": "Codex CLI", "opencode-cli": "OpenCode", "deepseek-harness": "DeepSeek harness", "swe-agent": "SWE-agent",
  "mini-swe-agent": "mini-SWE-agent",
};
export const HARNESS_SHORT: Record<Harness, string> = {
  "codex-cli": "Codex", "opencode-cli": "OpenCode", "deepseek-harness": "DSH", "swe-agent": "SWE-agent",
  "mini-swe-agent": "mini-SWE",
};
export const isCore = (m: string, h: string) => CORE_MODELS.includes(m as Model) && CORE_HARNESSES.includes(h as Harness);
export const cohortOf = (m: string, h: string) => (m === "gemma-4-26b-a4b" ? "gemma-r1" : h === "deepseek-harness" ? "dsh-r6" : "core-r7");
export const COHORT_LABEL: Record<string, string> = { "core-r7": "core block", "dsh-r6": "DSH extension", "gemma-r1": "Gemma extension" };
export const laneLabel = (m: string, h: string) => `${MODEL_LABEL[m as Model]} × ${HARNESS_LABEL[h as Harness]}`;
/** Split "model|harness" (stage 3 and 4 tables) into its parts. */
export const splitLane = (lane: string) => { const [m, h] = lane.split("|"); return { model: m as Model, harness: h as Harness }; };

// formatting
export const pct = (p: number, d = 0) => `${(p * 100).toFixed(d)}%`;
export const fmtInt = (x: number) => x.toLocaleString("en-US");
export const fx = (x: number, d = 2) => x.toFixed(d);
export const num = (v: Cell | string): number => {
  if (typeof v === "number") return v;
  const m = String(v).match(/[−-]?[\d,]+(\.\d+)?/);
  if (!m) throw new Error(`not a number: ${v}`);
  return parseFloat(m[0].replace(/,/g, "").replace("−", "-"));
};
