import type { IndexedChunk } from "./types";

export const TOP_K = 3;
export const SCORE_MARGIN = 0.12;
export const DEFAULT_REFUSAL_THRESHOLD = 0.35;

export type ScoredChunk = IndexedChunk & { score: number };

export const cosineSimilarity = (left: number[], right: number[]): number => {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }

  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
};

export const rankChunks = (
  query: number[],
  chunks: IndexedChunk[],
): ScoredChunk[] =>
  chunks
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(query, chunk.vector),
    }))
    .sort((left, right) => right.score - left.score);

export const selectContext = (
  ranked: ScoredChunk[],
  threshold = DEFAULT_REFUSAL_THRESHOLD,
  topK = TOP_K,
): { status: "answered"; chunks: ScoredChunk[] } | { status: "refused"; chunks: [] } => {
  const best = ranked[0];
  if (!best || best.score < threshold) {
    return { status: "refused", chunks: [] };
  }

  const floor = best.score - SCORE_MARGIN;
  return {
    status: "answered",
    chunks: ranked.filter((chunk) => chunk.score >= floor).slice(0, topK),
  };
};

export const calibrateThreshold = (
  positiveScores: number[],
  negativeScores: number[],
): number => {
  const lowestPositive = Math.min(...positiveScores);
  const highestNegative = Math.max(...negativeScores);

  if (!Number.isFinite(lowestPositive) || !Number.isFinite(highestNegative)) {
    return DEFAULT_REFUSAL_THRESHOLD;
  }

  if (lowestPositive <= highestNegative) {
    return lowestPositive;
  }

  return (lowestPositive + highestNegative) / 2;
};
