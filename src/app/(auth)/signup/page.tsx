import { AuthForm } from "../auth-form";

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { error } = await searchParams;
  return <AuthForm mode="signup" error={typeof error === "string" ? error : undefined} />;
}
