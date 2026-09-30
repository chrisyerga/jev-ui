import type { FormId } from "../data/forms";
import type { CrossCheckResponse, FieldCheck } from "../shared/api";
import { api } from "./api";
import { useJevRequest } from "./useJevRequest";

const DEBOUNCE_MS = 400;

/** Checks `values`, which should only change when a field is committed (on blur), not on every keystroke. */
export function useCrossCheck(form: FormId, values: Record<string, string>, today: string) {
  const filled = Object.entries(values)
    .map(([k, v]) => [k, v.trim()] as const)
    .filter(([, v]) => v);
  const key = filled.length >= 2 ? JSON.stringify([form, today, filled]) : null;
  return useJevRequest<CrossCheckResponse>(
    key,
    (signal) => api.crossCheck({ form, values: Object.fromEntries(filled), today }, signal),
    DEBOUNCE_MS,
  );
}

export interface CrossWarning {
  /** Stable while the same fields are involved. */
  id: string;
  /** The field most likely to be the mistake. */
  primary: string;
  /** Fields it clashes with: its own pick first, then the most suspicious. */
  others: string[];
  score: number;
}

/**
 * Groups flagged fields with the fields they clash with. Mutual flags ("City clashes with Postal code" and
 * "Postal code clashes with City") and fan-ins ("City, State and Street all clash with Postal code") become
 * one warning, blamed on the most suspicious member.
 */
export function buildWarnings(fields: Record<string, FieldCheck>, threshold: number): CrossWarning[] {
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    const p = parent.get(k) ?? k;
    if (p === k) return k;
    const root = find(p);
    parent.set(k, root);
    return root;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));

  const flagged = Object.keys(fields).filter((k) => (fields[k]?.suspicion ?? 0) >= threshold);
  for (const k of flagged) {
    parent.set(k, find(k));
    const partner = fields[k]?.clashWith;
    if (partner && partner !== k && fields[partner]) union(k, partner);
  }

  const groups = new Map<string, string[]>();
  for (const k of parent.keys()) {
    const root = find(k);
    groups.set(root, [...(groups.get(root) ?? []), k]);
  }

  const suspicion = (k: string) => fields[k]?.suspicion ?? 0;
  return [...groups.values()]
    .map((members) => {
      const [primary = "", ...rest] = [...members].sort((a, b) => suspicion(b) - suspicion(a));
      const pick = fields[primary]?.clashWith;
      const others = pick && rest.includes(pick) ? [pick, ...rest.filter((k) => k !== pick)] : rest;
      return { id: [...members].sort().join("+"), primary, others, score: suspicion(primary) };
    })
    .sort((a, b) => b.score - a.score);
}
