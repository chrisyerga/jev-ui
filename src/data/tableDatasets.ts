import type { TableDataset } from "../shared/api.js";
import { LOGS, type LogLevel } from "./logs.js";
import { MOVIES } from "./movies.js";

export type CellKind = "title" | "mono" | "muted" | "level" | "message";

export interface TableColumn {
  key: string;
  label: string;
  cell: CellKind;
  className?: string;
  numeric?: boolean;
  /** Sort by this instead of the displayed value. */
  sortValue?: (value: string | number) => string | number;
}

export interface TableRow {
  id: string;
  values: Record<string, string | number>;
  /** Lower-cased text that plain substring search runs against. */
  text: string;
}

export interface TableDatasetConfig {
  id: TableDataset;
  label: string;
  noun: string;
  rows: TableRow[];
  /** Columns before the Match and Jev columns. */
  lead: TableColumn[];
  /** Columns after them. */
  trail: TableColumn[];
  defaultSort: { key: string; dir: 1 | -1 };
  /** Breaks ties in every sort. */
  tiebreak: string;
  filterExamples: string[];
  columnExamples: string[];
  filterPlaceholder: string;
  columnPlaceholder: string;
  intro: { filter: string; column: string; stores: string };
  jevSees: string;
}

const LEVEL_RANK: Record<LogLevel, number> = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

export const TABLE_DATASET_CONFIGS: Record<TableDataset, TableDatasetConfig> = {
  movies: {
    id: "movies",
    label: "Movies",
    noun: "movies",
    rows: MOVIES.map((m) => ({
      id: m.id,
      values: { title: m.title, year: m.year, genre: m.genre, director: m.director },
      text: `${m.title} ${m.year} ${m.genre} ${m.director}`.toLowerCase(),
    })),
    lead: [
      { key: "title", label: "Title", cell: "title", className: "min-w-48" },
      { key: "year", label: "Year", cell: "mono", className: "w-20", numeric: true },
    ],
    trail: [
      { key: "genre", label: "Genre", cell: "muted", className: "w-28" },
      { key: "director", label: "Director", cell: "muted" },
    ],
    defaultSort: { key: "title", dir: 1 },
    tiebreak: "title",
    filterExamples: ["star", "tarantino", "funny and gory", "set in tokyo", "will make me cry", "heist"],
    columnExamples: ["how scary", "how funny", "date-night friendly", "OK for a 10-year-old", "has a twist ending", "visually stunning"],
    filterPlaceholder: "Try “star”, “funny and gory”, “set in tokyo”…",
    columnPlaceholder: "Any quality: “how scary”, “good for a rainy day”…",
    intro: {
      filter: "funny and gory",
      column: "how scary",
      stores: "The table stores only title, year, genre and director; Jev knows the rest.",
    },
    jevSees: "Jev sees only “Title (Year)” for each movie",
  },
  logs: {
    id: "logs",
    label: "Logs",
    noun: "log lines",
    rows: LOGS.map((l) => ({
      id: l.id,
      values: { time: l.time, level: l.level, service: l.service, message: l.message },
      text: l.label.toLowerCase(),
    })),
    lead: [
      { key: "time", label: "Time", cell: "mono", className: "w-24" },
      { key: "level", label: "Level", cell: "level", className: "w-20", sortValue: (v) => LEVEL_RANK[v as LogLevel] ?? -1 },
    ],
    trail: [
      { key: "service", label: "Service", cell: "muted", className: "w-36" },
      { key: "message", label: "Message", cell: "message", className: "min-w-[28rem]" },
    ],
    defaultSort: { key: "time", dir: 1 },
    tiebreak: "time",
    filterExamples: [
      "root cause of the checkout outage",
      "early warning signs",
      "how the outage was fixed",
      "customer-facing impact",
      "attacker activity",
      "leaks personal data",
      "errors unrelated to the outage",
      "logged as INFO but actually bad",
    ],
    columnExamples: ["related to the outage", "how urgent", "would wake up on-call", "embarrassing in a postmortem", "actually serious"],
    filterPlaceholder: "Try “timeout”, “root cause of the checkout outage”…",
    columnPlaceholder: "Any quality: “how urgent”, “related to the outage”…",
    intro: {
      filter: "root cause of the checkout outage",
      column: "how urgent",
      stores: "One morning of logs from an online shop, with an outage buried in it. Jev reads every line against the whole log.",
    },
    jevSees: "Jev sees each full log line, with the whole morning's log as context",
  },
};
