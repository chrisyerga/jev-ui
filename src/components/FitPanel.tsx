import { DEMO_BY_ID } from "../data/demographics";
import { GEO_BY_ID } from "../data/geo";
import type { FitResult } from "../shared/api";

/** Scores run 0 (poor) to 3 (strong); below this counts as a warning. */
export const FIT_WARN_BELOW = 1.5;

export function fitTone(score: number) {
  if (score < 0.75) return { label: "Poor fit", chip: "border-red-400/40 bg-red-500/10 text-red-200", dot: "bg-red-400" };
  if (score < FIT_WARN_BELOW) return { label: "Weak fit", chip: "border-amber-300/40 bg-amber-400/10 text-amber-100", dot: "bg-amber-300" };
  if (score < 2.25) return { label: "Reasonable", chip: "border-white/15 bg-white/[0.05] text-zinc-100", dot: "bg-zinc-300" };
  return { label: "Strong fit", chip: "border-lime/40 bg-lime/10 text-lime", dot: "bg-lime" };
}

function labelFor(id: string) {
  const g = GEO_BY_ID.get(id);
  if (g) return g.kind === "city" ? `${g.name}, ${g.stateCode}` : g.name;
  const d = DEMO_BY_ID.get(id);
  return d ? `${d.group}: ${d.name}` : id;
}

interface Props {
  canCheck: boolean;
  hasBrief: boolean;
  busy: boolean;
  stale: boolean;
  error?: string;
  results?: Record<string, FitResult>;
  onCheck: () => void;
}

export function FitPanel({ canCheck, hasBrief, busy, stale, error, results, onCheck }: Props) {
  const entries = results ? Object.entries(results).sort((a, b) => a[1].score - b[1].score) : [];
  const warnings = entries.filter(([, r]) => r.score < FIT_WARN_BELOW);

  return (
    <div className="mt-6 border-t border-white/10 pt-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">Audience-fit check</p>
          <p className="text-xs text-zinc-500">
            {hasBrief ? "Jev scores each selection against your brief." : "Write a brief above to enable."}
          </p>
        </div>
        <button
          onClick={onCheck}
          disabled={!canCheck || busy}
          className="rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs font-medium text-glow transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Checking…" : results && !stale ? "Re-check" : "Check fit"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {results && stale && <p className="mt-3 text-xs text-amber-300/80">Selections or brief changed since the last check.</p>}

      {results && (
        <div className="mt-3 space-y-1.5">
          {warnings.length === 0 ? (
            <p className="rounded-xl bg-lime/10 px-3 py-2 text-sm text-lime ring-1 ring-lime/20">
              No conflicts: every selection is at least a reasonable fit.
            </p>
          ) : (
            <p className="text-xs text-amber-200">
              {warnings.length} selection{warnings.length > 1 ? "s" : ""} look{warnings.length > 1 ? "" : "s"} off for this brief:
            </p>
          )}
          {entries.map(([id, r]) => {
            const tone = fitTone(r.score);
            return (
              <div key={id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`size-2 shrink-0 rounded-full ${tone.dot}`} />
                  <span className="truncate text-zinc-200">{labelFor(id)}</span>
                </span>
                <span className="shrink-0 font-mono text-[11px] text-zinc-400">
                  {tone.label} · {r.score.toFixed(1)}/3
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
