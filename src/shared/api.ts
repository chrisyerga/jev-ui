export type FilterKind = "geo" | "demo" | "movies";

export const LIMITS = {
  queryChars: 120,
  briefChars: 1000,
  fitSelections: 60,
  attributeChars: 80,
  formValueChars: 300,
  fieldLabelChars: 80,
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

export const COLUMN_LEVELS = [
  "Not at all: `attribute` does not describe this movie",
  "Slightly: a little, or only in parts",
  "Clearly: a fair description of this movie",
  "Extremely: one of the strongest examples of `attribute`",
] as const;

export interface ColumnRequest {
  attribute: string;
}

export interface ColumnResponse {
  /** Probability-weighted level per movie id, 0 (not at all) to 3 (extremely). */
  results: Record<string, FitResult>;
  debug: JevCallDebug;
}

export interface CrossCheckRequest {
  form: string;
  /** Field key to value; blank fields are ignored. */
  values: Record<string, string>;
  /** The user's local date as YYYY-MM-DD, so relative dates ("tomorrow") can be checked. */
  today: string;
}

export interface FieldCheck {
  /** Probability that this field contradicts the rest of the form. */
  suspicion: number;
  /** Key of the field it most likely clashes with, or null if it clashes with none in particular. */
  clashWith: string | null;
  clashConfidence: number;
}

export interface CrossCheckResponse {
  /** Per filled field key. */
  fields: Record<string, FieldCheck>;
  debug: JevCallDebug;
}

export interface FieldSpecRequest {
  label: string;
  context: string;
}

export interface ChoiceResult {
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface FieldSpecResponse {
  inputType: ChoiceResult;
  optionSet: ChoiceResult;
  /** The best default option for every option set, keyed by option set id. */
  defaults: Record<string, ChoiceResult>;
  /** Probability that this field should come pre-filled at all. */
  shouldDefault: number;
  /** For toggles: probability the sensible default is on. */
  toggleOn: number;
  debug: JevCallDebug;
}

export interface ApiError {
  error: string;
}
