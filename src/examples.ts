export interface Example {
  number: string;
  title: string;
  /** Word rendered in italic accent after the title, matching each page's heading. */
  titleAccent?: string;
  summary: string;
  concepts: string[];
  path?: string;
}

export const EXAMPLES: Example[] = [
  {
    number: "01",
    title: "Targeting",
    titleAccent: "Lab",
    summary:
      "Pick US places and audience segments with filter boxes that understand intent. Type “coastal” or “about to retire” and Jev judges every candidate from its own world knowledge; the lists store nothing but names.",
    concepts: ["Semantic search filtering", "Brief pre-fill", "Audience-fit check"],
    path: "/targeting",
  },
  {
    number: "02",
    title: "Self-aware",
    titleAccent: "Tables",
    summary:
      "Column filters that understand the column's data, such as “rows that look like test accounts”, and sort orders chosen by meaning, such as “most urgent first”.",
    concepts: ["Semantic filters", "Meaningful sort"],
  },
  {
    number: "03",
    title: "Forms that",
    titleAccent: "Cross-check",
    summary:
      "Fields that sanity-check each other, like a shipping address that doesn't match the stated country, and defaults that adapt to the label they sit under.",
    concepts: ["Consistency checks", "Label-aware defaults"],
  },
];

export const LIVE_EXAMPLES = EXAMPLES.filter((e): e is Example & { path: string } => !!e.path);
