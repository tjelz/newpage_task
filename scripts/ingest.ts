import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chunkMarkdown } from "../lib/chunk";
import { loadCorpus } from "../lib/corpus";
import { NEGATIVE_QUESTIONS, POSITIVE_QUESTIONS } from "../lib/fixtures";
import { calibrateThreshold, rankChunks } from "../lib/retrieve";
import type { IndexFile } from "../lib/types";
import { embeddingModelName, embedTexts } from "../lib/embed";

const loadEnvFile = () => {
  const envPath = path.join(process.cwd(), ".env.local");
  try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }
      const separator = trimmed.indexOf("=");
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // The shell may already have XAI_API_KEY.
  }
};

const bestScore = async (question: string, index: IndexFile): Promise<number> => {
  const [query] = await embedTexts([question]);
  const ranked = rankChunks(query ?? [], index.chunks);
  return ranked[0]?.score ?? 0;
};

const main = async () => {
  loadEnvFile();
  const sources = loadCorpus();
  const chunks = sources.flatMap((source) =>
    chunkMarkdown(source.sourceId, source.title, source.markdown),
  );
  const vectors = await embedTexts(chunks.map((chunk) => `${chunk.heading}\n${chunk.text}`));

  const draft: IndexFile = {
    embeddingModel: embeddingModelName(),
    threshold: 0,
    createdAt: new Date().toISOString(),
    chunks: chunks.map((chunk, index) => ({
      ...chunk,
      vector: vectors[index] ?? [],
    })),
  };

  const positiveScores = [];
  for (const question of POSITIVE_QUESTIONS) {
    positiveScores.push(await bestScore(question, draft));
  }
  const negativeScores = [];
  for (const question of NEGATIVE_QUESTIONS) {
    negativeScores.push(await bestScore(question, draft));
  }

  draft.threshold = calibrateThreshold(positiveScores, negativeScores);

  const directory = path.join(process.cwd(), "data");
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, "index.json"), JSON.stringify(draft));

  console.log(
    JSON.stringify({
      chunks: draft.chunks.length,
      threshold: draft.threshold,
      positiveScores,
      negativeScores,
      embeddingModel: draft.embeddingModel,
    }),
  );
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Ingest failed.";
  console.error(message);
  process.exitCode = 1;
});
