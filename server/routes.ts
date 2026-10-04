import { choice, noul, score, type NoulQuestion, type Questions } from "@typesafe-ai/sdk";
import { Hono } from "hono";
import { DEMO_BY_ID, DEMO_ITEMS } from "../src/data/demographics.js";
import { INPUT_TYPES, OPTION_SET_IDS, OPTION_SETS, SANDBOX_CONTEXTS, type SandboxContextId } from "../src/data/fieldCatalog.js";
import { FORMS, type FormId } from "../src/data/forms.js";
import { GEO_BY_ID, GEO_ITEMS } from "../src/data/geo.js";
import { LOG_TEXT, LOGS } from "../src/data/logs.js";
import { MOVIES } from "../src/data/movies.js";
import {
  COLUMN_LEVELS,
  FIT_LEVELS,
  LIMITS,
  TABLE_DATASETS,
  type TableDataset,
  type BriefRequest,
  type BriefResponse,
  type ChoiceResult,
  type ColumnRequest,
  type ColumnResponse,
  type CrossCheckRequest,
  type CrossCheckResponse,
  type FieldSpecRequest,
  type FieldSpecResponse,
  type FilterKind,
  type FilterRequest,
  type FilterResponse,
  type FitRequest,
  type FitResponse,
} from "../src/shared/api.js";
import { LruCache } from "./cache.js";
import { judgeCandidates, type Answer, type JudgeResult } from "./jev.js";

const cache = new LruCache<unknown>(300);

async function cached<T>(key: string, compute: () => Promise<T & { debug: { cached: boolean } }>) {
  const hit = cache.get(key) as (T & { debug: { cached: boolean } }) | undefined;
  if (hit) return { ...hit, debug: { ...hit.debug, cached: true } };
  const value = await compute();
  cache.set(key, value);
  return value;
}

function nouls(result: JudgeResult) {
  return Object.fromEntries(
    Object.entries(result.byId).map(([id, a]) => [id, a.type === "noul" ? a.noul : 0]),
  );
}

function scoresOf(result: JudgeResult) {
  return Object.fromEntries(
    Object.entries(result.byId).map(([id, a]) => [
      id,
      a.type === "score" ? { score: a.score, confidence: a.confidence } : { score: 0, confidence: 0 },
    ]),
  );
}

function noulOf(a: Answer | undefined) {
  return a?.type === "noul" ? a.noul : 0;
}

function choiceOf(a: Answer | undefined): ChoiceResult {
  return a?.type === "choice"
    ? { choice: a.choice, confidence: a.confidence, probabilities: { ...a.probabilities } }
    : { choice: "", confidence: 0, probabilities: {} };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function crossCheckQuestion(label: string): NoulQuestion {
  return noul(
    {
      field: label,
      question:
        "Would a careful person checking this form, using real-world knowledge, flag the answer to `field` as probably wrong given the other answers in `answers`?",
    },
    {
      true: "The answer to `field` is impossible or very unlikely together with at least one other answer, so it is probably a mistake",
      false:
        "The answer to `field` is plausible together with every other answer. Unusual but real combinations are plausible, such as a small town that shares its name with a famous city elsewhere",
    },
  );
}

function fieldSpecQuestions(): Questions {
  const questions: Questions = {
    type: choice("What kind of input should the field labeled `label` on `form` be?", INPUT_TYPES),
    options: choice("If the field labeled `label` on `form` offers a fixed list of options, which list fits it best?", {
      ...Object.fromEntries(OPTION_SET_IDS.map((id) => [id, OPTION_SETS[id].description])),
      none: "None of these lists fit; the answer is free-form or a single yes/no",
    }),
    should: noul("Is it good form design to pre-select a typical answer for the field labeled `label` on `form`?", {
      true: "Pre-selecting a typical answer helps most people, is harmless, and is easy to change",
      false:
        "Pre-filling would be presumptuous or harmful: personal details like names or birthdays, consent or marketing opt-ins, legal agreements, or anything that must be a deliberate choice",
    }),
    on: noul("If the field labeled `label` on `form` is a checkbox or switch, should it start switched on?", {
      true: "Most people want it on, and starting on is in their interest",
      false: "It should start off, for example consent, marketing, or anything a person must opt into",
    }),
  };
  for (const id of OPTION_SET_IDS) {
    const set = OPTION_SETS[id];
    questions[`default_${id}`] = choice(
      { options: set.description, question: "If the field labeled `label` on `form` offered these options, which would most people pick?" },
      Object.fromEntries(set.options.map((o) => [o, null])),
    );
  }
  return questions;
}

const GEO_CANDIDATES = GEO_ITEMS.map((g) => ({ id: g.id, label: g.label }));
const DEMO_CANDIDATES = DEMO_ITEMS.map((d) => ({ id: d.id, label: d.label }));
const MOVIE_CANDIDATES = MOVIES.map((m) => ({ id: m.id, label: m.label }));
const LOG_CANDIDATES = LOGS.map((l) => ({ id: l.id, label: l.label }));

const CANDIDATES: Record<FilterKind, { id: string; label: string }[]> = {
  geo: GEO_CANDIDATES,
  demo: DEMO_CANDIDATES,
  movies: MOVIE_CANDIDATES,
  logs: LOG_CANDIDATES,
};

const FILTER_CONTEXT: Record<FilterKind, string> = {
  geo: "A marketer typed `filter` into the search box of an ad-targeting tool to find US locations.",
  demo: "A marketer typed `filter` into the search box of an ad-targeting tool to find audience segments that reach a kind of person.",
  movies: "A viewer typed `filter` into the search box above a table of movies on a streaming service.",
  logs: "An engineer typed `filter` into the search box of a log viewer showing `log`, one morning of logs from an online shop.",
};

/** Lines are judged against the whole log, so story-level filters ("root cause") can connect distant lines. */
const FILTER_STATE: Partial<Record<FilterKind, Record<string, string>>> = {
  logs: { log: LOG_TEXT },
};

const COLUMN_SETUP: Record<TableDataset, { state: Record<string, string>; subject: string; question: string }> = {
  movies: {
    state: { context: "A viewer added a column named `attribute` to a table of movies, to rate every movie on it." },
    subject: "movie",
    question: "How well does `attribute` describe `movie`?",
  },
  logs: {
    state: {
      context: "An engineer added a column named `attribute` to a log viewer showing `log`, to rate every line on it.",
      log: LOG_TEXT,
    },
    subject: "line",
    question: "Read in the context of the whole `log`, how well does `attribute` describe `line`?",
  },
};

function filterQuestion(kind: FilterKind, label: string): NoulQuestion {
  switch (kind) {
    case "geo":
      return noul(
        { place: label, question: "Does `place` match what `filter` describes?" },
        {
          true: "`place` is named by `filter`, or clearly has the quality, geography, culture, or reputation that `filter` describes",
          false: "`place` does not have what `filter` describes, or only weakly",
        },
      );
    case "demo":
      return noul(
        { segment: label, question: "Is `segment` a strong way to reach the people described by `filter`?" },
        {
          true: "People described by `filter` are very likely to be in `segment`, or `segment` is named by `filter`",
          false: "`segment` has little or no association with the people described by `filter`",
        },
      );
    case "movies":
      return noul(
        { movie: label, question: "Does `movie` match what the viewer is looking for in `filter`?" },
        {
          true: "`movie` clearly has the qualities, setting, people, or title that `filter` describes",
          false: "`movie` does not fit `filter`, or only weakly",
        },
      );
    case "logs":
      return noul(
        { line: label, question: "Read in the context of the whole `log`, does `line` match what the engineer is looking for in `filter`?" },
        {
          true: "`line` is clearly one of the lines `filter` asks for",
          false: "`line` does not fit `filter`, or only weakly",
        },
      );
  }
}

function briefQuestion(kind: FilterKind, label: string): NoulQuestion {
  return kind === "geo"
    ? noul(
        { place: label, question: "Does the campaign brief `brief` say or clearly imply that the campaign should target `place`?" },
        {
          true: "The brief names `place`, or describes a region or kind of place that `place` clearly is",
          false: "The brief does not point to `place`, including when the brief sets no geographic focus at all",
        },
      )
    : noul(
        { segment: label, question: "Is `segment` a core target audience for the campaign described in `brief`?" },
        {
          true: "The brief names this audience, or its product is clearly aimed at people in `segment`",
          false: "`segment` is not a core audience for the brief",
        },
      );
}

export const api = new Hono()
  .post("/filter", async (c) => {
    const body = await c.req.json<Partial<FilterRequest>>();
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const kind = typeof body.kind === "string" && body.kind in CANDIDATES ? body.kind : undefined;
    if (!kind || !query) return c.json({ error: `Expected { kind: ${Object.keys(CANDIDATES).map((k) => `'${k}'`).join(" | ")}, query }` }, 400);
    if (query.length > LIMITS.queryChars) return c.json({ error: `Query is limited to ${LIMITS.queryChars} characters` }, 400);

    const response = await cached<FilterResponse>(`filter:${kind}:${query.toLowerCase()}`, async () => {
      const result = await judgeCandidates({
        items: CANDIDATES[kind],
        state: { context: FILTER_CONTEXT[kind], filter: query, ...FILTER_STATE[kind] },
        buildQuestion: (label) => filterQuestion(kind, label),
      });
      return { scores: nouls(result), debug: result.debug };
    });
    return c.json(response);
  })
  .post("/brief", async (c) => {
    const body = await c.req.json<Partial<BriefRequest>>();
    const brief = typeof body.brief === "string" ? body.brief.trim() : "";
    if (!brief) return c.json({ error: "Expected { brief }" }, 400);
    if (brief.length > LIMITS.briefChars) return c.json({ error: `Brief is limited to ${LIMITS.briefChars} characters` }, 400);

    const response = await cached<BriefResponse>(`brief:${brief.toLowerCase()}`, async () => {
      const [geo, demo] = await Promise.all([
        judgeCandidates({
          items: GEO_CANDIDATES,
          state: { brief },
          buildQuestion: (label) => briefQuestion("geo", label),
          extraQuestions: {
            gate: noul("Does the campaign brief `brief` specify or imply a geographic focus?", {
              true: "The brief names or implies particular regions, states, cities, or kinds of places",
              false: "The brief says nothing about where the campaign should run",
            }),
          },
        }),
        judgeCandidates({
          items: DEMO_CANDIDATES,
          state: { brief },
          buildQuestion: (label) => briefQuestion("demo", label),
          extraQuestions: {
            gate: noul("Does the campaign brief `brief` describe or imply an intended audience?", {
              true: "The brief names a kind of customer, or its product clearly implies one",
              false: "The brief gives no hint of who the audience is",
            }),
          },
        }),
      ]);
      return {
        geoGate: noulOf(geo.extra.gate),
        demoGate: noulOf(demo.extra.gate),
        geo: nouls(geo),
        demo: nouls(demo),
        debug: {
          ...geo.debug,
          chunks: geo.debug.chunks + demo.debug.chunks,
          questions: geo.debug.questions + demo.debug.questions,
          inputTokens: geo.debug.inputTokens + demo.debug.inputTokens,
          latencyMs: Math.max(geo.debug.latencyMs, demo.debug.latencyMs),
        },
      };
    });
    return c.json(response);
  })
  .post("/fit", async (c) => {
    const body = await c.req.json<Partial<FitRequest>>();
    const product = typeof body.product === "string" ? body.product.trim() : "";
    const ids = Array.isArray(body.selections) ? body.selections.filter((s) => typeof s === "string") : [];
    if (!product || ids.length === 0) return c.json({ error: "Expected { product, selections }" }, 400);
    if (product.length > LIMITS.briefChars) return c.json({ error: `Brief is limited to ${LIMITS.briefChars} characters` }, 400);
    if (ids.length > LIMITS.fitSelections) return c.json({ error: `Fit check is limited to ${LIMITS.fitSelections} selections` }, 400);

    const items = ids.flatMap((id) => {
      const label = GEO_BY_ID.get(id)?.label ?? DEMO_BY_ID.get(id)?.label;
      return label ? [{ id, label }] : [];
    });
    const key = `fit:${product.toLowerCase()}:${items.map((i) => i.id).sort().join(",")}`;
    const response = await cached<FitResponse>(key, async () => {
      const result = await judgeCandidates({
        items,
        state: { product },
        buildQuestion: (label) =>
          score(
            { selection: label, question: "How well does the ad-targeting selection `selection` suit the product or campaign `product`?" },
            FIT_LEVELS,
          ),
      });
      return { results: scoresOf(result), debug: result.debug };
    });
    return c.json(response);
  })
  .post("/column", async (c) => {
    const body = await c.req.json<Partial<ColumnRequest>>();
    const attribute = typeof body.attribute === "string" ? body.attribute.trim() : "";
    const dataset = TABLE_DATASETS.find((d) => d === body.dataset);
    if (!attribute || !dataset) return c.json({ error: "Expected { dataset: 'movies' | 'logs', attribute }" }, 400);
    if (attribute.length > LIMITS.attributeChars) {
      return c.json({ error: `Column names are limited to ${LIMITS.attributeChars} characters` }, 400);
    }

    const setup = COLUMN_SETUP[dataset];
    const response = await cached<ColumnResponse>(`column:${dataset}:${attribute.toLowerCase()}`, async () => {
      const result = await judgeCandidates({
        items: CANDIDATES[dataset],
        state: { ...setup.state, attribute },
        buildQuestion: (label) => score({ [setup.subject]: label, question: setup.question }, COLUMN_LEVELS[dataset]),
      });
      return { results: scoresOf(result), debug: result.debug };
    });
    return c.json(response);
  })
  .post("/crosscheck", async (c) => {
    const body = await c.req.json<Partial<CrossCheckRequest>>();
    const form = typeof body.form === "string" && Object.hasOwn(FORMS, body.form) ? FORMS[body.form as FormId] : undefined;
    const today = typeof body.today === "string" && DATE_RE.test(body.today) ? body.today : "";
    const values: Record<string, unknown> = body.values && typeof body.values === "object" ? body.values : {};
    if (!form || !today) return c.json({ error: "Expected { form: 'checkout' | 'trip', values, today: 'YYYY-MM-DD' }" }, 400);

    const filled = form.fields.flatMap((field) => {
      const value = values[field.key];
      return typeof value === "string" && value.trim() ? [{ field, value: value.trim() }] : [];
    });
    if (filled.some((f) => f.value.length > LIMITS.formValueChars)) {
      return c.json({ error: `Answers are limited to ${LIMITS.formValueChars} characters` }, 400);
    }
    if (filled.length < 2) return c.json({ error: "Fill in at least two fields to cross-check" }, 400);

    const key = `crosscheck:${form.id}:${today}:${JSON.stringify(filled.map((f) => [f.field.key, f.value]))}`;
    const response = await cached<CrossCheckResponse>(key, async () => {
      const extraQuestions: Questions = {};
      for (const { field } of filled) {
        const others = filled.filter((o) => o.field.key !== field.key);
        extraQuestions[`clash_${field.key}`] = choice(
          { field: field.label, question: "Which other answer in `answers` conflicts most with the answer to `field`?" },
          {
            ...Object.fromEntries(others.map((o) => [o.field.label, null])),
            none: "The answer to `field` does not conflict with any other answer",
          },
        );
      }
      const result = await judgeCandidates({
        items: filled.map(({ field }) => ({ id: field.key, label: field.label })),
        state: {
          form: form.context,
          today,
          answers: Object.fromEntries(filled.map((f) => [f.field.label, f.value])),
        },
        buildQuestion: crossCheckQuestion,
        extraQuestions,
      });
      const keyOfLabel = new Map(form.fields.map((f) => [f.label, f.key]));
      const fields = Object.fromEntries(
        filled.map(({ field }) => {
          const clash = result.extra[`clash_${field.key}`];
          const pick = clash?.type === "choice" ? clash : undefined;
          return [
            field.key,
            {
              suspicion: noulOf(result.byId[field.key]),
              clashWith: (pick && keyOfLabel.get(pick.choice)) ?? null,
              clashConfidence: pick?.confidence ?? 0,
            },
          ];
        }),
      );
      return { fields, debug: result.debug };
    });
    return c.json(response);
  })
  .post("/fieldspec", async (c) => {
    const body = await c.req.json<Partial<FieldSpecRequest>>();
    const label = typeof body.label === "string" ? body.label.trim() : "";
    const context =
      typeof body.context === "string" && Object.hasOwn(SANDBOX_CONTEXTS, body.context) ? (body.context as SandboxContextId) : undefined;
    if (!label || !context) return c.json({ error: "Expected { label, context }" }, 400);
    if (label.length > LIMITS.fieldLabelChars) return c.json({ error: `Labels are limited to ${LIMITS.fieldLabelChars} characters` }, 400);

    const response = await cached<FieldSpecResponse>(`fieldspec:${context}:${label.toLowerCase()}`, async () => {
      const result = await judgeCandidates({
        items: [],
        state: { form: SANDBOX_CONTEXTS[context].description, label },
        buildQuestion: () => noul(null),
        extraQuestions: fieldSpecQuestions(),
      });
      return {
        inputType: choiceOf(result.extra.type),
        optionSet: choiceOf(result.extra.options),
        defaults: Object.fromEntries(OPTION_SET_IDS.map((id) => [id, choiceOf(result.extra[`default_${id}`])])),
        shouldDefault: noulOf(result.extra.should),
        toggleOn: noulOf(result.extra.on),
        debug: result.debug,
      };
    });
    return c.json(response);
  });
