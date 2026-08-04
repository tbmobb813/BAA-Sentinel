"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgContext } from "@/lib/data/org";
import { getVendorsForOrg } from "@/lib/data/vendors";
import { sendVerificationRequestEmail } from "@/lib/email/verification";

const createVendorSchema = z.object({
  practiceId: z.string().uuid(),
  name: z.string().min(1, "Vendor name is required"),
  contactName: z.string().optional(),
  contactEmail: z.string().email("Enter a valid contact email"),
  serviceDescription: z.string().optional(),
});

export type ActionState = { error?: string } | undefined;

export async function createVendor(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createVendorSchema.safeParse({
    practiceId: formData.get("practiceId"),
    name: formData.get("name"),
    contactName: formData.get("contactName") || undefined,
    contactEmail: formData.get("contactEmail"),
    serviceDescription: formData.get("serviceDescription") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { organization, vendorLimit } = await getCurrentOrgContext();
  const { vendors } = await getVendorsForOrg(organization.id);

  if (vendors.length >= vendorLimit) {
    return {
      error: `You've reached your plan's limit of ${vendorLimit} vendors. Upgrade to add more.`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("vendors").insert({
    practice_id: parsed.data.practiceId,
    name: parsed.data.name,
    contact_name: parsed.data.contactName ?? null,
    contact_email: parsed.data.contactEmail,
    service_description: parsed.data.serviceDescription ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/vendors");
  redirect("/vendors");
}

const oneYearFromNow = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

export async function startVerificationCycle(vendorId: string) {
  const supabase = await createClient();

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("id, name, contact_email")
    .eq("id", vendorId)
    .single();

  if (vendorError || !vendor) {
    throw new Error(vendorError?.message ?? "Vendor not found");
  }

  const { data: cycle, error: cycleError } = await supabase
    .from("verification_cycles")
    .insert({ vendor_id: vendorId, due_date: oneYearFromNow(), status: "scheduled" })
    .select("id")
    .single();

  if (cycleError || !cycle) {
    throw new Error(cycleError?.message ?? "Failed to create verification cycle");
  }

  const { data: token, error: tokenError } = await supabase
    .from("verification_tokens")
    .insert({
      verification_cycle_id: cycle.id,
      expires_at: oneYearFromNow(),
    })
    .select("token")
    .single();

  if (tokenError || !token) {
    throw new Error(tokenError?.message ?? "Failed to create verification token");
  }

  await sendVerificationRequestEmail({
    to: vendor.contact_email,
    vendorName: vendor.name,
    token: token.token,
  });

  await supabase
    .from("verification_cycles")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", cycle.id);

  await supabase
    .from("vendors")
    .update({ status: "pending_verification" })
    .eq("id", vendorId);

  revalidatePath(`/vendors/${vendorId}`);
}

export async function markVerified(vendorId: string, cycleId: string) {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();

  const { error: cycleError } = await supabase
    .from("verification_cycles")
    .update({
      status: "verified",
      verified_at: new Date().toISOString(),
      verified_by: userData.user?.id ?? null,
    })
    .eq("id", cycleId);

  if (cycleError) throw new Error(cycleError.message);

  const { error: vendorError } = await supabase
    .from("vendors")
    .update({ status: "verified", verification_due_date: oneYearFromNow() })
    .eq("id", vendorId);

  if (vendorError) throw new Error(vendorError.message);

  revalidatePath(`/vendors/${vendorId}`);
}
