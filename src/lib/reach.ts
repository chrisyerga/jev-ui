import { DEMO_BY_ID, type DemoGroup } from "../data/demographics";
import { GEO_BY_ID } from "../data/geo";

const US_ADULTS_K = 262_000;

/** Mock estimate: places add up, segments OR within a group and AND across groups. */
export function estimateReachK(selected: Iterable<string>) {
  const ids = [...selected];
  const geo = ids.flatMap((id) => GEO_BY_ID.get(id) ?? []);
  const states = new Set(geo.filter((g) => g.kind === "state").map((g) => g.stateCode));
  const geoK = geo.length
    ? geo.reduce((sum, g) => (g.kind === "state" || !states.has(g.stateCode) ? sum + g.reachK : sum), 0)
    : US_ADULTS_K;

  const byGroup = new Map<DemoGroup, number>();
  for (const id of ids) {
    const d = DEMO_BY_ID.get(id);
    if (d) byGroup.set(d.group, Math.min(1, (byGroup.get(d.group) ?? 0) + d.share));
  }
  const share = [...byGroup.values()].reduce((p, s) => p * s, 1);
  return geoK * share;
}

export function formatReach(k: number) {
  if (k >= 1000) return `${(k / 1000).toFixed(k >= 10_000 ? 0 : 1)}M`;
  return `${Math.max(1, Math.round(k))}K`;
}
