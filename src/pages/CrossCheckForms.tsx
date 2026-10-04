import { useState } from "react";
import { CrossCheckForm, PresetRow, WarningList, fieldDomId } from "../components/CrossCheckForm";
import { FieldSandbox } from "../components/FieldSandbox";
import { Inspector } from "../components/Inspector";
import { JevStatus } from "../components/SmartFilter";
import { ThresholdSlider } from "../components/ThresholdSlider";
import { FORM_IDS, FORMS, blankValues, isoDate, type FormId, type FormPreset } from "../data/forms";
import { Link } from "../lib/router";
import { buildWarnings, useCrossCheck, type CrossWarning } from "../lib/useCrossCheck";

type Values = Record<string, string>;

function initialValues(today: Date) {
  return Object.fromEntries(
    FORM_IDS.map((id) => [id, FORMS[id].presets.find((p) => p.tone === "clean")?.values(today) ?? blankValues(FORMS[id])]),
  ) as Record<FormId, Values>;
}

export default function CrossCheckForms() {
  const [now] = useState(() => new Date());
  const today = isoDate(now);
  const [formId, setFormId] = useState<FormId>("checkout");
  const [values, setValues] = useState(() => initialValues(now));
  const [committed, setCommitted] = useState(values);
  const [activePreset, setActivePreset] = useState<Record<FormId, string | null>>({ checkout: "clean", trip: "clean" });
  const [dismissed, setDismissed] = useState<Record<string, string>>({});
  const [threshold, setThreshold] = useState(0.6);

  const form = FORMS[formId];
  const current = values[formId];
  const check = useCrossCheck(formId, committed[formId], today);
  const result = check.status === "done" ? check.data : check.status === "idle" ? undefined : check.previous;
  const fieldKeys = new Set(form.fields.map((f) => f.key));
  const checks = result && Object.keys(result.fields).every((k) => fieldKeys.has(k)) ? result.fields : undefined;

  const snapshot = (w: CrossWarning) => JSON.stringify([formId, w.primary, ...w.others].map((k) => current[k] ?? k));
  const allWarnings = checks ? buildWarnings(checks, threshold) : [];
  const warnings = allWarnings.filter((w) => dismissed[w.id] !== snapshot(w));
  const dismissedCount = allWarnings.length - warnings.length;
  const labelOf = (key: string) => form.fields.find((f) => f.key === key)?.label ?? key;

  function pickPreset(preset: FormPreset) {
    const next = { ...blankValues(form), ...preset.values(now) };
    setValues((v) => ({ ...v, [formId]: next }));
    setCommitted((c) => ({ ...c, [formId]: next }));
    setActivePreset((a) => ({ ...a, [formId]: preset.id }));
  }

  function change(key: string, value: string) {
    setValues((v) => ({ ...v, [formId]: { ...v[formId], [key]: value } }));
    setActivePreset((a) => ({ ...a, [formId]: null }));
  }

  function focusField(key: string) {
    const el = document.getElementById(fieldDomId(formId, key));
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  }

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-4 pt-10 pb-28 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.3em] uppercase">
            <Link to="/" className="text-zinc-500 transition hover:text-white">
              ← Jev UI Playground
            </Link>
            <span className="text-zinc-700">/</span>
            <span className="text-accent">Experiment 02</span>
          </p>
          <h1 className="title-display editorial-glow mt-3 text-6xl leading-[0.9] text-white sm:text-7xl">
            Forms that <span className="title-accent">Auto-validate</span>
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-400">
            Every field is checked against every other, with no validation rules written for either form. Jev reads the whole
            form and asks, per field, whether a careful person would stop and question it, and which answer it clashes with.
          </p>
        </div>
        <ThresholdSlider value={threshold} onChange={setThreshold} title="Flag threshold" hint="Min. probability to raise a warning" />
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-xl border border-white/10 bg-ink-950/60 p-1">
              {FORM_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFormId(id)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                    id === formId ? "bg-accent text-ink-950" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {FORMS[id].name}
                </button>
              ))}
            </div>
            <JevStatus state={check.status} cached={check.status === "done" && check.data.debug.cached} />
          </div>

          <div className="mt-5">
            <PresetRow presets={form.presets} active={activePreset[formId]} onPick={pickPreset} />
          </div>

          <div className="mt-5 border-t border-white/5 pt-5">
            <CrossCheckForm
              form={form}
              values={current}
              checks={checks}
              warnings={warnings}
              stale={check.status === "loading"}
              onChange={change}
              onCommit={() => setCommitted((c) => ({ ...c, [formId]: values[formId] }))}
              onDismiss={(w) => setDismissed((d) => ({ ...d, [w.id]: snapshot(w) }))}
            />
          </div>
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <section className="card p-5">
            <p className="font-mono text-[10px] tracking-[0.25em] text-zinc-500 uppercase">Warnings</p>
            <p className="mt-1 mb-4 text-xs text-zinc-500">Soft and dismissible. Nothing here blocks submitting.</p>
            <WarningList
              status={check.status}
              error={check.status === "error" ? check.error : undefined}
              warnings={warnings}
              dismissedCount={dismissedCount}
              labelOf={labelOf}
              onFocus={focusField}
              onRestore={() => setDismissed({})}
            />
          </section>
        </aside>
      </div>

      <div className="mt-6">
        <FieldSandbox />
      </div>

      <footer className="mt-12 text-center text-xs text-zinc-600">
        Powered by Jev from{" "}
        <a href="https://typesafe.ai" className="text-zinc-400 hover:text-white">
          TypeSafe
        </a>{" "}
        · one Noul and one Choice question per filled field, in a single request
      </footer>

      <Inspector />
    </div>
  );
}
