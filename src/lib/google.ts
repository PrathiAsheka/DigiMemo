import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

// "Sign in with Google" via OAuth 2.0 authorization code + PKCE (OpenID Connect).
// The ID token is verified against Google's published keys, issuer, audience and nonce.
// Configure GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (see README).

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export const GOOGLE_COOKIE = "hdt_google_oauth";

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Must exactly match an "Authorized redirect URI" on the Google OAuth client. */
export function redirectUri(origin: string) {
  return `${process.env.APP_URL ?? origin}/api/auth/google/callback`;
}

const b64url = (buf: Buffer) => buf.toString("base64url");

/** Builds the Google consent URL plus the one-time values to remember in a cookie. */
export function startGoogleSignIn(origin: string) {
  const state = b64url(randomBytes(24));
  const nonce = b64url(randomBytes(24));
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());

  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  return { url: url.toString(), cookie: JSON.stringify({ state, nonce, verifier }) };
}

export type GoogleProfile = { sub: string; email: string; emailVerified: boolean; name: string };

/** Exchanges the code and returns the verified Google identity. Throws on any mismatch. */
export async function finishGoogleSignIn(
  origin: string,
  params: { code: string; state: string },
  saved: { state: string; nonce: string; verifier: string },
): Promise<GoogleProfile> {
  if (params.state !== saved.state) throw new Error("State mismatch");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
      code_verifier: saved.verifier,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status})`);
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) throw new Error("No ID token returned");

  const { payload } = await jwtVerify(id_token, JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: process.env.GOOGLE_CLIENT_ID!,
  });
  if (payload.nonce !== saved.nonce) throw new Error("Nonce mismatch");
  if (typeof payload.sub !== "string" || typeof payload.email !== "string") throw new Error("Incomplete Google profile");

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === "string" && payload.name ? payload.name : payload.email.split("@")[0],
  };
}
