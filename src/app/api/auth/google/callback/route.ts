import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { finishGoogleSignIn, GOOGLE_COOKIE, googleConfigured, type GoogleProfile } from "@/lib/google";

// Step 2: Google sends the user back here with ?code&state.
export async function GET(req: NextRequest) {
  if (!googleConfigured()) redirect("/login?error=google_not_configured");

  const jar = await cookies();
  const raw = jar.get(GOOGLE_COOKIE)?.value;
  jar.delete({ name: GOOGLE_COOKIE, path: "/api/auth/google" });

  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  if (params.get("error") || !code || !state || !raw) redirect("/login?error=google_cancelled");

  // redirect() throws, so it stays outside the try block.
  let profile: GoogleProfile | null = null;
  try {
    profile = await finishGoogleSignIn(req.nextUrl.origin, { code, state }, JSON.parse(raw));
  } catch (error) {
    console.error("[google]", error);
  }
  if (!profile) redirect("/login?error=google_failed");

  // Match by Google account first; otherwise link an existing account with the same
  // email only if Google has verified that email.
  let user = await db.user.findUnique({ where: { googleId: profile.sub } });
  if (!user) {
    const byEmail = await db.user.findUnique({ where: { email: profile.email } });
    if (byEmail) {
      if (!profile.emailVerified) redirect("/login?error=google_unverified");
      user = await db.user.update({ where: { id: byEmail.id }, data: { googleId: profile.sub } });
    } else {
      user = await db.user.create({ data: { email: profile.email, name: profile.name, googleId: profile.sub } });
    }
  }

  await createSession(user.id);
  redirect(user.useCase ? "/dashboard" : "/welcome");
}
