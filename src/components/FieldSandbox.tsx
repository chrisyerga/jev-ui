import { useState, type ReactNode } from "react";
import {
  INPUT_TYPE_LABELS,
  OPTION_SETS,
  SANDBOX_CONTEXT_IDS,
  SANDBOX_CONTEXTS,
  SANDBOX_EXAMPLES,
  type InputType,
  type OptionSetId,
  type SandboxContextId,
} from "../data/fieldCatalog";
import { api } from "../lib/api";
import { useJevRequest } from "../lib/useJevRequest";
import { LIMITS, type FieldSpecResponse } from "../shared/api";
import { JevStatus } from "./SmartFilter";

const DEBOUNCE_MS = 450;
const DEFAULT_GATE = 0.5;

interface Spec {
  type: InputType;
  options?: readonly string[];
  optionSet?: OptionSetId;
  /** Pre-selected option, or for toggles "on". Undefined when the field is left blank on purpose. */
  initial?: string;
}

function toSpec(data: FieldSpecResponse): Spec {
  const picked = data.inputType.choice as InputType;
  const setId = Object.hasOwn(OPTION_SETS, data.optionSet.choice) ? (data.optionSet.choice as OptionSetId) : undefined;
  const usesOptions = picked === "single" || picked === "multi";
  const type = usesOptions && !setId ? "short_text" : picked;
  const prefill = data.shouldDefault >= DEFAULT_GATE;
  if (type === "toggle") return { type, initial: prefill && data.toggleOn >= 0.5 ? "on" : undefined };
  if (!usesOptions || !setId) return { type };
  return { type, optionSet: setId, options: OPTION_SETS[setId].options, initial: prefill ? data.defaults[setId]?.choice : undefined };
}

export function FieldSandbox() {
  const [label, setLabel] = useState("Size");
  const [context, setContext] = useState<SandboxContextId>("pizza");
  const clean = label.trim();
  const key = clean ? `${context}|${clean.toLowerCase()}` : null;
  const state = useJevRequest<FieldSpecResponse>(key, (signal) => api.fieldSpec({ label: clean, context }, signal), DEBOUNCE_MS);
  const data = state.status === "done" ? state.data : state.status === "idle" ? undefined : state.previous;
  const spec = data && toSpec(data);

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.25em] text-zinc-500 uppercase">Sandbox</p>
          <h2 className="title-display text-3xl leading-none text-white">
            Label-aware <span className="title-accent">fields</span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Name a field and say where it sits. Jev picks the control, its options and its default, including when a default
            would be presumptuous and the field should start blank.
          </p>
        </div>
        <JevStatus state={state.status} cached={state.status === "done" && state.data.debug.cached} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <label htmlFor="sandbox-label" className="mb-1.5 block text-xs font-medium text-zinc-400">
            Field label
          </label>
          <div className="relative">
            <input
              id="sandbox-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={LIMITS.fieldLabelChars}
              placeholder="Try “Size”, “Seat”, “Send me offers”…"
              className="w-full rounded-xl border border-white/10 bg-ink-950/70 px-3.5 py-2.5 text-[15px] text-white placeholder:text-zinc-600 focus:border-accent/60 focus:ring-4 focus:ring-accent/15 focus:outline-none"
            />
            {state.status === "loading" && <div className="shimmer absolute right-5 bottom-0 left-5 h-px" />}
          </div>

          <p className="mt-4 mb-1.5 text-xs font-medium text-zinc-400">Sits inside</p>
          <div className="flex flex-wrap gap-1.5">
            {SANDBOX_CONTEXT_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setContext(id)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  id === context ? "border-accent/60 bg-accent/15 text-glow" : "border-white/10 text-zinc-400 hover:border-white/25 hover:text-zinc-200"
                }`}
              >
                {SANDBOX_CONTEXTS[id].name}
              </button>
            ))}
          </div>

          <p className="mt-4 mb-1.5 font-mono text-[10px] tracking-[0.2em] text-zinc-500 uppercase">Try</p>
          <div className="flex flex-wrap gap-1.5">
            {SANDBOX_EXAMPLES.map((ex) => {
              const active = ex.context === context && ex.label.toLowerCase() === clean.toLowerCase();
              return (
                <button
                  key={`${ex.context}:${ex.label}`}
                  type="button"
                  onClick={() => {
                    setLabel(ex.label);
                    setContext(ex.context);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    active ? "border-accent/60 bg-accent/15 text-glow" : "border-white/10 text-zinc-400 hover:border-white/25 hover:text-zinc-200"
                  }`}
                >
                  {ex.label} <span className="text-zinc-600">· {SANDBOX_CONTEXTS[ex.context].name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`rounded-2xl border border-white/10 bg-ink-950/50 p-5 transition ${state.status === "loading" ? "opacity-60" : ""}`}>
          {state.status === "error" && !data && <p className="text-sm text-red-400">{state.error}</p>}
          {!data && state.status !== "error" && <p className="text-sm text-zinc-500">{clean ? "Jev is thinking…" : "Type a label."}</p>}
          {data && spec && (
            <>
              <p className="font-mono text-[10px] tracking-[0.2em] text-zinc-500 uppercase">Live preview</p>
              <div className="mt-3">
                <Preview key={JSON.stringify(spec)} label={clean || "Untitled"} spec={spec} />
              </div>
              <Reading data={data} spec={spec} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Reading({ data, spec }: { data: FieldSpecResponse; spec: Spec }) {
  const types = Object.entries(data.inputType.probabilities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const setConfidence = spec.optionSet ? data.optionSet.probabilities[spec.optionSet] : undefined;
  const prefill = data.shouldDefault >= DEFAULT_GATE;
  return (
    <dl className="mt-5 space-y-3 border-t border-white/5 pt-4 text-sm">
      <div>
        <dt className="mb-1.5 text-xs text-zinc-500">Control</dt>
        <dd className="space-y-1">
          {types.map(([type, p]) => (
            <span key={type} className="flex items-center gap-2 text-xs">
              <span className={`w-28 shrink-0 ${type === spec.type ? "text-white" : "text-zinc-500"}`}>
                {INPUT_TYPE_LABELS[type as InputType] ?? type}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-accent-deep to-accent transition-[width] duration-500"
                  style={{ width: `${Math.round(p * 100)}%` }}
                />
              </span>
              <span className="w-9 text-right font-mono text-[11px] text-zinc-400">{Math.round(p * 100)}%</span>
            </span>
          ))}
        </dd>
      </div>
      {spec.optionSet && (
        <Row term="Options">
          {OPTION_SETS[spec.optionSet].description}
          {setConfidence !== undefined && <Pct p={setConfidence} />}
        </Row>
      )}
      <Row term="Default">
        {prefill ? (
          spec.type === "toggle" ? (
            <span className="text-white">{spec.initial ? "Starts on" : "Starts off"}</span>
          ) : spec.initial ? (
            <span className="text-white">{spec.initial}</span>
          ) : (
            <span className="text-zinc-400">None needed for free-form input</span>
          )
        ) : (
          <span className="text-lime">{spec.type === "toggle" ? "Starts off on purpose" : "Left blank on purpose"}</span>
        )}
        <Pct p={data.shouldDefault} title="Probability that pre-selecting a typical answer is good form design" />
      </Row>
    </dl>
  );
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-16 shrink-0 text-xs text-zinc-500">{term}</dt>
      <dd className="flex-1 text-zinc-300">{children}</dd>
    </div>
  );
}

function Pct({ p, title }: { p: number; title?: string }) {
  return (
    <span className="ml-2 font-mono text-[11px] text-zinc-500" title={title}>
      {Math.round(p * 100)}%
    </span>
  );
}

const CONTROL =
  "w-full rounded-xl border border-white/10 bg-ink-900/80 px-3.5 py-2.5 text-[15px] text-white placeholder:text-zinc-600 focus:border-accent/60 focus:ring-4 focus:ring-accent/15 focus:outline-none";

const HTML_TYPE: Partial<Record<InputType, string>> = { email: "email", phone: "tel", number: "number", date: "date" };

function Preview({ label, spec }: { label: string; spec: Spec }) {
  const [single, setSingle] = useState(spec.initial);
  const [multi, setMulti] = useState(() => new Set(spec.initial ? [spec.initial] : []));
  const [on, setOn] = useState(spec.initial === "on");
  const [rating, setRating] = useState(0);

  if (spec.type === "toggle") {
    return (
      <button type="button" role="switch" aria-checked={on} onClick={() => setOn((v) => !v)} className="flex items-center gap-3 text-left">
        <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-accent" : "bg-white/15"}`}>
          <span className={`absolute top-1 size-4 rounded-full bg-white shadow transition-all ${on ? "left-6" : "left-1"}`} />
        </span>
        <span className="text-sm text-zinc-200">{label}</span>
      </button>
    );
  }

  const title = <p className="mb-2 text-sm font-medium text-zinc-200">{label}</p>;

  if ((spec.type === "single" || spec.type === "multi") && spec.options) {
    const isMulti = spec.type === "multi";
    return (
      <fieldset>
        <legend className="contents">{title}</legend>
        <div className="flex flex-wrap gap-1.5">
          {spec.options.map((o) => {
            const checked = isMulti ? multi.has(o) : single === o;
            return (
              <label
                key={o}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition ${
                  checked ? "border-accent/70 bg-accent/15 text-white" : "border-white/10 text-zinc-400 hover:border-white/25"
                }`}
              >
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name="sandbox-preview"
                  className="sr-only"
                  checked={checked}
                  onChange={() =>
                    isMulti
                      ? setMulti((s) => {
                          const next = new Set(s);
                          if (next.has(o)) next.delete(o);
                          else next.add(o);
                          return next;
                        })
                      : setSingle(o)
                  }
                />
                {o}
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  if (spec.type === "rating") {
    return (
      <div>
        {title}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              className={`text-2xl leading-none transition ${n <= rating ? "text-lime" : "text-white/15 hover:text-white/30"}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <label className="block">
      {title}
      {spec.type === "long_text" ? (
        <textarea rows={3} className={`${CONTROL} resize-y`} />
      ) : (
        <input type={HTML_TYPE[spec.type] ?? "text"} className={CONTROL} />
      )}
    </label>
  );
}
