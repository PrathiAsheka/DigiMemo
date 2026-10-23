"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

export function Chat({
  properties,
  initialPropertyId,
  initialQuestion,
  suggestions,
  placeholder,
}: {
  properties: { id: string; name: string }[];
  initialPropertyId: string | null;
  initialQuestion?: string;
  suggestions: string[];
  placeholder: string;
}) {
  const [propertyId, setPropertyId] = useState<string>(initialPropertyId ?? "all");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialQuestion ?? "");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const history: Message[] = [...messages, { role: "user", content: question }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: propertyId === "all" ? null : propertyId, messages: history }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "");
        setMessages([...history, { role: "assistant", content: err || "Something went wrong." }]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: reply }]);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMessages([...history, { role: "assistant", content: "Network error. Please try again." }]);
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="card flex min-h-[60vh] flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-muted" htmlFor="property">Property</label>
        <select
          id="property"
          className="input w-auto"
          value={propertyId}
          onChange={(e) => {
            setPropertyId(e.target.value);
            setMessages([]);
          }}
        >
          {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          {properties.length > 1 && <option value="all">All properties</option>}
        </select>
        {messages.length > 0 && (
          <button className="btn-link ml-auto" onClick={() => { abortRef.current?.abort(); setMessages([]); }}>
            New conversation
          </button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-wrap gap-2 pt-4">
            {suggestions.map((s) => (
              <button key={s} className="btn-secondary text-left" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user" ? "bg-accent text-accent-fg" : "border border-border"
                }`}
              >
                {m.content || <span className="text-muted">Thinking…</span>}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          aria-label="Message"
        />
        <button className="btn" disabled={busy || !input.trim()}>{busy ? "…" : "Send"}</button>
      </form>
      <p className="text-xs text-muted">
        The assistant can make mistakes. For electrical, gas, structural or other safety-critical issues, always consult a qualified professional.
      </p>
    </div>
  );
}
