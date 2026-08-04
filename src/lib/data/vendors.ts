import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getVendorsForOrg(organizationId: string) {
  const supabase = await createClient();

  const { data: practices, error: practicesError } = await supabase
    .from("practices")
    .select("id, name")
    .eq("organization_id", organizationId);

  if (practicesError) throw practicesError;
  if (!practices.length) return { practices: [], vendors: [] };

  const practiceIds = practices.map((p) => p.id);

  const { data: vendors, error: vendorsError } = await supabase
    .from("vendors")
    .select(
      "id, practice_id, name, contact_name, contact_email, status, verification_due_date, risk_score",
    )
    .in("practice_id", practiceIds)
    .order("name");

  if (vendorsError) throw vendorsError;

  return { practices, vendors };
}

export async function getVendorDetail(vendorId: string) {
  const supabase = await createClient();

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", vendorId)
    .single();

  if (vendorError) throw vendorError;

  const { data: cycles, error: cyclesError } = await supabase
    .from("verification_cycles")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  if (cyclesError) throw cyclesError;

  return { vendor, cycles };
}
