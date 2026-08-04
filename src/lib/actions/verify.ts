"use server";

import { createClient } from "@/lib/supabase/server";

export type VerifyActionState = { error?: string; success?: boolean } | undefined;

export async function submitVerificationResponse(
  token: string,
  _prevState: VerifyActionState,
  formData: FormData,
): Promise<VerifyActionState> {
  const summary = formData.get("summary");

  if (typeof summary !== "string" || summary.trim().length === 0) {
    return { error: "Please describe your current safeguards before submitting." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_verification_response", {
    p_token: token,
    p_summary: summary,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
