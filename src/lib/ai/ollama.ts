import "server-only";
import { OLLAMA_URL } from "./provider";

// Minimal client for Ollama's native chat API (POST /api/chat).
// https://github.com/ollama/ollama/blob/main/docs/api.md

export type OllamaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  /** Base64-encoded images (no data: prefix), for vision models. */
  images?: string[];
};

type ChatRequest = {
  model: string;
  messages: OllamaMessage[];
  /** "json" or a JSON Schema object to constrain the reply. */
  format?: "json" | Record<string, unknown>;
  options?: { temperature?: number; num_ctx?: number };
};

/** An Ollama failure with a message that is safe and useful to show the user. */
export class OllamaError extends Error {}

// Local models default to a small context window; the property record and documents need more.
// 8k fits one property's record and a document, and stays fast on 4 GB graphics cards
// (16k was ~6x slower on a GTX 1650). Raise OLLAMA_NUM_CTX on bigger machines.
const DEFAULT_OPTIONS = { num_ctx: Number(process.env.OLLAMA_NUM_CTX) || 8192 };

async function post(body: ChatRequest & { stream: boolean }) {
  let res: Response;
  try {
    res = await fetch(`${OLLAMA_URL()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, options: { ...DEFAULT_OPTIONS, ...body.options } }),
    });
  } catch {
    throw new OllamaError(`Can't reach Ollama at ${OLLAMA_URL()}. Make sure Ollama is installed and running, then try again.`);
  }
  if (!res.ok) {
    const detail = ((await res.json().catch(() => ({}))) as { error?: string }).error ?? res.statusText;
    if (res.status === 404 || /not found/i.test(detail)) {
      throw new OllamaError(`The model "${body.model}" isn't downloaded yet. Run: ollama pull ${body.model}`);
    }
    throw new OllamaError(`Ollama returned an error: ${detail}`);
  }
  return res;
}

/** One complete reply. */
export async function ollamaChat(req: ChatRequest): Promise<string> {
  const res = await post({ ...req, stream: false });
  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? "";
}

