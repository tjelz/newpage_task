export type SourceSummary = {
  sourceId: string;
  title: string;
  excerpt: string;
};

export type Chunk = {
  id: string;
  sourceId: string;
  title: string;
  heading: string;
  text: string;
};

export type IndexedChunk = Chunk & {
  vector: number[];
};

export type IndexFile = {
  embeddingModel: string;
  threshold: number;
  createdAt: string;
  chunks: IndexedChunk[];
};

export type Citation = {
  sourceId: string;
  title: string;
  heading: string;
};

export type AnsweredChat = {
  status: "answered";
  answer: string;
  citations: Citation[];
};

export type RefusedChat = {
  status: "refused";
  answer: string;
  citations: [];
};

export type ChatResult = AnsweredChat | RefusedChat;

export type ChatLog = {
  event: "chat";
  question: string;
  refused: boolean;
  model: string | null;
  chunkIds: string[];
  scores: number[];
  latencyMs: number;
};
