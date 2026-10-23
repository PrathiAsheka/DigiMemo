"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";

export type AuthState = { error?: string } | undefined;

const SignupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export async function signup(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = SignupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) {
    return { error: "An account with that email already exists" };
  }
  const user = await db.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 12) },
  });
  await createSession(user.id);
  redirect("/welcome");
}

export async function login(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (user && !user.passwordHash) {
    return { error: "This account signs in with Google. Use “Continue with Google” above." };
  }
  if (!user || !(await bcrypt.compare(password, user.passwordHash!))) {
    return { error: "Incorrect email or password" };
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
