import { createServerSupabase } from "@/lib/supabase";
import { redirect } from "next/navigation";
import VaultClient from "./VaultClient";
import type { Database } from "@/types/database";

type AuditRequest = Database["public"]["Tables"]["audit_requests"]["Row"];

export const dynamic = "force-dynamic";

export default async function VaultPage() {
  const supabase = await createServerSupabase();

  // Dev bypass: no Supabase configured
  if (!supabase) {
    return <VaultClient userEmail="" auditRequests={[]} />;
  }

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    redirect("/?redirect=/vault");
  }

  const email = user.email;

  // Fetch audit requests (reports) for this user
  const { data: rawAR, error: arError } = await supabase
    .from("audit_requests")
    .select("*")
    .eq("email", email)
    .order("created_at", { ascending: false });

  if (arError) {
    console.error("[Vault] audit_requests query failed:", arError.message);
  }
  const auditRequests = (rawAR ?? []) as unknown as AuditRequest[];

  return <VaultClient userEmail={email} auditRequests={auditRequests} />;
}
