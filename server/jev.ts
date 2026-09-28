import {
  TypeSafeClient,
  type ChoiceResponse,
  type JsonValue,
  type NoulResponse,
  type Question,
  type Questions,
  type ScoreResponse,
} from "@typesafe-ai/sdk";
import type { JevCallDebug } from "../src/shared/api.js";

export type Answer = NoulResponse | ScoreResponse | ChoiceResponse;

let client: TypeSafeClient | undefined;

function getClient() {
  client ??= new TypeSafeClient({ timeout: 30_000 });
  return client;
}

/** Questions per request; larger sets are split and sent in parallel to stay under the context budget. */
export const CHUNK_SIZE = Number(process.env.JEV_CHUNK_SIZE ?? 400);

export interface JudgeOptions {
  items: { id: string; label: string }[];
  /** State shared by every question, e.g. the filter text. */
  state: Record<string, JsonValue>;
  /**
   * Question about one candidate. Put the candidate's label in the question itself:
   * pointing at `list[i]` in state is an extra hop that Jev resolves poorly.
   */
  buildQuestion: (label: string) => Question;
  /** Questions about the shared state only, asked once in the first chunk. */
  extraQuestions?: Questions;
}

export interface JudgeResult {
  byId: Record<string, Answer>;
  extra: Record<string, Answer>;
  debug: JevCallDebug;
}

const SAMPLE_QUESTIONS = 3;

function sample<T>(entries: [string, T][], n: number) {
  const shown = Object.fromEntries(entries.slice(0, n));
  return entries.length > n ? { ...shown, [`…${entries.length - n} more`]: null } : shown;
}

export async function judgeCandidates(opts: JudgeOptions): Promise<JudgeResult> {
  const { items, state, buildQuestion, extraQuestions = {} } = opts;
  const chunks: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += CHUNK_SIZE) chunks.push(items.slice(i, i + CHUNK_SIZE));
  if (chunks.length === 0) chunks.push([]);

  const started = performance.now();
  const results = await Promise.all(
    chunks.map((chunk, chunkIndex) => {
      const questions: Questions = {};
      chunk.forEach((item, i) => {
        questions[`c${i}`] = buildQuestion(item.label);
      });
      if (chunkIndex === 0) {
        for (const [key, q] of Object.entries(extraQuestions)) questions[`x_${key}`] = q;
      }
      return getClient()
        .systemOne({ state, questions })
        .then((res) => ({ chunk, questions, res }));
    }),
  );
  const latencyMs = Math.round(performance.now() - started);

  const byId: Record<string, Answer> = {};
  const extra: Record<string, Answer> = {};
  let inputTokens = 0;
  for (const { chunk, res } of results) {
    inputTokens += res.usage.input_tokens;
    for (const [key, answer] of Object.entries(res.answers) as [string, Answer][]) {
      if (key.startsWith("x_")) {
        extra[key.slice(2)] = answer;
      } else {
        const item = chunk[Number(key.slice(1))];
        if (item) byId[item.id] = answer;
      }
    }
  }

  const first = results[0];
  const questionEntries = first ? Object.entries(first.questions) : [];
  const debug: JevCallDebug = {
    chunks: chunks.length,
    questions: results.reduce((n, r) => n + Object.keys(r.questions).length, 0),
    inputTokens,
    latencyMs,
    model: first?.res.model ?? "unknown",
    cached: false,
    sampleRequest: first && {
      state,
      questions: {
        ...sample(questionEntries.filter(([k]) => !k.startsWith("x_")), SAMPLE_QUESTIONS),
        ...Object.fromEntries(questionEntries.filter(([k]) => k.startsWith("x_"))),
      },
    },
    sampleAnswers:
      first &&
      (() => {
        const answers = first.res.answers as Record<string, unknown>;
        const byLabel = first.chunk.map((item, i): [string, unknown] => [`${item.label} (c${i})`, answers[`c${i}`]]);
        const extras = Object.entries(answers).filter(([k]) => k.startsWith("x_"));
        return { ...Object.fromEntries(extras), ...sample(byLabel, 8) };
      })(),
  };

  return { byId, extra, debug };
}
