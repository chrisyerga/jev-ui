import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState, type ReactNode } from "react";
import type { FilterKind } from "../shared/api";
import { useJevFilter } from "../lib/useJevFilter";

export interface FilterItem {
  id: string;
  name: string;
  sub?: string;
  group: string;
  searchText: string;
}

interface Props {
  kind: FilterKind;
  title: string;
  eyebrow: string;
  icon: ReactNode;
  placeholder: string;
  examples: string[];
  items: FilterItem[];
  groupOrder: string[];
  selected: Set<string>;
  suggested: Set<string>;
  threshold: number;
  onToggle: (id: string) => void;
  onSelectMany: (ids: string[]) => void;
}

interface Row {
  item: FilterItem;
  score?: number;
  nameMatch: boolean;
  nearMiss: boolean;
}

const NEAR_MISS_BAND = 0.25;

export function SmartFilter(props: Props) {
  const { kind, items, groupOrder, selected, suggested, threshold, onToggle, onSelectMany } = props;
  const [query, setQuery] = useState("");
  const [showNearMisses, setShowNearMisses] = useState(false);
  const jev = useJevFilter(kind, query);
  const q = query.trim().toLowerCase();

  const scores = jev.status === "done" ? jev.scores : undefined;

  const { rows, nearMissCount, matchedIds } = useMemo(() => {
    if (!q) {
      return {
        rows: items.map((item): Row => ({ item, nameMatch: false, nearMiss: false })),
        nearMissCount: 0,
        matchedIds: [] as string[],
      };
    }
    const out: Row[] = [];
    let near = 0;
    for (const item of items) {
      const nameMatch = item.searchText.includes(q);
      const score = scores?.[item.id];
      const isMatch = nameMatch || (score !== undefined && score >= threshold);
      const nearMiss = !isMatch && score !== undefined && score >= threshold - NEAR_MISS_BAND;
      if (nearMiss) near += 1;
      if (isMatch || (nearMiss && showNearMisses)) out.push({ item, score, nameMatch, nearMiss });
    }
    out.sort((a, b) => Number(b.nameMatch) - Number(a.nameMatch) || (b.score ?? 0) - (a.score ?? 0));
    return {
      rows: out,
      nearMissCount: near,
      matchedIds: out.filter((r) => !r.nearMiss).map((r) => r.item.id),
    };
  }, [q, items, scores, threshold, showNearMisses]);

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of rows) {
      const list = map.get(row.item.group) ?? [];
      list.push(row);
      map.set(row.item.group, list);
    }
    return groupOrder.filter((g) => map.has(g)).map((g) => [g, map.get(g) ?? []] as const);
  }, [rows, groupOrder]);

  const selectedHere = items.filter((i) => selected.has(i.id)).length;

  return (
    <section className="card overflow-hidden">
      <header className="flex items-start justify-between gap-4 px-6 pt-6">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/30">
            {props.icon}
          </div>
          <div>
            <p className="font-mono text-[10px] tracking-[0.25em] text-zinc-500 uppercase">{props.eyebrow}</p>
            <h2 className="font-display text-3xl leading-none text-white">{props.title}</h2>
          </div>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-zinc-400">
          {selectedHere} selected
        </span>
      </header>

      <div className="px-6 pt-5">
        <div className="group relative">
          <SearchIcon />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={props.placeholder}
            maxLength={120}
            className="w-full rounded-2xl border border-white/10 bg-ink-950/70 py-3.5 pr-24 pl-11 text-[15px] text-white placeholder:text-zinc-600 focus:border-accent/60 focus:ring-4 focus:ring-accent/15 focus:outline-none"
          />
          <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-2">
            <JevStatus state={jev.status} cached={jev.status === "done" && jev.cached} />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="rounded-full px-2 text-lg leading-none text-zinc-500 hover:text-white"
                aria-label="Clear"
              >
                ×
              </button>
            )}
          </div>
          {jev.status === "loading" && <div className="shimmer absolute right-6 bottom-0 left-6 h-px" />}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {props.examples.map((ex) => (
            <button
              key={ex}
              onClick={() => setQuery(ex)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                q === ex.toLowerCase()
                  ? "border-accent/60 bg-accent/15 text-glow"
                  : "border-white/10 text-zinc-400 hover:border-white/25 hover:text-zinc-200"
              }`}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {q && (
        <div className="mt-4 flex items-center justify-between gap-3 border-y border-white/5 bg-white/[0.02] px-6 py-2.5 text-xs text-zinc-500">
          <span>
            {jev.status === "error" ? (
              <span className="text-red-400">{jev.error}</span>
            ) : jev.status === "loading" ? (
              "Jev is judging every candidate…"
            ) : (
              <>
                <span className="font-mono text-zinc-300">{matchedIds.length}</span> matches at ≥
                <span className="font-mono text-zinc-300"> {Math.round(threshold * 100)}%</span>
                {nearMissCount > 0 && (
                  <button onClick={() => setShowNearMisses((s) => !s)} className="ml-3 text-zinc-400 underline-offset-2 hover:underline">
                    {showNearMisses ? "hide" : "show"} {nearMissCount} near misses
                  </button>
                )}
              </>
            )}
          </span>
          {matchedIds.length > 0 && (
            <button
              onClick={() => onSelectMany(matchedIds)}
              className="rounded-full bg-accent/15 px-3 py-1 font-medium text-glow ring-1 ring-accent/30 hover:bg-accent/25"
            >
              Select all matches
            </button>
          )}
        </div>
      )}

      <div className={`scroll-thin max-h-[26rem] overflow-y-auto px-3 pb-4 ${q ? "pt-2" : "mt-4 pt-2"}`}>
        {grouped.length === 0 && q && jev.status === "done" && (
          <p className="px-3 py-10 text-center text-sm text-zinc-500">
            Nothing clears the threshold. Try lowering it, or rephrasing.
          </p>
        )}
        {grouped.map(([group, groupRows]) => (
          <div key={group} className="mt-2">
            <p className="sticky top-0 z-10 bg-ink-900/95 px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] text-zinc-500 uppercase backdrop-blur">
              {group} <span className="text-zinc-700">· {groupRows.length}</span>
            </p>
            <ul>
              <AnimatePresence initial={false}>
                {groupRows.map((row) => (
                  <ResultRow
                    key={row.item.id}
                    row={row}
                    animate={!!q}
                    checked={selected.has(row.item.id)}
                    suggested={suggested.has(row.item.id)}
                    onToggle={() => onToggle(row.item.id)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResultRow(props: { row: Row; checked: boolean; suggested: boolean; animate: boolean; onToggle: () => void }) {
  const { row, checked } = props;
  const pct = row.score !== undefined ? Math.round(row.score * 100) : undefined;
  return (
    <motion.li
      initial={props.animate ? { opacity: 0, y: 4 } : false}
      animate={{ opacity: row.nearMiss ? 0.45 : 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <label
        className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-white/[0.04] ${
          checked ? "bg-accent/[0.07]" : ""
        }`}
      >
        <input type="checkbox" checked={checked} onChange={props.onToggle} className="peer sr-only" />
        <span
          className={`grid size-4.5 shrink-0 place-items-center rounded-md border transition ${
            checked ? "border-accent bg-accent text-ink-950" : "border-white/20 peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50"
          }`}
        >
          {checked && (
            <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M2.5 6.2 5 8.5l4.5-5" />
            </svg>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-zinc-100">
            {row.item.name}
            {row.item.sub && <span className="ml-1.5 text-xs text-zinc-500">{row.item.sub}</span>}
          </span>
        </span>
        {props.suggested && (
          <span className="rounded-full bg-lime/10 px-2 py-0.5 text-[10px] font-medium text-lime ring-1 ring-lime/30">suggested by Jev</span>
        )}
        {row.nameMatch && (
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400">name match</span>
        )}
        {pct !== undefined && (
          <span className="flex w-28 shrink-0 items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
              <motion.span
                className="block h-full rounded-full bg-gradient-to-r from-accent-deep to-accent"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </span>
            <span className="w-8 text-right font-mono text-[11px] text-zinc-400">{pct}%</span>
          </span>
        )}
      </label>
    </motion.li>
  );
}

function JevStatus({ state, cached }: { state: string; cached: boolean }) {
  if (state === "idle") return null;
  const label = state === "loading" ? "thinking" : state === "error" ? "error" : cached ? "cached" : "jev";
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase ${
        state === "error" ? "bg-red-500/10 text-red-300" : "bg-accent/10 text-glow"
      }`}
    >
      <span className={`size-1.5 rounded-full ${state === "loading" ? "animate-pulse bg-accent" : state === "error" ? "bg-red-400" : "bg-lime"}`} />
      {label}
    </span>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-zinc-500 group-focus-within:text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="9" cy="9" r="6" />
      <path d="m14 14 3.5 3.5" strokeLinecap="round" />
    </svg>
  );
}
