import { useEffect, useState } from "react";
import type { FilterKind } from "../shared/api";
import { api } from "./api";

type Entry = { scores: Record<string, number>; cached: boolean } | { error: string };

export type JevFilterState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; scores: Record<string, number>; cached: boolean }
  | { status: "error"; error: string };

const DEBOUNCE_MS = 450;

export function useJevFilter(kind: FilterKind, query: string): JevFilterState {
  const key = query.trim().toLowerCase();
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const hasEntry = key in entries;

  useEffect(() => {
    if (!key || hasEntry) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .filter({ kind, query: key }, controller.signal)
        .then((res) => setEntries((e) => ({ ...e, [key]: { scores: res.scores, cached: res.debug.cached } })))
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setEntries((e) => ({ ...e, [key]: { error: err instanceof Error ? err.message : String(err) } }));
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [kind, key, hasEntry]);

  if (!key) return { status: "idle" };
  const entry = entries[key];
  if (!entry) return { status: "loading" };
  if ("error" in entry) return { status: "error", error: entry.error };
  return { status: "done", scores: entry.scores, cached: entry.cached };
}
