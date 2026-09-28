export type FilterKind = "geo" | "demo";

export const LIMITS = {
  queryChars: 120,
  briefChars: 1000,
  fitSelections: 60,
} as const;

export interface JevCallDebug {
  chunks: number;
  questions: number;
  inputTokens: number;
  latencyMs: number;
  model: string;
  cached: boolean;
  /** First chunk's request, with the question list truncated for display. */
  sampleRequest: unknown;
  /** First chunk's answers, truncated for display. */
  sampleAnswers: unknown;
}

export interface FilterRequest {
  kind: FilterKind;
  query: string;
}

export interface FilterResponse {
  /** Probability of "yes" per candidate id. */
  scores: Record<string, number>;
  debug: JevCallDebug;
}

export interface BriefRequest {
  brief: string;
}

export interface BriefResponse {
  geoGate: number;
  demoGate: number;
  geo: Record<string, number>;
  demo: Record<string, number>;
  debug: JevCallDebug;
}

export interface FitRequest {
  product: string;
  selections: string[];
}

export const FIT_LEVELS = [
  "Poor fit: these people or places are unlikely to want or buy this at all",
  "Weak fit: only a small share would care about this",
  "Reasonable fit: a meaningful share are plausible customers",
  "Strong fit: a core audience or market for this",
] as const;

export interface FitResult {
  /** Probability-weighted level, 0 (poor) to 3 (strong). */
  score: number;
  confidence: number;
}

export interface FitResponse {
  results: Record<string, FitResult>;
  debug: JevCallDebug;
}

export interface ApiError {
  error: string;
}
