import { useMemo, useState } from "react";
import { BriefBox } from "../components/BriefBox";
import { FitPanel } from "../components/FitPanel";
import { Inspector } from "../components/Inspector";
import { SmartFilter, type FilterItem } from "../components/SmartFilter";
import { SummaryPanel } from "../components/SummaryPanel";
import { ThresholdSlider } from "../components/ThresholdSlider";
import { DEMO_GROUPS, DEMO_ITEMS } from "../data/demographics";
import { GEO_ITEMS } from "../data/geo";
import { api } from "../lib/api";
import { Link } from "../lib/router";
import { LIMITS, type FitResult } from "../shared/api";

const GEO_FILTER_ITEMS: FilterItem[] = GEO_ITEMS.map((g) => ({
  id: g.id,
  name: g.name,
  sub: g.kind === "city" ? g.stateCode : undefined,
  group: g.kind === "state" ? "States" : "Cities",
  searchText: `${g.name} ${g.stateName} ${g.stateCode}`.toLowerCase(),
}));

const DEMO_FILTER_ITEMS: FilterItem[] = DEMO_ITEMS.map((d) => ({
  id: d.id,
  name: d.name,
  group: d.group,
  searchText: `${d.name} ${d.group}`.toLowerCase(),
}));

const PREFILL_GATE = 0.5;
const PREFILL_MAX = { geo: 25, demo: 20 };

function topAbove(scores: Record<string, number>, threshold: number, max: number) {
  return Object.entries(scores)
    .filter(([, p]) => p >= threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([id]) => id);
}

type Note = { tone: "ok" | "warn" | "error"; text: string };

export default function TargetingLab() {
  const [threshold, setThreshold] = useState(0.5);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [suggested, setSuggested] = useState<Set<string>>(new Set());
  const [brief, setBrief] = useState("");
  const [briefBusy, setBriefBusy] = useState(false);
  const [briefNote, setBriefNote] = useState<Note>();
  const [fit, setFit] = useState<{ key: string; results: Record<string, FitResult> }>();
  const [fitBusy, setFitBusy] = useState(false);
  const [fitError, setFitError] = useState<string>();

  const fitKey = useMemo(() => `${brief.trim()}|${[...selected].sort().join(",")}`, [brief, selected]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectMany = (ids: string[]) => setSelected((s) => new Set([...s, ...ids]));

  async function prefill() {
    setBriefBusy(true);
    setBriefNote(undefined);
    try {
      const res = await api.brief({ brief });
      const geoIds = res.geoGate >= PREFILL_GATE ? topAbove(res.geo, threshold, PREFILL_MAX.geo) : [];
      const demoIds = res.demoGate >= PREFILL_GATE ? topAbove(res.demo, threshold, PREFILL_MAX.demo) : [];
      const ids = [...geoIds, ...demoIds];
      setSelected(new Set(ids));
      setSuggested(new Set(ids));
      const pct = (p: number) => `${Math.round(p * 100)}%`;
      const parts = [
        res.geoGate >= PREFILL_GATE
          ? `${geoIds.length} place${geoIds.length === 1 ? "" : "s"}`
          : `no places (brief has no geographic focus, gate ${pct(res.geoGate)})`,
        res.demoGate >= PREFILL_GATE
          ? `${demoIds.length} audience segment${demoIds.length === 1 ? "" : "s"}`
          : `no segments (no audience implied, gate ${pct(res.demoGate)})`,
      ];
      setBriefNote({ tone: ids.length ? "ok" : "warn", text: `Jev pre-filled ${parts.join(" and ")}.` });
    } catch (err) {
      setBriefNote({ tone: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBriefBusy(false);
    }
  }

  async function checkFit() {
    setFitBusy(true);
    setFitError(undefined);
    try {
      const selections = [...selected].slice(0, LIMITS.fitSelections);
      const res = await api.fit({ product: brief, selections });
      setFit({ key: fitKey, results: res.results });
    } catch (err) {
      setFitError(err instanceof Error ? err.message : String(err));
    } finally {
      setFitBusy(false);
    }
  }

  const fitResults = fit?.results;

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-4 pt-10 pb-28 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.3em] uppercase">
            <Link to="/" className="text-zinc-500 transition hover:text-white">
              ← Jev UI Playground
            </Link>
            <span className="text-zinc-700">/</span>
            <span className="text-accent">Experiment 03</span>
          </p>
          <h1 className="title-display editorial-glow mt-3 text-6xl leading-[0.9] text-white sm:text-7xl">
            Targeting <span className="title-accent">Lab</span>
          </h1>
          <p className="mt-3 max-w-xl text-zinc-400">
            Filter boxes that understand intent. Type <Kbd>coastal</Kbd> or <Kbd>about to retire</Kbd> and Jev judges
            every place and segment from its own world knowledge. The lists store nothing but names.
          </p>
        </div>
        <ThresholdSlider value={threshold} onChange={setThreshold} />
      </header>

      <div className="mt-8">
        <BriefBox value={brief} onChange={setBrief} onPrefill={prefill} busy={briefBusy} note={briefNote} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-6 xl:grid-cols-2">
          <SmartFilter
            kind="geo"
            eyebrow="Step 1"
            title="Geography"
            icon={<GlobeIcon />}
            placeholder="Try “coastal”, “ski towns”, “rust belt”…"
            examples={["coastal", "ski towns", "rust belt", "battleground states", "college towns", "hurricane prone"]}
            items={GEO_FILTER_ITEMS}
            groupOrder={["States", "Cities"]}
            selected={selected}
            suggested={suggested}
            threshold={threshold}
            onToggle={toggle}
            onSelectMany={selectMany}
          />
          <SmartFilter
            kind="demo"
            eyebrow="Step 2"
            title="Demographics"
            icon={<PeopleIcon />}
            placeholder="Try “buys almond milk”, “about to retire”…"
            examples={["buys almond milk", "about to retire", "new parents", "weekend warriors", "Gen Z", "affluent"]}
            items={DEMO_FILTER_ITEMS}
            groupOrder={DEMO_GROUPS}
            selected={selected}
            suggested={suggested}
            threshold={threshold}
            onToggle={toggle}
            onSelectMany={selectMany}
          />
        </div>
        <div className="lg:sticky lg:top-6 lg:self-start">
          <SummaryPanel
            selected={selected}
            suggested={suggested}
            fit={fitResults}
            onRemove={toggle}
            onClear={() => {
              setSelected(new Set());
              setSuggested(new Set());
            }}
          >
            <FitPanel
              canCheck={!!brief.trim() && selected.size > 0}
              hasBrief={!!brief.trim()}
              busy={fitBusy}
              stale={!!fit && fit.key !== fitKey}
              error={fitError}
              results={fitResults}
              onCheck={checkFit}
            />
          </SummaryPanel>
        </div>
      </div>

      <footer className="mt-12 text-center text-xs text-zinc-600">
        Powered by Jev from{" "}
        <a href="https://typesafe.ai" className="text-zinc-400 hover:text-white">
          TypeSafe
        </a>{" "}
        · one Noul question per candidate, batched per request
      </footer>

      <Inspector />
    </div>
  );
}

function Kbd({ children }: { children: string }) {
  return <span className="rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[0.85em] text-zinc-200">{children}</span>;
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 14.6c2.8.1 4.6 1.8 5.3 4.9" />
    </svg>
  );
}
