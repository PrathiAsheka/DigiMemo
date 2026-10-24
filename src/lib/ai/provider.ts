// AI document reading is optional: it is enabled when an API key is configured in .env.

/** True when AI document reading can be used. */
export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);
}
