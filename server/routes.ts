import { noul, score, type NoulQuestion } from "@typesafe-ai/sdk";
import { Hono } from "hono";
import { DEMO_BY_ID, DEMO_ITEMS } from "../src/data/demographics.js";
import { GEO_BY_ID, GEO_ITEMS } from "../src/data/geo.js";
import {
  FIT_LEVELS,
  LIMITS,
  type BriefRequest,
  type BriefResponse,
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

function noulOf(a: Answer | undefined) {
  return a?.type === "noul" ? a.noul : 0;
}

const GEO_CANDIDATES = GEO_ITEMS.map((g) => ({ id: g.id, label: g.label }));
const DEMO_CANDIDATES = DEMO_ITEMS.map((d) => ({ id: d.id, label: d.label }));

function filterQuestion(kind: FilterKind, i: number): NoulQuestion {
  const ref = `\`candidates[${i}]\``;
  return kind === "geo"
    ? noul(
        {
          context:
            "A marketer typed `filter` into the search box of an ad-targeting tool to find US locations. Use your own knowledge of each place.",
          question: `Does the place ${ref} match what \`filter\` describes?`,
        },
        {
          true: "The place is named by `filter`, or clearly has the quality, geography, culture, or reputation that `filter` describes",
          false: "The place does not have what `filter` describes, or only weakly or rarely",
        },
      )
    : noul(
        {
          context:
            "A marketer typed `filter` into the search box of an ad-targeting tool to find audience segments that reach a kind of person.",
          question: `Is the segment ${ref} a strong way to reach the people described by \`filter\`?`,
        },
        {
          true: "People described by `filter` are very likely to be in this segment, or the segment is named by `filter`",
          false: "The segment has little or no association with the people described by `filter`",
        },
      );
}

function briefQuestion(kind: FilterKind, i: number): NoulQuestion {
  const ref = `\`candidates[${i}]\``;
  return kind === "geo"
    ? noul(`Does the campaign brief \`brief\` say or clearly imply that the campaign should target the place ${ref}?`, {
        true: "The brief names this place, or describes a region or kind of place that this place clearly is",
        false: "The brief does not point to this place, including when the brief sets no geographic focus at all",
      })
    : noul(`Is the audience segment ${ref} a core target for the campaign described in \`brief\`?`, {
        true: "The brief names this audience, or its product is clearly aimed at people in this segment",
        false: "This segment is not a core audience for the brief",
      });
}

export const api = new Hono()
  .post("/filter", async (c) => {
    const body = await c.req.json<Partial<FilterRequest>>();
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const kind: FilterKind | undefined = body.kind === "geo" || body.kind === "demo" ? body.kind : undefined;
    if (!kind || !query) return c.json({ error: "Expected { kind: 'geo' | 'demo', query }" }, 400);
    if (query.length > LIMITS.queryChars) return c.json({ error: `Query is limited to ${LIMITS.queryChars} characters` }, 400);

    const response = await cached<FilterResponse>(`filter:${kind}:${query.toLowerCase()}`, async () => {
      const result = await judgeCandidates({
        items: kind === "geo" ? GEO_CANDIDATES : DEMO_CANDIDATES,
        listKey: "candidates",
        sharedState: { filter: query },
        buildQuestion: (i) => filterQuestion(kind, i),
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
          listKey: "candidates",
          sharedState: { brief },
          buildQuestion: (i) => briefQuestion("geo", i),
          extraQuestions: {
            gate: noul("Does the campaign brief `brief` specify or imply a geographic focus?", {
              true: "The brief names or implies particular regions, states, cities, or kinds of places",
              false: "The brief says nothing about where the campaign should run",
            }),
          },
        }),
        judgeCandidates({
          items: DEMO_CANDIDATES,
          listKey: "candidates",
          sharedState: { brief },
          buildQuestion: (i) => briefQuestion("demo", i),
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
        listKey: "selections",
        sharedState: { product },
        buildQuestion: (i) =>
          score(`How well does the ad-targeting selection \`selections[${i}]\` suit the product or campaign \`product\`?`, FIT_LEVELS),
      });
      const results = Object.fromEntries(
        Object.entries(result.byId).map(([id, a]) => [
          id,
          a.type === "score" ? { score: a.score, confidence: a.confidence } : { score: 0, confidence: 0 },
        ]),
      );
      return { results, debug: result.debug };
    });
    return c.json(response);
  });
