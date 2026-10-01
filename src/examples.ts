export interface Example {
  number: string;
  title: string;
  /** Word rendered in the accent color after the title, matching each page's heading. */
  titleAccent?: string;
  summary: string;
  concepts: string[];
  path?: string;
}

export const EXAMPLES: Example[] = [
  {
    number: "01",
    title: "Data-aware",
    titleAccent: "Tables",
    summary:
      "A table component that can filter and sort by meaning, not just string matching. Filter by “funny and gory” or “set in tokyo”, or add a new column like “how scary” and Jev rates every row.",
    concepts: ["Semantic row filter", "Jev-computed columns", "Sort by meaning"],
    path: "/tables",
  },
  {
    number: "02",
    title: "Forms that",
    titleAccent: "Auto-validate",
    summary:
      "Fields that sanity-check each other with no rules written, like a postcode from the wrong city or skiing in Miami in July, and controls that pick their options and default from their label.",
    concepts: ["Rule-free consistency checks", "Blame attribution", "Label-aware defaults"],
    path: "/forms",
  },
  {
    number: "03",
    title: "Targeting",
    titleAccent: "Lab",
    summary:
      "Pick US places and audience segments with filter boxes that understand intent. Type “coastal” or “about to retire” and Jev judges every candidate from its own world knowledge; the lists store nothing but names.",
    concepts: ["Semantic search filtering", "Brief pre-fill", "Audience-fit check"],
    path: "/targeting",
  },
];

export const LIVE_EXAMPLES = EXAMPLES.filter((e): e is Example & { path: string } => !!e.path);
