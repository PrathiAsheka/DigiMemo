import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Credentials resolve from ANTHROPIC_API_KEY (or an `ant auth login` profile).
export const anthropic = new Anthropic();

export const MODEL = "claude-opus-5-5";

/**
 * Opt into server-side refusal fallbacks: if a safety classifier declines a benign
 * request, the API re-runs it on Anthropic's recommended fallback model instead of
 * returning a refusal to the user.
 */
export const FALLBACK: Pick<Anthropic.Beta.MessageCreateParams, "betas" | "fallbacks"> = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
};

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);
}

/** User-facing message for an API failure; details go to the server log. */
export function describeAiError(error: unknown) {
  console.error("[ai]", error);
  if (error instanceof Anthropic.AuthenticationError) return "The AI service is not configured (invalid API key).";
  if (error instanceof Anthropic.RateLimitError) return "The AI service is busy. Please try again in a minute.";
  if (error instanceof Anthropic.BadRequestError) return "The AI service could not process this file.";
  if (error instanceof Anthropic.APIConnectionError) return "Could not reach the AI service. Check your connection.";
  if (error instanceof Anthropic.APIError) return `The AI service returned an error (${error.status}).`;
  return "Something went wrong while contacting the AI service.";
}
