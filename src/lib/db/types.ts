// Hand-written to match supabase/migrations/*.sql.
// Once a live Supabase project exists, regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/db/types.ts

export type OrgPlan = "starter" | "growth" | "msp";
export type OrgRole = "owner" | "admin" | "member";
export type VendorStatus =
  | "active"
  | "pending_verification"
  | "verified"
  | "overdue"
  | "inactive";
export type VerificationCycleStatus =
  | "scheduled"
  | "sent"
  | "reminded"
  | "responded"
  | "verified"
  | "overdue";

type Tables = Database["public"]["Tables"];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          plan: OrgPlan;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Tables["organizations"]["Row"]> & { name: string };
        Update: Partial<Tables["organizations"]["Row"]>;
        Relationships: [];
      };
      organization_members: {
        Row: {
          organization_id: string;
          user_id: string;
          role: OrgRole;
          created_at: string;
        };
        Insert: Partial<Tables["organization_members"]["Row"]> & {
          organization_id: string;
          user_id: string;
        };
        Update: Partial<Tables["organization_members"]["Row"]>;
        Relationships: [];
      };
      practices: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Tables["practices"]["Row"]> & {
          organization_id: string;
          name: string;
        };
        Update: Partial<Tables["practices"]["Row"]>;
        Relationships: [];
      };
      vendors: {
        Row: {
          id: string;
          practice_id: string;
          name: string;
          contact_name: string | null;
          contact_email: string;
          service_description: string | null;
          status: VendorStatus;
          baa_signed_date: string | null;
          verification_due_date: string | null;
          risk_score: number | null;
          risk_rationale: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Tables["vendors"]["Row"]> & {
          practice_id: string;
          name: string;
          contact_email: string;
        };
        Update: Partial<Tables["vendors"]["Row"]>;
        Relationships: [];
      };
      vendor_documents: {
        Row: {
          id: string;
          vendor_id: string;
          storage_path: string;
          label: string;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: Partial<Tables["vendor_documents"]["Row"]> & {
          vendor_id: string;
          storage_path: string;
          label: string;
        };
        Update: Partial<Tables["vendor_documents"]["Row"]>;
        Relationships: [];
      };
      verification_cycles: {
        Row: {
          id: string;
          vendor_id: string;
          status: VerificationCycleStatus;
          due_date: string;
          sent_at: string | null;
          last_reminder_at: string | null;
          reminder_count: number;
          responded_at: string | null;
          response_summary: string | null;
          verified_at: string | null;
          verified_by: string | null;
          created_at: string;
        };
        Insert: Partial<Tables["verification_cycles"]["Row"]> & {
          vendor_id: string;
          due_date: string;
        };
        Update: Partial<Tables["verification_cycles"]["Row"]>;
        Relationships: [];
      };
      verification_tokens: {
        Row: {
          token: string;
          verification_cycle_id: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: Partial<Tables["verification_tokens"]["Row"]> & {
          verification_cycle_id: string;
          expires_at: string;
        };
        Update: Partial<Tables["verification_tokens"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_organization_with_owner: {
        Args: { org_name: string; practice_name: string };
        Returns: string;
      };
      get_verification_request: {
        Args: { p_token: string };
        Returns: {
          vendor_name: string;
          due_date: string;
          status: VerificationCycleStatus;
          expired: boolean;
        }[];
      };
      submit_verification_response: {
        Args: { p_token: string; p_summary: string };
        Returns: boolean;
      };
    };
  };
}
