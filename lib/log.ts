import type { ChatLog } from "./types";

export const logChat = (entry: ChatLog): void => {
  console.log(JSON.stringify(entry));
};
