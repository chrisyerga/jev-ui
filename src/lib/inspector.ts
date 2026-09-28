import { useSyncExternalStore } from "react";
import type { JevCallDebug } from "../shared/api";

export interface CallLog {
  id: number;
  at: Date;
  endpoint: string;
  body: unknown;
  roundTripMs: number;
  debug?: JevCallDebug;
  error?: string;
}

let logs: CallLog[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

export function recordCall(entry: Omit<CallLog, "id">) {
  logs = [{ ...entry, id: nextId++ }, ...logs].slice(0, 50);
  listeners.forEach((l) => l());
}

export function clearCalls() {
  logs = [];
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCallLogs() {
  return useSyncExternalStore(subscribe, () => logs);
}
