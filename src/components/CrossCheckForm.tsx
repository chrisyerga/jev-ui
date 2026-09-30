import { AnimatePresence, motion } from "motion/react";
import type { FormField, FormPreset, FormSpec, PresetTone } from "../data/forms";
import type { FieldCheck } from "../shared/api";
import { LIMITS } from "../shared/api";
import type { CrossWarning } from "../lib/useCrossCheck";

const SPAN: Record<FormField["span"], string> = {
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
  6: "sm:col-span-6",
};

const INPUT =
  "w-full rounded-xl border bg-ink-950/70 px-3.5 py-2.5 text-[15px] text-white placeholder:text-zinc-600 transition focus:outline-none focus:ring-4";

export function fieldDomId(form: string, key: string) {
  return `field-${form}-${key}`;
}

export function CrossCheckForm(props: {
  form: FormSpec;
  values: Record<string, string>;
  checks: Record<string, FieldCheck> | undefined;
  warnings: CrossWarning[];
  /** True while a newer check is running and the shown results may be out of date. */
  stale: boolean;
  onChange: (key: string, value: string) => void;
  onCommit: () => void;
  onDismiss: (warning: CrossWarning) => void;
}) {
  const labelOf = (key: string) => props.form.fields.find((f) => f.key === key)?.label ?? key;
  const byPrimary = new Map(props.warnings.map((w) => [w.primary, w]));
  const others = new Set(props.warnings.flatMap((w) => w.others));

  return (
    <div className="grid gap-x-3 gap-y-4 sm:grid-cols-6">
      {props.form.fields.map((field) => {
        const warning = byPrimary.get(field.key);
        const role = warning ? "primary" : others.has(field.key) ? "other" : undefined;
        const id = fieldDomId(props.form.id, field.key);
        const tone =
          role === "primary"
            ? "border-lime/70 ring-4 ring-lime/10 focus:border-lime focus:ring-lime/20"
            : role === "other"
              ? "border-dashed border-lime/40 focus:border-lime/60 focus:ring-lime/10"
              : "border-white/10 focus:border-accent/60 focus:ring-accent/15";
        const common = {
          id,
          value: props.values[field.key] ?? "",
          placeholder: field.placeholder,
          maxLength: LIMITS.formValueChars,
          onChange: (e: { target: { value: string } }) => props.onChange(field.key, e.target.value),
          onBlur: props.onCommit,
          className: `${INPUT} ${tone}`,
        };
        const suspicion = props.checks?.[field.key]?.suspicion;
        return (
          <div key={field.key} className={`col-span-full ${SPAN[field.span]}`}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor={id} className="text-xs font-medium text-zinc-400">
                {field.label}
              </label>
              {suspicion !== undefined && suspicion >= 0.15 && (
                <span
                  className={`font-mono text-[10px] text-zinc-600 transition ${props.stale ? "opacity-40" : ""}`}
                  title="Probability Jev would flag this field"
                >
                  {Math.round(suspicion * 100)}%
                </span>
              )}
            </div>
            {field.kind === "textarea" ? (
              <textarea {...common} rows={2} className={`${common.className} resize-y`} />
            ) : (
              <input {...common} type={field.kind === "tel" ? "tel" : field.kind} />
            )}
            <AnimatePresence initial={false}>
              {warning && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="text-lime">
                      <WarningIcon /> {warningText(warning, labelOf)}
                      <span className="ml-1.5 font-mono text-[10px] text-lime/60">{Math.round(warning.score * 100)}%</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => props.onDismiss(warning)}
                      className="rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-zinc-400 transition hover:border-white/25 hover:text-zinc-200"
                    >
                      This is correct
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export function warningText(warning: CrossWarning, labelOf: (key: string) => string) {
  if (warning.others.length === 0) return `${labelOf(warning.primary)} doesn't look right with the rest of the form`;
  return `${labelOf(warning.primary)} doesn't fit with ${listOf(warning.others.map(labelOf))}`;
}

const NAMED_OTHERS = 2;

function listOf(items: string[]) {
  if (items.length <= NAMED_OTHERS) return items.join(" and ");
  const more = items.length - NAMED_OTHERS;
  return `${items.slice(0, NAMED_OTHERS).join(", ")} and ${more} more field${more === 1 ? "" : "s"}`;
}

const TONE_DOT: Record<PresetTone, string> = {
  clean: "bg-zinc-400",
  mistake: "bg-lime",
  tricky: "bg-accent",
};

const TONE_NAME: Record<PresetTone, string> = {
  clean: "Clean",
  mistake: "Planted mistake",
  tricky: "Tricky but correct",
};

export function PresetRow(props: { presets: FormPreset[]; active: string | null; onPick: (preset: FormPreset) => void }) {
  const active = props.presets.find((p) => p.id === props.active);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {props.presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => props.onPick(preset)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
              preset.id === props.active
                ? "border-accent/60 bg-accent/15 text-glow"
                : "border-white/10 text-zinc-400 hover:border-white/25 hover:text-zinc-200"
            }`}
          >
            <span className={`size-1.5 rounded-full ${TONE_DOT[preset.tone]}`} />
            {preset.label}
          </button>
        ))}
      </div>
      <p className="mt-2.5 min-h-5 text-xs text-zinc-500">
        {active ? (
          <>
            <span className="font-mono text-[10px] tracking-[0.2em] text-zinc-400 uppercase">{TONE_NAME[active.tone]}</span>
            <span className="text-zinc-700"> · </span>
            {active.note}
          </>
        ) : (
          <>
            <Legend tone="mistake" /> planted mistakes, <Legend tone="tricky" /> tricky but correct. Or type your own; checks run when you leave a field.
          </>
        )}
      </p>
    </div>
  );
}

function Legend({ tone }: { tone: PresetTone }) {
  return <span className={`inline-block size-1.5 -translate-y-px rounded-full ${TONE_DOT[tone]}`} />;
}

export function WarningList(props: {
  status: "idle" | "loading" | "done" | "error";
  error?: string;
  warnings: CrossWarning[];
  dismissedCount: number;
  labelOf: (key: string) => string;
  onFocus: (key: string) => void;
  onRestore: () => void;
}) {
  const stale = props.status === "loading" && props.warnings.length > 0;
  return (
    <div className={`transition ${stale ? "opacity-50" : ""}`}>
      {props.warnings.length > 0 ? (
        <ul className="space-y-2">
          {props.warnings.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => props.onFocus(w.primary)}
                className="w-full rounded-xl border border-lime/25 bg-lime/[0.06] px-3.5 py-2.5 text-left text-sm text-zinc-200 transition hover:border-lime/50"
              >
                <span className="flex items-start justify-between gap-3">
                  <span>{warningText(w, props.labelOf)}</span>
                  <span className="shrink-0 font-mono text-[11px] text-lime">{Math.round(w.score * 100)}%</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-3 text-sm text-zinc-500">
          {props.status === "idle"
            ? "Fill in at least two fields. Checks run when you leave a field."
            : props.status === "loading"
              ? "Jev is reading the form…"
              : props.status === "error"
                ? <span className="text-red-400">{props.error}</span>
                : props.dismissedCount > 0
                  ? "Nothing else to flag."
                  : "Everything checks out."}
        </p>
      )}
      {props.dismissedCount > 0 && (
        <p className="mt-3 text-xs text-zinc-500">
          {props.dismissedCount} marked correct ·{" "}
          <button type="button" onClick={props.onRestore} className="text-zinc-400 underline-offset-2 hover:underline">
            show again
          </button>
        </p>
      )}
    </div>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 20 20" className="mr-0.5 inline size-3.5 -translate-y-px" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M10 3.5 2.5 16.5h15L10 3.5Z" strokeLinejoin="round" />
      <path d="M10 8.5v3.5M10 14.2v.3" strokeLinecap="round" />
    </svg>
  );
}
