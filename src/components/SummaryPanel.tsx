import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { DEMO_BY_ID } from "../data/demographics";
import { GEO_BY_ID } from "../data/geo";
import { estimateReachK, formatReach } from "../lib/reach";
import type { FitResult } from "../shared/api";
import { fitTone } from "./FitPanel";

interface Props {
  selected: Set<string>;
  suggested: Set<string>;
  fit?: Record<string, FitResult>;
  onRemove: (id: string) => void;
  onClear: () => void;
  children?: ReactNode;
}

export function SummaryPanel({ selected, suggested, fit, onRemove, onClear, children }: Props) {
  const ids = [...selected];
  const geo = ids.filter((id) => GEO_BY_ID.has(id));
  const demo = ids.filter((id) => DEMO_BY_ID.has(id));
  const reach = estimateReachK(selected);

  return (
    <aside className="card p-6">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] tracking-[0.25em] text-zinc-500 uppercase">Audience summary</p>
        {ids.length > 0 && (
          <button onClick={onClear} className="text-xs text-zinc-500 hover:text-zinc-200">
            Clear all
          </button>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-gradient-to-br from-accent-deep/40 via-ink-800 to-ink-800 p-5 ring-1 ring-white/10">
        <p className="text-xs text-zinc-400">Estimated reach</p>
        <motion.p
          key={formatReach(reach)}
          initial={{ opacity: 0.4, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="title-display text-6xl leading-none text-white"
        >
          {formatReach(reach)}
        </motion.p>
        <p className="mt-1 text-xs text-zinc-500">US adults · mock estimate computed in code, not by Jev</p>
      </div>

      <ChipGroup title="Where" empty="All of the US" ids={geo} suggested={suggested} fit={fit} onRemove={onRemove}
        label={(id) => {
          const g = GEO_BY_ID.get(id);
          return g ? (g.kind === "city" ? `${g.name}, ${g.stateCode}` : g.name) : id;
        }}
      />
      <ChipGroup title="Who" empty="Everyone" ids={demo} suggested={suggested} fit={fit} onRemove={onRemove}
        label={(id) => DEMO_BY_ID.get(id)?.name ?? id}
        sub={(id) => DEMO_BY_ID.get(id)?.group}
      />

      {children}
    </aside>
  );
}

function ChipGroup(props: {
  title: string;
  empty: string;
  ids: string[];
  suggested: Set<string>;
  fit?: Record<string, FitResult>;
  label: (id: string) => string;
  sub?: (id: string) => string | undefined;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-medium text-zinc-400">
        {props.title} <span className="font-mono text-zinc-600">{props.ids.length || ""}</span>
      </p>
      {props.ids.length === 0 ? (
        <p className="text-sm text-zinc-600 italic">{props.empty}</p>
      ) : (
        <div className="scroll-thin flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
          <AnimatePresence initial={false}>
            {props.ids.map((id) => {
              const f = props.fit?.[id];
              const tone = f ? fitTone(f.score) : undefined;
              return (
                <motion.button
                  layout
                  key={id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => props.onRemove(id)}
                  title={props.sub?.(id) ? `${props.sub(id)} · click to remove` : "Click to remove"}
                  className={`group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                    tone?.chip ?? (props.suggested.has(id) ? "border-lime/30 bg-lime/5 text-lime" : "border-white/10 bg-white/[0.04] text-zinc-200")
                  } hover:border-red-400/50 hover:text-red-200`}
                >
                  {tone && <span className={`size-1.5 rounded-full ${tone.dot}`} />}
                  {props.label(id)}
                  <span className="text-zinc-500 group-hover:text-red-300">×</span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
