import { AuthForm } from "../auth-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return <AuthForm mode="login" error={typeof error === "string" ? error : undefined} />;
}
