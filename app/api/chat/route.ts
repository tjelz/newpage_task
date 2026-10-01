import { answerQuestion } from "@/lib/answer";
import { embedTexts } from "@/lib/embed";
import { readIndex } from "@/lib/index-store";
import { logChat } from "@/lib/log";
import { chatModel, completeFromContext } from "@/lib/xai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const started = Date.now();
  let question = "";

  try {
    const body = (await request.json()) as { question?: unknown };
    question = typeof body.question === "string" ? body.question.trim() : "";
    if (!question) {
      return Response.json({ error: "Question is required." }, { status: 400 });
    }

    const index = readIndex();
    const outcome = await answerQuestion(question, index, {
      embed: async (text) => {
        const vectors = await embedTexts([text]);
        return vectors[0] ?? [];
      },
      complete: completeFromContext,
    });

    logChat({
      event: "chat",
      question,
      refused: outcome.result.status === "refused",
      model: outcome.modelUsed ? chatModel() : null,
      chunkIds: outcome.chunkIds,
      scores: outcome.scores.map((score) => Number(score.toFixed(4))),
      latencyMs: Date.now() - started,
    });

    return Response.json(outcome.result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat failed.";
    logChat({
      event: "chat",
      question,
      refused: false,
      model: null,
      chunkIds: [],
      scores: [],
      latencyMs: Date.now() - started,
    });
    const status = message.includes("ENOENT") || message.includes("index.json") ? 503 : 500;
    return Response.json({ error: message }, { status });
  }
}
