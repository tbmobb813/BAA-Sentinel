"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  organizationName: z.string().min(1, "Organization name is required"),
  practiceName: z.string().optional(),
});

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export type ActionState = { error?: string } | undefined;

export async function signUp(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    organizationName: formData.get("organizationName"),
    practiceName: formData.get("practiceName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { email, password, organizationName, practiceName } = parsed.data;
  const supabase = await createClient();

  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  // Fresh signups need a confirmed session before RPC calls can carry
  // auth.uid() -- if email confirmation is required, there's no session
  // yet, so send the user to check their inbox instead of onboarding.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login?confirmEmail=1");
  }

  const { error: rpcError } = await supabase.rpc(
    "create_organization_with_owner",
    {
      org_name: organizationName,
      practice_name: practiceName ?? "",
    },
  );

  if (rpcError) {
    return { error: rpcError.message };
  }

  redirect("/dashboard");
}

export async function signIn(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

  const redirectTo = formData.get("redirectTo");
  redirect(typeof redirectTo === "string" && redirectTo ? redirectTo : "/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
