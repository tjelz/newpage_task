const XAI_BASE = "https://api.x.ai/v1";

type ChatResponse = {
  choices?: { message?: { content?: string | { text?: string }[] } }[];
  model?: string;
};

const apiKey = (): string => {
  const key = process.env.XAI_API_KEY;
  if (!key) {
    throw new Error("XAI_API_KEY is not set");
  }
  return key;
};

const readError = async (response: Response): Promise<string> => {
  const body = await response.text();
  return body.slice(0, 500);
};

export const chatModel = (): string => process.env.XAI_CHAT_MODEL ?? "grok-4.3";

const messageText = (content: string | { text?: string }[] | undefined): string => {
  if (typeof content === "string") {
    return content.trim();
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("\n")
    .trim();
};

export const completeFromContext = async (
  context: string,
  question: string,
): Promise<string> => {
  const model = chatModel();
  const response = await fetch(`${XAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 400,
      reasoning_effort: "none",
      messages: [
        {
          role: "system",
          content:
            "You answer questions about the Northstar Patient Support program using only the excerpts provided. Write a short plain answer. Do not add a source label, brackets, or a citation line; the interface shows sources separately. If the excerpts do not contain the answer, say you do not know. Do not add facts from outside the excerpts.",
        },
        {
          role: "user",
          content: `Excerpts:\n${context}\n\nQuestion: ${question}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`xAI chat failed (${response.status}): ${await readError(response)}`);
  }

  const payload = (await response.json()) as ChatResponse;
  const text = messageText(payload.choices?.[0]?.message?.content);
  if (!text) {
    throw new Error("xAI chat returned an empty answer");
  }
  return text;
};
