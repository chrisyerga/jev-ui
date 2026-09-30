import { useEffect, useRef, useState } from "react";
import type { FitResult } from "../shared/api";
import { api } from "./api";

export type JevColumnState =
  | { status: "loading" }
  | { status: "done"; results: Record<string, FitResult>; cached: boolean }
  | { status: "error"; error: string };

export function columnKey(attribute: string) {
  return attribute.trim().toLowerCase();
}

/** Fetches each attribute's column once; removed columns keep their results so re-adding is instant. */
export function useJevColumns(attributes: string[]): Record<string, JevColumnState> {
  const [entries, setEntries] = useState<Record<string, JevColumnState>>({});
  const requested = useRef(new Set<string>());

  useEffect(() => {
    for (const attribute of attributes) {
      const key = columnKey(attribute);
      if (requested.current.has(key)) continue;
      requested.current.add(key);
      api
        .column({ attribute: key })
        .then((res) =>
          setEntries((e) => ({ ...e, [key]: { status: "done", results: res.results, cached: res.debug.cached } })),
        )
        .catch((err: unknown) => {
          requested.current.delete(key);
          setEntries((e) => ({ ...e, [key]: { status: "error", error: err instanceof Error ? err.message : String(err) } }));
        });
    }
  }, [attributes]);

  return Object.fromEntries(
    attributes.map((a) => {
      const key = columnKey(a);
      return [key, entries[key] ?? { status: "loading" }];
    }),
  );
}
