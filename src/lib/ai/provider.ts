// Which AI backend the app uses, chosen with AI_PROVIDER in .env:
//   anthropic (default)  Claude via the Anthropic API: best quality, paid per use
//   ollama               a free model running locally in Ollama (https://ollama.com)
// No server-only import here so the values can be shown in UI copy.

export type AiProvider = "anthropic" | "ollama";

export function aiProvider(): AiProvider {
  const v = (process.env.AI_PROVIDER ?? "").trim().toLowerCase();
  return v === "ollama" ? "ollama" : "anthropic";
}

export const OLLAMA_URL = () => (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434").replace(/\/+$/, "");
/** A vision-capable model, so it can read photos of receipts and labels as well as chat. */
export const OLLAMA_MODEL = () => process.env.OLLAMA_MODEL ?? "qwen2.5vl:7b";

/** True when the selected provider has what it needs to be tried. */
export function aiConfigured() {
  if (aiProvider() === "ollama") return true; // reachability is reported on first use
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);
}

/** What to tell the user when AI is switched off. */
export function aiSetupHint() {
  return aiProvider() === "ollama"
    ? "Start Ollama on this computer to enable AI."
    : "AI is off: set ANTHROPIC_API_KEY, or AI_PROVIDER=ollama for a free local model, in .env.";
}
