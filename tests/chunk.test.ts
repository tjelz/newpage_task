import { describe, expect, it } from "vitest";
import { chunkMarkdown } from "../lib/chunk";

describe("chunkMarkdown", () => {
  it("splits a document on headings", () => {
    const chunks = chunkMarkdown(
      "dosing",
      "Dosing",
      "# How to take it\n\nOne capsule each morning.\n\n# Missed dose\n\nSkip it after six hours.\n",
    );

    expect(chunks).toHaveLength(2);
    expect(chunks[0]?.heading).toBe("How to take it");
    expect(chunks[1]?.heading).toBe("Missed dose");
    expect(chunks[1]?.text).toContain("six hours");
  });

  it("splits a section that exceeds the size limit", () => {
    const paragraph = "Take the capsule with food. ".repeat(80);
    const chunks = chunkMarkdown("dosing", "Dosing", `# Dose\n\n${paragraph}\n`);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.text.length <= 900)).toBe(true);
  });
});
