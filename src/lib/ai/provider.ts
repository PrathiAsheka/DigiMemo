// AI document reading is optional: it is enabled when an API key is configured in .env.
// No server-only import here so the values can be shown in UI copy.

/** True when AI document reading can be used. */
export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);
}

/** What to tell the user when AI document reading is switched off. */
export function aiSetupHint() {
  return "AI document reading is off: set ANTHROPIC_API_KEY in .env to turn it on.";
}
