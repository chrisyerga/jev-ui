import { useEffect, useRef, useState } from "react";

type Entry<T> = { data: T } | { error: string };

export type JevRequestState<T> =
  | { status: "idle" }
  | { status: "loading"; previous?: T }
  | { status: "done"; data: T }
  | { status: "error"; error: string; previous?: T };

/**
 * Debounced, memoized request keyed by `key`; a null key means there is nothing to ask.
 * While a new key loads, the last successful result is exposed as `previous` so the UI can avoid flicker.
 */
export function useJevRequest<T>(key: string | null, run: (signal: AbortSignal) => Promise<T>, debounceMs: number): JevRequestState<T> {
  const [entries, setEntries] = useState<Record<string, Entry<T>>>({});
  const [lastDone, setLastDone] = useState<string>();
  const runRef = useRef(run);
  const hasEntry = key !== null && key in entries;

  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    if (key === null || hasEntry) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      runRef
        .current(controller.signal)
        .then((data) => {
          setEntries((e) => ({ ...e, [key]: { data } }));
          setLastDone(key);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setEntries((e) => ({ ...e, [key]: { error: err instanceof Error ? err.message : String(err) } }));
        });
    }, debounceMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, hasEntry, debounceMs]);

  if (key === null) return { status: "idle" };
  const last = lastDone === undefined ? undefined : entries[lastDone];
  const previous = last && "data" in last ? last.data : undefined;
  const entry = entries[key];
  if (!entry) return { status: "loading", previous };
  if ("error" in entry) return { status: "error", error: entry.error, previous };
  return { status: "done", data: entry.data };
}
