import { describe, expect, it } from "vitest";
import { answerQuestion, REFUSAL_MESSAGE } from "../lib/answer";
import { calibrateThreshold, cosineSimilarity, rankChunks, selectContext } from "../lib/retrieve";
import type { IndexedChunk, IndexFile } from "../lib/types";

const chunk = (id: string, vector: number[]): IndexedChunk => ({
  id,
  sourceId: "dosing",
  title: "Dosing",
  heading: "Missed dose",
  text: "Skip the dose after six hours.",
  vector,
});

describe("retrieve", () => {
  it("scores identical vectors as one", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("ranks the closest chunk first", () => {
    const ranked = rankChunks(
      [1, 0],
      [chunk("far", [0, 1]), chunk("near", [0.9, 0.1])],
    );
    expect(ranked[0]?.id).toBe("near");
  });

  it("refuses when the best score is below the threshold", () => {
    const ranked = rankChunks([1, 0], [chunk("far", [0, 1])]);
    const selected = selectContext(ranked, 0.5);
    expect(selected.status).toBe("refused");
  });

  it("drops chunks that are well below the best score", () => {
    const ranked = rankChunks(
      [1, 0],
      [chunk("near", [1, 0]), chunk("far", [0.2, 0.8])],
    );
    const selected = selectContext(ranked, 0.2);
    expect(selected.status).toBe("answered");
    if (selected.status === "answered") {
      expect(selected.chunks.map((item) => item.id)).toEqual(["near"]);
    }
  });

  it("places the threshold between known hits and misses", () => {
    expect(calibrateThreshold([0.8, 0.7], [0.2, 0.3])).toBeCloseTo(0.5);
  });
});

describe("answerQuestion", () => {
  const index: IndexFile = {
    embeddingModel: "test",
    threshold: 0.5,
    createdAt: "2026-09-30T00:00:00.000Z",
    chunks: [chunk("near", [1, 0])],
  };

  it("does not call the chat model when retrieval refuses", async () => {
    let completed = false;
    const outcome = await answerQuestion("unrelated", index, {
      embed: async () => [0, 1],
      complete: async () => {
        completed = true;
        return "should not run";
      },
    });

    expect(completed).toBe(false);
    expect(outcome.result.status).toBe("refused");
    if (outcome.result.status === "refused") {
      expect(outcome.result.answer).toBe(REFUSAL_MESSAGE);
    }
    expect(outcome.modelUsed).toBe(false);
  });

  it("returns citations when the match is strong enough", async () => {
    const outcome = await answerQuestion("missed dose", index, {
      embed: async () => [1, 0],
      complete: async () => "Skip the missed dose.",
    });

    expect(outcome.result.status).toBe("answered");
    if (outcome.result.status === "answered") {
      expect(outcome.result.citations[0]?.heading).toBe("Missed dose");
    }
    expect(outcome.modelUsed).toBe(true);
  });
});
