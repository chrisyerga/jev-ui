import { LIMITS } from "../shared/api";

const EXAMPLES = [
  "Launching an oat-milk cold brew in health-conscious West Coast cities, aimed at young professionals",
  "Retirement planning webinar for people about to retire in Florida and Arizona",
  "Premium dog food for millennials",
  "Snowboard rental deals for college students near the Rockies",
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  onPrefill: () => void;
  busy: boolean;
  note?: { tone: "ok" | "warn" | "error"; text: string };
}

export function BriefBox({ value, onChange, onPrefill, busy, note }: Props) {
  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] tracking-[0.25em] text-zinc-500 uppercase">Step 0 · optional</p>
          <h2 className="title-display text-3xl text-white">Describe your campaign</h2>
        </div>
        <p className="max-w-sm text-xs text-zinc-500">
          Jev asks one yes/no question per place and per segment, plus two gates: does the brief imply a geography? an
          audience? Sections only pre-fill when their gate says yes.
        </p>
      </div>
      <div className="mt-4 flex flex-col gap-3 md:flex-row">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={LIMITS.briefChars}
          rows={2}
          placeholder="e.g. Launching an oat-milk cold brew in health-conscious West Coast cities…"
          className="min-h-[3.5rem] flex-1 resize-y rounded-2xl border border-white/10 bg-ink-950/70 px-4 py-3 text-[15px] text-white placeholder:text-zinc-600 focus:border-accent/60 focus:ring-4 focus:ring-accent/15 focus:outline-none"
        />
        <button
          onClick={onPrefill}
          disabled={busy || !value.trim()}
          className="relative shrink-0 overflow-hidden rounded-2xl bg-accent px-6 py-3 font-semibold text-ink-950 shadow-lg shadow-accent/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Reading brief…" : "Pre-fill targeting"}
          {busy && <span className="shimmer absolute inset-x-0 bottom-0 h-0.5" />}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => onChange(ex)}
            className="max-w-xs truncate rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400 hover:border-white/25 hover:text-zinc-200"
            title={ex}
          >
            {ex}
          </button>
        ))}
      </div>
      {note && (
        <p
          className={`mt-3 text-sm ${
            note.tone === "ok" ? "text-lime" : note.tone === "warn" ? "text-amber-300" : "text-red-400"
          }`}
        >
          {note.text}
        </p>
      )}
    </section>
  );
}
