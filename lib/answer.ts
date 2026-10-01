import { rankChunks, selectContext, type ScoredChunk } from "./retrieve";
import type { ChatResult, Citation, IndexFile } from "./types";

export const REFUSAL_MESSAGE =
  "I don't have that in the Northstar documents. I can only answer from the program pack.";

const citationsFrom = (chunks: ScoredChunk[]): Citation[] => {
  const seen = new Set<string>();
  const citations: Citation[] = [];

  for (const chunk of chunks) {
    const key = `${chunk.sourceId}:${chunk.heading}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    citations.push({
      sourceId: chunk.sourceId,
      title: chunk.title,
      heading: chunk.heading,
    });
  }

  return citations;
};

const formatContext = (chunks: ScoredChunk[]): string =>
  chunks
    .map(
      (chunk) =>
        `[${chunk.title} — ${chunk.heading}]\n${chunk.text}`,
    )
    .join("\n\n");

export type AnswerDependencies = {
  embed: (text: string) => Promise<number[]>;
  complete: (context: string, question: string) => Promise<string>;
};

export const answerQuestion = async (
  question: string,
  index: IndexFile,
  deps: AnswerDependencies,
): Promise<{ result: ChatResult; scores: number[]; chunkIds: string[]; modelUsed: boolean }> => {
  const query = await deps.embed(question);
  const ranked = rankChunks(query, index.chunks);
  const selected = selectContext(ranked, index.threshold);
  const scores = ranked.slice(0, 3).map((chunk) => chunk.score);

  switch (selected.status) {
    case "refused": {
      const refused: ChatResult = {
        status: "refused",
        answer: REFUSAL_MESSAGE,
        citations: [],
      };
      return { result: refused, scores, chunkIds: [], modelUsed: false };
    }
    case "answered": {
      const answer = await deps.complete(formatContext(selected.chunks), question);
      const answered: ChatResult = {
        status: "answered",
        answer,
        citations: citationsFrom(selected.chunks),
      };
      return {
        result: answered,
        scores: selected.chunks.map((chunk) => chunk.score),
        chunkIds: selected.chunks.map((chunk) => chunk.id),
        modelUsed: true,
      };
    }
    default: {
      const exhaustive: never = selected;
      return exhaustive;
    }
  }
};
