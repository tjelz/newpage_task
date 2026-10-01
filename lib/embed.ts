import path from "node:path";
import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

const DEFAULT_MODEL = "Xenova/all-MiniLM-L6-v2";

env.cacheDir = path.join(process.cwd(), ".cache", "transformers");

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

export const embeddingModelName = (): string =>
  process.env.EMBEDDING_MODEL ?? DEFAULT_MODEL;

const getExtractor = (): Promise<FeatureExtractionPipeline> => {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", embeddingModelName(), {
      dtype: "q8",
    });
  }
  return extractorPromise;
};

export const embedTexts = async (inputs: string[]): Promise<number[][]> => {
  if (inputs.length === 0) {
    return [];
  }

  const extractor = await getExtractor();
  const output = await extractor(inputs, { pooling: "mean", normalize: true });
  const width = output.dims[output.dims.length - 1] ?? 0;
  const values = Array.from(output.data as ArrayLike<number>);
  const vectors: number[][] = [];

  for (let row = 0; row < inputs.length; row += 1) {
    vectors.push(values.slice(row * width, (row + 1) * width));
  }

  return vectors;
};
