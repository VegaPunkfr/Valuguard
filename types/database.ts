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
          user_id: string | null;
          session_token: string;
          estimator_data: Json;
          peer_gap_data: Json | null;
          entropy_score: number | null;
          ghost_tax_amount: number | null;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          session_token: string;
          estimator_data: Json;
          peer_gap_data?: Json | null;
          entropy_score?: number | null;
          ghost_tax_amount?: number | null;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          session_token?: string;
          estimator_data?: Json;
          peer_gap_data?: Json | null;
          entropy_score?: number | null;
          ghost_tax_amount?: number | null;
          created_at?: string;
          expires_at?: string;
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
