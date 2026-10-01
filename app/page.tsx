import { ChatPanel } from "@/components/ChatPanel";
import { loadSourceSummaries } from "@/lib/corpus";

export default function Home() {
  const sources = loadSourceSummaries();
  return <ChatPanel sources={sources} />;
}
