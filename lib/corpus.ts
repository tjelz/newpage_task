import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { SourceSummary } from "./types";

export type CorpusSource = {
  sourceId: string;
  title: string;
  fileName: string;
  markdown: string;
};

const SOURCE_ORDER = [
  "overview",
  "eligibility",
  "dosing",
  "adverse-events",
  "contact-hours",
];

const TITLES: Record<string, string> = {
  overview: "Program overview",
  eligibility: "Eligibility",
  dosing: "Dosing",
  "adverse-events": "Adverse events",
  "contact-hours": "Contact hours",
};

const corpusDir = (): string => path.join(process.cwd(), "corpus");

const titleFromMarkdown = (markdown: string, sourceId: string): string => {
  const match = /^#\s+(.+)$/m.exec(markdown);
  if (match) {
    return match[1].trim();
  }
  return TITLES[sourceId] ?? sourceId;
};

export const loadCorpus = (): CorpusSource[] => {
  const files = readdirSync(corpusDir()).filter((fileName) => fileName.endsWith(".md"));
  const byId = new Map(files.map((fileName) => [fileName.replace(/\.md$/, ""), fileName]));
  const orderedIds = [
    ...SOURCE_ORDER.filter((sourceId) => byId.has(sourceId)),
    ...files
      .map((fileName) => fileName.replace(/\.md$/, ""))
      .filter((sourceId) => !SOURCE_ORDER.includes(sourceId))
      .sort(),
  ];

  return orderedIds.map((sourceId) => {
    const fileName = byId.get(sourceId) ?? `${sourceId}.md`;
    const markdown = readFileSync(path.join(corpusDir(), fileName), "utf8");
    return {
      sourceId,
      title: TITLES[sourceId] ?? titleFromMarkdown(markdown, sourceId),
      fileName,
      markdown,
    };
  });
};

export const loadSourceSummaries = (): SourceSummary[] =>
  loadCorpus().map((source) => {
    const excerpt = source.markdown
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith("#"));

    return {
      sourceId: source.sourceId,
      title: source.title,
      excerpt: excerpt ?? "",
    };
  });
