/**
 * GHOST TAX — SUPABASE CLIENT FACTORY
 *
 * Single source of truth for all database access.
 * No component ever imports @supabase/ssr directly.
 *
 * THREE CLIENTS, THREE SECURITY LEVELS:
 *
 * 1. createBrowserSupabase()
 *    → 'use client' components
 *    → Uses ANON key (public, RLS-gated)
 *
 * 2. createServerSupabase()
 *    → Server Components, Route Handlers, Server Actions
 *    → Reads session from cookies for RLS context
 *
 * 3. createAdminSupabase()
 *    → Edge Functions, internal scripts ONLY
 *    → Uses SERVICE_ROLE key (bypasses RLS)
 *    → NEVER imported in any client-side code
 *
 * ENV VARS REQUIRED:
 *   NEXT_PUBLIC_SUPABASE_URL      → Supabase project URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY → Public anon key (safe for browser)
 *   SUPABASE_SERVICE_ROLE_KEY     → Admin key (server only)
 *
 * DEV MODE: If env vars are missing, functions return null instead of crashing.
 */

import { createBrowserClient } from "@supabase/ssr";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

// ── Env helpers ────────────────────────────────────────

function getEnv(name: string): string | null {
  const value = process.env[name];
  if (!value) {
    console.warn(
      `[Ghost Tax] Missing env var: ${name}. Supabase features disabled.`
    );
    return null;
  }
  return value;
}

const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_ANON_KEY = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

// ── 1. Browser Client ('use client' components) ───────

export function createBrowserSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ── 2. Server Client (Server Components + Route Handlers) ─────

export async function createServerSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component where cookies are read-only.
        }
      },
    },
  });
}

// ── 3. Admin Client (Edge Functions / internal scripts ONLY) ──

export function createAdminSupabase() {
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !serviceRoleKey) return null;

  return createBrowserClient<Database>(SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ── Type export for downstream modules ────────────────

export type SupabaseClient = NonNullable<ReturnType<typeof createBrowserSupabase>>;
export type ServerSupabaseClient = NonNullable<
  Awaited<ReturnType<typeof createServerSupabase>>
>;
