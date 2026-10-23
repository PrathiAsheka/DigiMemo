import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { GOOGLE_COOKIE, googleConfigured, startGoogleSignIn } from "@/lib/google";

// Step 1: send the browser to Google's account chooser.
export async function GET(req: NextRequest) {
  if (!googleConfigured()) redirect("/login?error=google_not_configured");

  const { url, cookie } = startGoogleSignIn(req.nextUrl.origin);
  (await cookies()).set(GOOGLE_COOKIE, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // must survive the top-level redirect back from Google
    path: "/api/auth/google",
    maxAge: 600,
  });
  redirect(url);
}
