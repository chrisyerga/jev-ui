import type {
  BriefRequest,
  BriefResponse,
  ColumnRequest,
  ColumnResponse,
  FilterRequest,
  FilterResponse,
  FitRequest,
  FitResponse,
  JevCallDebug,
} from "../shared/api";
import { recordCall } from "./inspector";

async function post<Res extends { debug: JevCallDebug }>(endpoint: string, body: unknown, signal?: AbortSignal): Promise<Res> {
  const started = performance.now();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const roundTripMs = Math.round(performance.now() - started);
  const data: unknown = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) {
    const error =
      typeof data === "object" && data && "error" in data && typeof data.error === "string" ? data.error : `HTTP ${res.status}`;
    recordCall({ at: new Date(), endpoint, body, roundTripMs, error });
    throw new Error(error);
  }
  const typed = data as Res;
  recordCall({ at: new Date(), endpoint, body, roundTripMs, debug: typed.debug });
  return typed;
}

export const api = {
  filter: (body: FilterRequest, signal?: AbortSignal) => post<FilterResponse>("/api/filter", body, signal),
  brief: (body: BriefRequest, signal?: AbortSignal) => post<BriefResponse>("/api/brief", body, signal),
  fit: (body: FitRequest, signal?: AbortSignal) => post<FitResponse>("/api/fit", body, signal),
  column: (body: ColumnRequest, signal?: AbortSignal) => post<ColumnResponse>("/api/column", body, signal),
};
