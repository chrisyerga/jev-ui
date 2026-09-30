import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Inspector } from "../components/Inspector";
import { JevStatus, SearchIcon } from "../components/SmartFilter";
import { ThresholdSlider } from "../components/ThresholdSlider";
import { MOVIES, type Movie } from "../data/movies";
import { Link } from "../lib/router";
import { columnKey, useJevColumns, type JevColumnState } from "../lib/useJevColumns";
import { useJevFilter } from "../lib/useJevFilter";
import { COLUMN_LEVELS, LIMITS, type FitResult } from "../shared/api";

const FILTER_EXAMPLES = ["star", "tarantino", "funny and gory", "set in tokyo", "will make me cry", "heist"];
const COLUMN_EXAMPLES = ["how scary", "how funny", "date-night friendly", "OK for a 10-year-old", "has a twist ending", "visually stunning"];
const MAX_COLUMNS = 4;
const NEAR_MISS_BAND = 0.25;
const LEVEL_NAMES = COLUMN_LEVELS.map((l) => l.split(":")[0] ?? l);

type FixedKey = "title" | "year" | "genre" | "director" | "relevance";
type SortKey = FixedKey | `col:${string}`;
type Sort = { key: SortKey | "auto"; dir: 1 | -1 };

interface Row {
  movie: Movie;
  textMatch: boolean;
  score?: number;
  nearMiss: boolean;
}

const TEXT_OF = new Map(MOVIES.map((m) => [m.id, `${m.title} ${m.year} ${m.genre} ${m.director}`.toLowerCase()]));

export default function SmartTable() {
  const [query, setQuery] = useState("");
  const [threshold, setThreshold] = useState(0.5);
  const [showNearMisses, setShowNearMisses] = useState(false);
  const [columns, setColumns] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "auto", dir: 1 });

  const q = query.trim().toLowerCase();
  const jev = useJevFilter("movies", query);
  const columnStates = useJevColumns(columns);
  const scores = jev.status === "done" ? jev.scores : undefined;

  const { rows, textMatches, jevMatches, nearMissCount } = useMemo(() => {
    let text = 0;
    let semantic = 0;
    let near = 0;
    const out: Row[] = [];
    for (const movie of MOVIES) {
      if (!q) {
        out.push({ movie, textMatch: false, nearMiss: false });
        continue;
      }
      const textMatch = TEXT_OF.get(movie.id)?.includes(q) ?? false;
      const score = scores?.[movie.id];
      const jevMatch = score !== undefined && score >= threshold;
      const nearMiss = !textMatch && !jevMatch && score !== undefined && score >= threshold - NEAR_MISS_BAND;
      if (textMatch) text += 1;
      else if (jevMatch) semantic += 1;
      if (nearMiss) near += 1;
      if (textMatch || jevMatch || (nearMiss && showNearMisses)) out.push({ movie, textMatch, score, nearMiss });
    }
    return { rows: out, textMatches: text, jevMatches: semantic, nearMissCount: near };
  }, [q, scores, threshold, showNearMisses]);

  const effectiveSort: Sort = sort.key === "auto" ? (q ? { key: "relevance", dir: -1 } : { key: "title", dir: 1 }) : sort;

  const sortedRows = sortRows(rows, effectiveSort, columnStates);

  function toggleSort(key: SortKey) {
    const numeric = key === "year" || key === "relevance" || key.startsWith("col:");
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: numeric ? -1 : 1 }));
  }

  function addColumn(attribute: string) {
    const clean = attribute.trim().slice(0, LIMITS.attributeChars);
    if (!clean) return;
    const key = columnKey(clean);
    setDraft("");
    setSort({ key: `col:${key}`, dir: -1 });
    if (columns.some((c) => columnKey(c) === key)) return;
    setColumns((cols) => [...cols, clean].slice(-MAX_COLUMNS));
  }

  function removeColumn(attribute: string) {
    const key = columnKey(attribute);
    setColumns((cols) => cols.filter((c) => columnKey(c) !== key));
    setSort((s) => (s.key === `col:${key}` ? { key: "auto", dir: 1 } : s));
  }

  function onSubmitColumn(e: FormEvent) {
    e.preventDefault();
    addColumn(draft);
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
          <h1 className="mt-3 font-display text-6xl leading-[0.9] text-white sm:text-7xl">
            Self-aware <em className="text-glow">Tables</em>
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-400">
            Filter and sort by attributes the table doesn't have. Type <Kbd>funny and gory</Kbd> to filter, or add a column
            like <Kbd>how scary</Kbd>. The table stores only title, year, genre and director; Jev knows the rest.
          </p>
        </div>
        <ThresholdSlider value={threshold} onChange={setThreshold} />
      </header>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <ControlCard eyebrow="Filter rows" hint="Text matches show instantly; Jev judges every movie after you pause.">
          <div className="group relative">
            <SearchIcon />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try “star”, “funny and gory”, “set in tokyo”…"
              maxLength={LIMITS.queryChars}
              className={`${INPUT} pr-24 pl-11`}
            />
            <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-2">
              <JevStatus state={jev.status} cached={jev.status === "done" && jev.cached} />
              {query && (
                <button onClick={() => setQuery("")} className="px-2 text-lg leading-none text-zinc-500 hover:text-white" aria-label="Clear filter">
                  ×
                </button>
              )}
            </div>
            {jev.status === "loading" && <div className="shimmer absolute right-6 bottom-0 left-6 h-px" />}
          </div>
          <Chips items={FILTER_EXAMPLES} active={(ex) => q === ex} onPick={setQuery} />
        </ControlCard>

        <ControlCard eyebrow="Add a column" hint={`Jev rates every movie on it, 0 to 3. Up to ${MAX_COLUMNS} columns.`}>
          <form onSubmit={onSubmitColumn} className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Any quality: “how scary”, “good for a rainy day”…"
              maxLength={LIMITS.attributeChars}
              className={`${INPUT} flex-1 px-4`}
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="rounded-2xl bg-accent px-5 font-semibold text-ink-950 transition hover:bg-glow disabled:opacity-40"
            >
              Add
            </button>
          </form>
          <Chips
            items={COLUMN_EXAMPLES}
            active={(ex) => columns.some((c) => columnKey(c) === columnKey(ex))}
            onPick={addColumn}
          />
        </ControlCard>
      </div>

      <section className="card mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-3 text-xs text-zinc-500">
          <span>
            <span className="font-mono text-zinc-300">{sortedRows.filter((r) => !r.nearMiss).length}</span> of{" "}
            <span className="font-mono text-zinc-300">{MOVIES.length}</span> movies
            {q && (
              <>
                {" · "}
                {textMatches} text match{textMatches === 1 ? "" : "es"}
                {jev.status === "loading" && " · Jev is judging every movie…"}
                {jev.status === "error" && <span className="text-red-400"> · {jev.error}</span>}
                {jev.status === "done" && ` · ${jevMatches} more from Jev at ≥ ${Math.round(threshold * 100)}%`}
                {nearMissCount > 0 && (
                  <button onClick={() => setShowNearMisses((s) => !s)} className="ml-3 text-zinc-400 underline-offset-2 hover:underline">
                    {showNearMisses ? "hide" : "show"} {nearMissCount} near misses
                  </button>
                )}
              </>
            )}
          </span>
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase">Click a header to sort</span>
        </div>

        <div className="scroll-thin max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[56rem] border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-ink-900/95 backdrop-blur">
              <tr>
                <Th label="Title" sortKey="title" sort={effectiveSort} onSort={toggleSort} className="pl-6" />
                <Th label="Year" sortKey="year" sort={effectiveSort} onSort={toggleSort} className="w-20" />
                {q && <Th label="Match" sortKey="relevance" sort={effectiveSort} onSort={toggleSort} className="w-36" />}
                {columns.map((attribute) => (
                  <Th
                    key={columnKey(attribute)}
                    label={attribute}
                    sortKey={`col:${columnKey(attribute)}`}
                    sort={effectiveSort}
                    onSort={toggleSort}
                    jev
                    onRemove={() => removeColumn(attribute)}
                    className="w-40"
                  />
                ))}
                <Th label="Genre" sortKey="genre" sort={effectiveSort} onSort={toggleSort} className="w-28" />
                <Th label="Director" sortKey="director" sort={effectiveSort} onSort={toggleSort} className="pr-6" />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.movie.id} className={`transition hover:bg-white/[0.03] ${row.nearMiss ? "opacity-45" : ""}`}>
                  <Td className="min-w-48 pl-6 text-zinc-100">{row.movie.title}</Td>
                  <Td className="font-mono text-xs text-zinc-400">{row.movie.year}</Td>
                  {q && (
                    <Td>
                      <MatchCell row={row} />
                    </Td>
                  )}
                  {columns.map((attribute) => {
                    const state = columnStates[columnKey(attribute)];
                    return (
                      <Td key={columnKey(attribute)}>
                        <ColumnCell state={state} result={state?.status === "done" ? state.results[row.movie.id] : undefined} />
                      </Td>
                    );
                  })}
                  <Td className="whitespace-nowrap text-zinc-400">{row.movie.genre}</Td>
                  <Td className="whitespace-nowrap pr-6 text-zinc-400">{row.movie.director}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedRows.length === 0 && jev.status !== "loading" && (
            <p className="px-6 py-14 text-center text-sm text-zinc-500">Nothing clears the threshold. Try lowering it, or rephrasing.</p>
          )}
        </div>
      </section>

      <footer className="mt-12 text-center text-xs text-zinc-600">
        Powered by Jev from{" "}
        <a href="https://typesafe.ai" className="text-zinc-400 hover:text-white">
          TypeSafe
        </a>{" "}
        · Jev sees only “Title (Year)” for each movie
      </footer>

      <Inspector />
    </div>
  );
}

function sortRows(rows: Row[], { key, dir }: Sort, columnStates: Record<string, JevColumnState>) {
  const valueOf = (row: Row): string | number => {
    if (key === "relevance") return (row.textMatch ? 1 : 0) + (row.score ?? 0);
    if (key.startsWith("col:")) {
      const state = columnStates[key.slice(4)];
      return state?.status === "done" ? (state.results[row.movie.id]?.score ?? -1) : -1;
    }
    return row.movie[key as Exclude<FixedKey, "relevance">];
  };
  return [...rows].sort((a, b) => {
    const va = valueOf(a);
    const vb = valueOf(b);
    const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    return cmp * dir || a.movie.title.localeCompare(b.movie.title);
  });
}

const INPUT =
  "w-full rounded-2xl border border-white/10 bg-ink-950/70 py-3.5 text-[15px] text-white placeholder:text-zinc-600 focus:border-accent/60 focus:ring-4 focus:ring-accent/15 focus:outline-none";

function ControlCard({ eyebrow, hint, children }: { eyebrow: string; hint: string; children: ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-[10px] tracking-[0.25em] text-zinc-500 uppercase">{eyebrow}</p>
        <p className="text-xs text-zinc-500">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function Chips({ items, active, onPick }: { items: string[]; active: (item: string) => boolean; onPick: (item: string) => void }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPick(item)}
          className={`rounded-full border px-3 py-1 text-xs transition ${
            active(item.toLowerCase())
              ? "border-accent/60 bg-accent/15 text-glow"
              : "border-white/10 text-zinc-400 hover:border-white/25 hover:text-zinc-200"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function Th(props: {
  label: string;
  sortKey: SortKey;
  sort: Sort;
  onSort: (key: SortKey) => void;
  jev?: boolean;
  onRemove?: () => void;
  className?: string;
}) {
  const active = props.sort.key === props.sortKey;
  return (
    <th className={`border-b border-white/10 px-3 py-3 font-normal ${props.className ?? ""}`} aria-sort={active ? (props.sort.dir === 1 ? "ascending" : "descending") : undefined}>
      <span className="flex items-center gap-1.5">
        <button
          onClick={() => props.onSort(props.sortKey)}
          className={`flex min-w-0 items-center gap-1.5 text-left font-mono text-[10px] tracking-[0.18em] uppercase transition hover:text-white ${
            active ? "text-white" : "text-zinc-500"
          }`}
        >
          {props.jev && <span className="size-1.5 shrink-0 rounded-full bg-lime" title="Column computed by Jev" />}
          <span className={props.jev ? "truncate text-lime normal-case tracking-normal font-sans text-xs" : ""}>{props.label}</span>
          <span className={active ? "text-accent" : "text-transparent"}>{props.sort.dir === 1 ? "↑" : "↓"}</span>
        </button>
        {props.onRemove && (
          <button onClick={props.onRemove} className="text-zinc-600 hover:text-white" aria-label={`Remove column ${props.label}`}>
            ×
          </button>
        )}
      </span>
    </th>
  );
}

function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={`border-b border-white/5 px-3 py-2.5 ${className ?? ""}`}>{children}</td>;
}

function MatchCell({ row }: { row: Row }) {
  if (row.score === undefined) {
    return row.textMatch ? (
      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400">text match</span>
    ) : null;
  }
  const pct = Math.round(row.score * 100);
  return (
    <span className="flex items-center gap-2" title={row.textMatch ? "Text match, also judged by Jev" : "Judged by Jev"}>
      <Bar fraction={row.score} className="from-accent-deep to-accent" />
      <span className="w-8 text-right font-mono text-[11px] text-zinc-400">{pct}%</span>
    </span>
  );
}

function ColumnCell({ state, result }: { state: JevColumnState | undefined; result: FitResult | undefined }) {
  if (!state || state.status === "loading") return <span className="block h-1.5 w-full animate-pulse rounded-full bg-white/5" />;
  if (state.status === "error") return <span className="text-xs text-red-400" title={state.error}>error</span>;
  if (!result) return null;
  const level = LEVEL_NAMES[Math.round(result.score)] ?? "";
  return (
    <span
      className="flex items-center gap-2"
      style={{ opacity: 0.45 + 0.55 * result.confidence }}
      title={`${level} · score ${result.score.toFixed(2)} of 3 · confidence ${Math.round(result.confidence * 100)}%`}
    >
      <Bar fraction={result.score / 3} className="from-lime/50 to-lime" />
      <span className="w-16 truncate text-[11px] text-zinc-400">{level}</span>
    </span>
  );
}

function Bar({ fraction, className }: { fraction: number; className: string }) {
  return (
    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
      <span className={`block h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ${className}`} style={{ width: `${Math.round(fraction * 100)}%` }} />
    </span>
  );
}

function Kbd({ children }: { children: string }) {
  return <span className="rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[0.85em] text-zinc-200">{children}</span>;
}
