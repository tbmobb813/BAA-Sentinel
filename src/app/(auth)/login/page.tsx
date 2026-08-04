import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const redirectTo =
    typeof params.redirectTo === "string" ? params.redirectTo : undefined;
  const confirmEmail = params.confirmEmail === "1";

  return <LoginForm redirectTo={redirectTo} confirmEmail={confirmEmail} />;
}
