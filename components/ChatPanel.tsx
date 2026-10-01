"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import type { ChatResult, Citation, SourceSummary } from "@/lib/types";

type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; result: ChatResult };

const SUGGESTED_QUESTIONS = [
  "What should I do if I miss a morning dose?",
  "When is the nurse line open on Saturday?",
  "What is the capital of France?",
];

type ChatPanelProps = {
  sources: SourceSummary[];
};

const citationLabel = (citation: Citation): string =>
  citation.heading === citation.title
    ? citation.title
    : `${citation.title} · ${citation.heading}`;

export const ChatPanel = ({ sources }: ChatPanelProps) => {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const sendQuestion = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || pending) {
      return;
    }

    setError("");
    setPending(true);
    setDraft("");
    setMessages((current) => [
      ...current,
      { id: `user-${current.length}`, role: "user", text: trimmed },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const payload = (await response.json()) as ChatResult & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "The request failed.");
      }
      setMessages((current) => [
        ...current,
        { id: `assistant-${current.length}`, role: "assistant", result: payload },
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The request failed.");
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendQuestion(draft);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    event.preventDefault();
    const nativeEvent = event.nativeEvent;
    if (nativeEvent.isComposing || nativeEvent.keyCode === 229) {
      return;
    }
    event.currentTarget.form?.requestSubmit();
  };

  const handleSuggestion = (question: string) => {
    void sendQuestion(question);
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-4 py-6">
      <aside className="w-full rounded-2xl border border-stone-200 bg-white p-5">
        <p className="text-xs font-semibold tracking-wide text-teal-800 uppercase">
          Sample program
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
          Northstar Patient Support
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Answers come only from these documents. If the match is weak, the assistant refuses
          instead of guessing.
        </p>
        <ul className="mt-5 space-y-3">
          {sources.map((source) => (
            <li key={source.sourceId} className="rounded-xl bg-stone-50 px-3 py-3">
              <p className="text-sm font-medium text-stone-900">{source.title}</p>
              <p className="mt-1 text-sm leading-5 text-stone-600">{source.excerpt}</p>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex min-h-[32rem] flex-1 flex-col rounded-2xl border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-stone-900">Ask the program pack</h2>
          <p className="mt-1 text-sm text-stone-600">
            Each question is retrieved on its own. A follow-up that depends on the previous turn
            will not reuse that context.
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5" aria-live="polite">
          {messages.length === 0 ? (
            <p className="text-sm leading-6 text-stone-500">
              Try a question about dosing, hours, or eligibility. The France question is there to
              show a refusal.
            </p>
          ) : null}
          {messages.map((message) => {
            if (message.role === "user") {
              return (
                <div key={message.id} className="flex justify-end">
                  <p className="max-w-xl rounded-2xl bg-stone-800 px-4 py-3 text-sm leading-6 text-white">
                    {message.text}
                  </p>
                </div>
              );
            }

            switch (message.result.status) {
              case "answered":
                return (
                  <article
                    key={message.id}
                    className="max-w-xl rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
                  >
                    <p className="text-sm leading-6 text-stone-900">{message.result.answer}</p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {message.result.citations.map((citation) => (
                        <li
                          key={`${citation.sourceId}-${citation.heading}`}
                          className="rounded-full bg-white px-2.5 py-1 text-xs text-teal-900 ring-1 ring-teal-200"
                        >
                          {citationLabel(citation)}
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              case "refused":
                return (
                  <article
                    key={message.id}
                    className="max-w-xl rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3"
                  >
                    <p className="text-xs font-semibold tracking-wide text-amber-800 uppercase">
                      Not in the documents
                    </p>
                    <p className="mt-1 text-sm leading-6 text-amber-950">{message.result.answer}</p>
                  </article>
                );
              default: {
                const exhaustive: never = message.result;
                return exhaustive;
              }
            }
          })}
          {pending ? <p className="text-sm text-stone-500">Looking through the documents…</p> : null}
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="border-t border-stone-200 px-5 py-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                className="rounded-full bg-stone-100 px-3 py-1.5 text-left text-xs text-stone-700 hover:bg-stone-200"
                onClick={() => handleSuggestion(question)}
                disabled={pending}
              >
                {question}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <label htmlFor="question" className="sr-only">
              Question
            </label>
            <textarea
              id="question"
              name="question"
              rows={2}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the program documents"
              className="min-h-16 flex-1 resize-none rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-teal-700"
            />
            <button
              type="submit"
              disabled={pending || draft.trim().length === 0}
              className="rounded-xl bg-teal-800 px-4 py-2 text-sm font-medium text-white disabled:bg-stone-300"
            >
              Send
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
