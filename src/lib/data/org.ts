import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const VENDOR_LIMITS: Record<string, number> = {
  starter: 15,
  growth: 50,
  msp: Infinity,
};

export async function getCurrentOrgContext() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    // Authenticated but onboarding (create_organization_with_owner) never
    // ran or failed partway through -- send them back to finish signup.
    redirect("/signup");
  }

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, plan")
    .eq("id", membership.organization_id)
    .single();

  if (orgError || !organization) {
    redirect("/signup");
  }

  return {
    user,
    role: membership.role,
    organization,
    vendorLimit: VENDOR_LIMITS[organization.plan] ?? VENDOR_LIMITS.starter,
  };
}

export async function getPractices(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("practices")
    .select("id, name, created_at")
    .eq("organization_id", organizationId)
    .order("name");

  if (error) throw error;
  return data;
}
