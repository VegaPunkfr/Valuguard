/**
 * Supabase Database Types
 * Auto-generated stub — replace with `supabase gen types typescript` output
 * when your schema is finalized.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          org_id: string | null;
          role: "admin" | "member" | "viewer";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name?: string | null;
          org_id?: string | null;
          role?: "admin" | "member" | "viewer";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          org_id?: string | null;
          role?: "admin" | "member" | "viewer";
          created_at?: string;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          industry: string | null;
          employee_count: number | null;
          plan: "free" | "audit" | "pro" | "enterprise";
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          industry?: string | null;
          employee_count?: number | null;
          plan?: "free" | "audit" | "pro" | "enterprise";
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          industry?: string | null;
          employee_count?: number | null;
          plan?: "free" | "audit" | "pro" | "enterprise";
          created_at?: string;
        };
      };
      vault_sessions: {
        Row: {
          id: string;
          email: string;
          company_name: string;
          contact_name: string | null;
          ghost_tax_annual: number | null;
          ghost_tax_low: number | null;
          ghost_tax_high: number | null;
          entropy_score: number | null;
          entropy_kappa: number | null;
          peer_percentile: number | null;
          audit_roi: number | null;
          recoverable_annual: number | null;
          headcount: number | null;
          industry: string | null;
          saas_tool_count: number | null;
          monthly_spend_saas: number | null;
          monthly_spend_cloud: number | null;
          monthly_spend_ai: number | null;
          monthly_spend_total: number | null;
          currency: string;
          country: string;
          session_data: Json;
          source: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          status: "pending" | "contacted" | "qualified" | "converted" | "lost";
          organization_id: string | null;
          audit_request_id: string | null;
          converted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          company_name: string;
          contact_name?: string | null;
          ghost_tax_annual?: number | null;
          ghost_tax_low?: number | null;
          ghost_tax_high?: number | null;
          entropy_score?: number | null;
          entropy_kappa?: number | null;
          peer_percentile?: number | null;
          audit_roi?: number | null;
          recoverable_annual?: number | null;
          headcount?: number | null;
          industry?: string | null;
          saas_tool_count?: number | null;
          monthly_spend_saas?: number | null;
          monthly_spend_cloud?: number | null;
          monthly_spend_ai?: number | null;
          monthly_spend_total?: number | null;
          currency?: string;
          country?: string;
          session_data?: Json;
          source?: string | null;
          status?: "pending" | "contacted" | "qualified" | "converted" | "lost";
          created_at?: string;
        };
        Update: {
          email?: string;
          company_name?: string;
          contact_name?: string | null;
          ghost_tax_annual?: number | null;
          entropy_score?: number | null;
          status?: "pending" | "contacted" | "qualified" | "converted" | "lost";
          organization_id?: string | null;
          audit_request_id?: string | null;
          converted_at?: string | null;
        };
      };
      audit_requests: {
        Row: {
          id: string;
          organization_id: string | null;
          vault_session_id: string | null;
          email: string;
          company_name: string;
          contact_name: string | null;
          headcount: number | null;
          estimated_monthly_spend: number | null;
          saas_count: number | null;
          pain_points: string[] | null;
          source: string | null;
          locale: string;
          status: "pending" | "paid" | "processing" | "delivered" | "failed" | "followup_scheduled" | "lost";
          estimator_results: Json | null;
          stripe_payment_intent_id: string | null;
          run_id: string | null;
          domain: string | null;
          report_data: Json | null;
          delivered_at: string | null;
          followup_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          vault_session_id?: string | null;
          email: string;
          company_name: string;
          contact_name?: string | null;
          headcount?: number | null;
          estimated_monthly_spend?: number | null;
          saas_count?: number | null;
          pain_points?: string[] | null;
          source?: string | null;
          locale?: string;
          status?: "pending" | "paid" | "processing" | "delivered" | "failed" | "followup_scheduled" | "lost";
          estimator_results?: Json | null;
          stripe_payment_intent_id?: string | null;
          run_id?: string | null;
          domain?: string | null;
          report_data?: Json | null;
          created_at?: string;
        };
        Update: {
          status?: "pending" | "paid" | "processing" | "delivered" | "failed" | "followup_scheduled" | "lost";
          report_data?: Json | null;
          delivered_at?: string | null;
          followup_at?: string | null;
          run_id?: string | null;
          domain?: string | null;
        };
      };
      reports: {
        Row: {
          id: string;
          org_id: string;
          title: string;
          status: "draft" | "processing" | "complete" | "archived";
          anomaly_count: number;
          total_waste: number;
          entropy_coefficient: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          title: string;
          status?: "draft" | "processing" | "complete" | "archived";
          anomaly_count?: number;
          total_waste?: number;
          entropy_coefficient?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          title?: string;
          status?: "draft" | "processing" | "complete" | "archived";
          anomaly_count?: number;
          total_waste?: number;
          entropy_coefficient?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      monitoring_reports: {
        Row: {
          id: string;
          org_id: string | null;
          audit_request_id: string | null;
          report_month: string;
          report_data: Json;
          drift_summary: Json;
          vendor_alerts: Json;
          exposure_delta_eur: number | null;
          created_at: string;
          delivered_at: string | null;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          audit_request_id?: string | null;
          report_month: string;
          report_data?: Json;
          drift_summary?: Json;
          vendor_alerts?: Json;
          exposure_delta_eur?: number | null;
          created_at?: string;
          delivered_at?: string | null;
        };
        Update: {
          report_data?: Json;
          drift_summary?: Json;
          vendor_alerts?: Json;
          exposure_delta_eur?: number | null;
          delivered_at?: string | null;
        };
      };
      outreach_leads: {
        Row: {
          id: string;
          email: string;
          domain: string | null;
          company_name: string | null;
          headcount: number | null;
          industry: string | null;
          source: string;
          status: "new" | "contacted" | "replied" | "qualified" | "converted" | "unsubscribed" | "bounced";
          score: number;
          last_contacted_at: string | null;
          created_at: string;
          metadata: Json;
        };
        Insert: {
          id?: string;
          email: string;
          domain?: string | null;
          company_name?: string | null;
          headcount?: number | null;
          industry?: string | null;
          source?: string;
          status?: "new" | "contacted" | "replied" | "qualified" | "converted" | "unsubscribed" | "bounced";
          score?: number;
          last_contacted_at?: string | null;
          created_at?: string;
          metadata?: Json;
        };
        Update: {
          email?: string;
          domain?: string | null;
          company_name?: string | null;
          headcount?: number | null;
          industry?: string | null;
          source?: string;
          status?: "new" | "contacted" | "replied" | "qualified" | "converted" | "unsubscribed" | "bounced";
          score?: number;
          last_contacted_at?: string | null;
          metadata?: Json;
        };
      };
      outreach_sequences: {
        Row: {
          id: string;
          lead_id: string | null;
          sequence_name: string;
          current_step: number;
          max_steps: number;
          status: "active" | "paused" | "completed" | "unsubscribed";
          next_send_at: string | null;
          started_at: string;
          completed_at: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          lead_id?: string | null;
          sequence_name?: string;
          current_step?: number;
          max_steps?: number;
          status?: "active" | "paused" | "completed" | "unsubscribed";
          next_send_at?: string | null;
          started_at?: string;
          completed_at?: string | null;
          metadata?: Json;
        };
        Update: {
          lead_id?: string | null;
          sequence_name?: string;
          current_step?: number;
          max_steps?: number;
          status?: "active" | "paused" | "completed" | "unsubscribed";
          next_send_at?: string | null;
          completed_at?: string | null;
          metadata?: Json;
        };
      };
      referrals: {
        Row: {
          id: string;
          referrer_email: string;
          referrer_code: string;
          referred_email: string | null;
          status: "seed" | "pending" | "converted" | "expired";
          reward_eur: number;
          converted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          referrer_email: string;
          referrer_code: string;
          referred_email?: string | null;
          status?: "seed" | "pending" | "converted" | "expired";
          reward_eur?: number;
          converted_at?: string | null;
          created_at?: string;
        };
        Update: {
          referrer_email?: string;
          referrer_code?: string;
          referred_email?: string | null;
          status?: "seed" | "pending" | "converted" | "expired";
          reward_eur?: number;
          converted_at?: string | null;
        };
      };
      webhook_retries: {
        Row: {
          id: string;
          job_id: string;
          payload: Json;
          attempt: number;
          max_attempts: number;
          next_retry_at: string | null;
          status: "pending" | "processing" | "completed" | "dead_letter";
          error_log: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          payload: Json;
          attempt?: number;
          max_attempts?: number;
          next_retry_at?: string | null;
          status?: "pending" | "processing" | "completed" | "dead_letter";
          error_log?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          job_id?: string;
          payload?: Json;
          attempt?: number;
          next_retry_at?: string | null;
          status?: "pending" | "processing" | "completed" | "dead_letter";
          error_log?: Json;
          updated_at?: string;
        };
      };
      anomalies: {
        Row: {
          id: string;
          report_id: string;
          type: string;
          severity: "critical" | "high" | "medium" | "low";
          vendor: string;
          annual_waste: number;
          description: string;
          recommendation: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          type: string;
          severity?: "critical" | "high" | "medium" | "low";
          vendor: string;
          annual_waste: number;
          description: string;
          recommendation: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          type?: string;
          severity?: "critical" | "high" | "medium" | "low";
          vendor?: string;
          annual_waste?: number;
          description?: string;
          recommendation?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
