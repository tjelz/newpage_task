import { readFileSync } from "node:fs";
import path from "node:path";
import type { IndexFile } from "./types";

export const indexPath = (): string => path.join(process.cwd(), "data", "index.json");

export const readIndex = (): IndexFile => {
  const raw = readFileSync(indexPath(), "utf8");
  return JSON.parse(raw) as IndexFile;
};
