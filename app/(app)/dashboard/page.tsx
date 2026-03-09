import { createServerSupabase } from "@/lib/supabase";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";
import type { Database } from "@/types/database";

type AuditRequest = Database["public"]["Tables"]["audit_requests"]["Row"];
type VaultSession = Database["public"]["Tables"]["vault_sessions"]["Row"];

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createServerSupabase();

  // Dev bypass: no Supabase configured
  if (!supabase) {
    return (
      <DashboardClient
        userEmail=""
        companyName=""
        auditRequests={[]}
        vaultSessions={[]}
      />
    );
  }

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    redirect("/?redirect=/dashboard");
  }

  const email = user.email;

  // Fetch audit requests for this user
  const { data: rawAR, error: arError } = await supabase
    .from("audit_requests")
    .select("*")
    .eq("email", email)
    .order("created_at", { ascending: false });

  if (arError) {
    console.error("[Dashboard] audit_requests query failed:", arError.message);
  }
  const auditRequests = (rawAR ?? []) as unknown as AuditRequest[];

  // Fetch vault sessions for this user
  const { data: rawVS, error: vsError } = await supabase
    .from("vault_sessions")
    .select("*")
    .eq("email", email)
    .order("created_at", { ascending: false });

  if (vsError) {
    console.error("[Dashboard] vault_sessions query failed:", vsError.message);
  }
  const vaultSessions = (rawVS ?? []) as unknown as VaultSession[];

  // Derive company name from most recent audit request or vault session
  const companyName =
    auditRequests[0]?.company_name ??
    vaultSessions[0]?.company_name ??
    "";

  return (
    <DashboardClient
      userEmail={email}
      companyName={companyName}
      auditRequests={auditRequests}
      vaultSessions={vaultSessions}
    />
  );
}
