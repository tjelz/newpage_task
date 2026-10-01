import type { Chunk } from "./types";

const MAX_SECTION_CHARS = 900;
const OVERLAP_CHARS = 80;

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "section";

const splitLong = (text: string): string[] => {
  if (text.length <= MAX_SECTION_CHARS) {
    return [text];
  }

  const parts: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + MAX_SECTION_CHARS, text.length);
    if (end < text.length) {
      const breakAt = text.lastIndexOf("\n\n", end);
      if (breakAt > start + MAX_SECTION_CHARS / 2) {
        end = breakAt;
      }
    }
    const part = text.slice(start, end).trim();
    if (part) {
      parts.push(part);
    }
    if (end >= text.length) {
      break;
    }
    start = Math.max(end - OVERLAP_CHARS, start + 1);
  }

  return parts;
};

export const chunkMarkdown = (
  sourceId: string,
  title: string,
  markdown: string,
): Chunk[] => {
  const sections: { heading: string; lines: string[] }[] = [];
  let current = { heading: title, lines: [] as string[] };

  for (const line of markdown.split(/\r?\n/)) {
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);
    if (headingMatch) {
      if (current.lines.some((entry) => entry.trim().length > 0)) {
        sections.push(current);
      }
      current = { heading: headingMatch[2].trim(), lines: [] };
      continue;
    }
    current.lines.push(line);
  }

  if (current.lines.some((entry) => entry.trim().length > 0) || sections.length === 0) {
    sections.push(current);
  }

  const chunks: Chunk[] = [];

  for (const section of sections) {
    const text = section.lines.join("\n").trim();
    if (!text) {
      continue;
    }
    const parts = splitLong(text);
    for (let index = 0; index < parts.length; index += 1) {
      chunks.push({
        id: `${sourceId}:${slug(section.heading)}:${index}`,
        sourceId,
        title,
        heading: section.heading,
        text: parts[index],
      });
    }
  }

  return chunks;
};
