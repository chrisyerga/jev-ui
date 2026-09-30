import { noul, score, type NoulQuestion } from "@typesafe-ai/sdk";
import { Hono } from "hono";
import { DEMO_BY_ID, DEMO_ITEMS } from "../src/data/demographics.js";
import { GEO_BY_ID, GEO_ITEMS } from "../src/data/geo.js";
import { MOVIES } from "../src/data/movies.js";
import {
  COLUMN_LEVELS,
  FIT_LEVELS,
  LIMITS,
  type BriefRequest,
  type BriefResponse,
  type ColumnRequest,
  type ColumnResponse,
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

const GEO_CANDIDATES = GEO_ITEMS.map((g) => ({ id: g.id, label: g.label }));
const DEMO_CANDIDATES = DEMO_ITEMS.map((d) => ({ id: d.id, label: d.label }));
const MOVIE_CANDIDATES = MOVIES.map((m) => ({ id: m.id, label: m.label }));

const CANDIDATES: Record<FilterKind, { id: string; label: string }[]> = {
  geo: GEO_CANDIDATES,
  demo: DEMO_CANDIDATES,
  movies: MOVIE_CANDIDATES,
};

const FILTER_CONTEXT: Record<FilterKind, string> = {
  geo: "A marketer typed `filter` into the search box of an ad-targeting tool to find US locations.",
  demo: "A marketer typed `filter` into the search box of an ad-targeting tool to find audience segments that reach a kind of person.",
  movies: "A viewer typed `filter` into the search box above a table of movies on a streaming service.",
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
    if (!kind || !query) return c.json({ error: "Expected { kind: 'geo' | 'demo' | 'movies', query }" }, 400);
    if (query.length > LIMITS.queryChars) return c.json({ error: `Query is limited to ${LIMITS.queryChars} characters` }, 400);

    const response = await cached<FilterResponse>(`filter:${kind}:${query.toLowerCase()}`, async () => {
      const result = await judgeCandidates({
        items: CANDIDATES[kind],
        state: { context: FILTER_CONTEXT[kind], filter: query },
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
    if (!attribute) return c.json({ error: "Expected { attribute }" }, 400);
    if (attribute.length > LIMITS.attributeChars) {
      return c.json({ error: `Column names are limited to ${LIMITS.attributeChars} characters` }, 400);
    }

    const response = await cached<ColumnResponse>(`column:${attribute.toLowerCase()}`, async () => {
      const result = await judgeCandidates({
        items: MOVIE_CANDIDATES,
        state: {
          context: "A viewer added a column named `attribute` to a table of movies, to rate every movie on it.",
          attribute,
        },
        buildQuestion: (label) =>
          score({ movie: label, question: "How well does `attribute` describe `movie`?" }, COLUMN_LEVELS),
      });
      return { results: scoresOf(result), debug: result.debug };
    });
    return c.json(response);
  });
