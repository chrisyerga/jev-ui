import { useEffect, useRef, useState } from "react";
import type { FitResult, TableDataset } from "../shared/api";
import { api } from "./api";

export type JevColumnState =
  | { status: "loading" }
  | { status: "done"; results: Record<string, FitResult>; cached: boolean }
  | { status: "error"; error: string };

export function columnKey(attribute: string) {
  return attribute.trim().toLowerCase();
}

/**
 * Fetches each attribute's column once per dataset; removed columns keep their results so re-adding is instant.
 * The result is keyed by `columnKey(attribute)`.
 */
export function useJevColumns(dataset: TableDataset, attributes: string[]): Record<string, JevColumnState> {
  const [entries, setEntries] = useState<Record<string, JevColumnState>>({});
  const requested = useRef(new Set<string>());

  useEffect(() => {
    for (const attribute of attributes) {
      const attr = columnKey(attribute);
      const key = `${dataset}:${attr}`;
      if (requested.current.has(key)) continue;
      requested.current.add(key);
      api
        .column({ dataset, attribute: attr })
        .then((res) =>
          setEntries((e) => ({ ...e, [key]: { status: "done", results: res.results, cached: res.debug.cached } })),
        )
        .catch((err: unknown) => {
          requested.current.delete(key);
          setEntries((e) => ({ ...e, [key]: { status: "error", error: err instanceof Error ? err.message : String(err) } }));
        });
    }
  }, [dataset, attributes]);

  return Object.fromEntries(
    attributes.map((a) => {
      const attr = columnKey(a);
      return [attr, entries[`${dataset}:${attr}`] ?? { status: "loading" }];
    }),
  );
}
