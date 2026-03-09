/**
 * GHOST TAX — WEBHOOK RETRY ENGINE
 *
 * Exponential backoff retry mechanism with dead-letter queue
 * for failed delivery pipeline executions.
 *
 * Retry schedule (5 attempts):
 *   1 →  5 min    (300s)
 *   2 → 15 min    (900s)
 *   3 →  1 hour   (3600s)
 *   4 →  4 hours  (14400s)
 *   5 → 24 hours  (86400s)
 *
 * After 5 failures → dead_letter. Manual retry via retryDeadLetter().
 *
 * Table: webhook_retries (migration 006)
 * Access: createAdminSupabase() — service_role only.
 */

import { createAdminSupabase } from "@/lib/supabase";
import { executeDeliveryPipeline, type DeliveryInput } from "@/lib/delivery";

// ── Types ─────────────────────────────────────────────

export interface WebhookRetryPayload {
  eventType: string;
  stripePaymentIntentId: string;
  email: string;
  sessionId: string;
  metadata: Record<string, unknown>;
}

export interface DeadLetterEntry {
  id: string;
  jobId: string;
  payload: WebhookRetryPayload;
  attempts: number;
  errorLog: ErrorLogEntry[];
  lastError: string;
  createdAt: string;
}

export interface RetryResult {
  jobId: string;
  status: "completed" | "retrying" | "dead_letter" | "skipped";
  attempt: number;
  error?: string;
}

interface ErrorLogEntry {
  attempt: number;
  timestamp: string;
  error: string;
}

// ── Constants ─────────────────────────────────────────

const MAX_ATTEMPTS = 5;

/** Backoff delays in seconds, indexed by attempt number (1-based) */
const BACKOFF_SECONDS: Record<number, number> = {
  1: 300,      //  5 min
  2: 900,      // 15 min
  3: 3600,     //  1 hour
  4: 14400,    //  4 hours
  5: 86400,    // 24 hours
};

// ── Schedule Retry ────────────────────────────────────

/**
 * Enqueue a failed webhook for retry with exponential backoff.
 * If the job already exists and is pending, the attempt counter is updated.
 * If max attempts exceeded, the job moves to dead_letter immediately.
 */
export async function scheduleRetry(
  jobId: string,
  payload: WebhookRetryPayload,
  attempt: number,
  errorMessage?: string,
): Promise<void> {
  const db = createAdminSupabase();
  if (!db) {
    console.error("[Webhook Retry] No database connection. Retry lost for job:", jobId);
    return;
  }

  const now = new Date().toISOString();
  const errorEntry: ErrorLogEntry = {
    attempt,
    timestamp: now,
    error: errorMessage || "Unknown error",
  };

  // If we've exhausted all attempts, go straight to dead letter
  if (attempt >= MAX_ATTEMPTS) {
    console.error(`[Webhook Retry] Job ${jobId} exhausted ${MAX_ATTEMPTS} attempts → dead letter`);

    // Try to update existing row first, then insert if not found
    const { data: existing } = await (db as any)
      .from("webhook_retries")
      .select("id, error_log")
      .eq("job_id", jobId)
      .single();

    if (existing) {
      const updatedLog = [...(existing.error_log || []), errorEntry];
      await (db as any)
        .from("webhook_retries")
        .update({
          status: "dead_letter",
          attempt,
          error_log: updatedLog,
          next_retry_at: null,
          updated_at: now,
        })
        .eq("id", existing.id);
    } else {
      await (db as any)
        .from("webhook_retries")
        .insert({
          job_id: jobId,
          payload,
          attempt,
          max_attempts: MAX_ATTEMPTS,
          status: "dead_letter",
          error_log: [errorEntry],
          next_retry_at: null,
        });
    }
    return;
  }

  // Calculate next retry time
  const delaySec = BACKOFF_SECONDS[attempt + 1] || BACKOFF_SECONDS[MAX_ATTEMPTS];
  const nextRetryAt = new Date(Date.now() + delaySec * 1000).toISOString();

  console.log(
    `[Webhook Retry] Scheduling job ${jobId} attempt ${attempt + 1}/${MAX_ATTEMPTS} ` +
    `in ${delaySec}s (${new Date(nextRetryAt).toISOString()})`,
  );

  // Upsert: if job already exists, update it; otherwise create
  const { data: existing } = await (db as any)
    .from("webhook_retries")
    .select("id, error_log")
    .eq("job_id", jobId)
    .single();

  if (existing) {
    const updatedLog = [...(existing.error_log || []), errorEntry];
    await (db as any)
      .from("webhook_retries")
      .update({
        attempt,
        status: "pending",
        next_retry_at: nextRetryAt,
        error_log: updatedLog,
        updated_at: now,
      })
      .eq("id", existing.id);
  } else {
    await (db as any)
      .from("webhook_retries")
      .insert({
        job_id: jobId,
        payload,
        attempt,
        max_attempts: MAX_ATTEMPTS,
        status: "pending",
        next_retry_at: nextRetryAt,
        error_log: errorMessage ? [errorEntry] : [],
      });
  }
}

// ── Process Retry Queue ───────────────────────────────

/**
 * Process all pending retries whose next_retry_at has passed.
 * Called by the cron endpoint /api/cron/retry-webhooks.
 *
 * For each job:
 *   1. Mark as "processing" (prevents double-pickup)
 *   2. Re-execute the delivery pipeline
 *   3. On success → "completed"
 *   4. On failure → scheduleRetry(attempt+1) or dead_letter
 */
export async function processRetryQueue(): Promise<RetryResult[]> {
  const db = createAdminSupabase();
  if (!db) {
    console.error("[Webhook Retry] No database connection. Queue processing aborted.");
    return [];
  }

  const now = new Date().toISOString();

  // Fetch all pending jobs ready for retry
  const { data: jobs, error: fetchError } = await (db as any)
    .from("webhook_retries")
    .select("*")
    .eq("status", "pending")
    .lte("next_retry_at", now)
    .order("next_retry_at", { ascending: true })
    .limit(20); // Process max 20 per cron tick to stay within execution limits

  if (fetchError) {
    console.error("[Webhook Retry] Queue fetch error:", fetchError.message);
    return [];
  }

  if (!jobs?.length) {
    return [];
  }

  console.log(`[Webhook Retry] Processing ${jobs.length} pending retries`);

  const results: RetryResult[] = [];

  for (const job of jobs) {
    const payload = job.payload as WebhookRetryPayload;
    const nextAttempt = (job.attempt || 0) + 1;

    // Mark as processing to prevent double-pickup
    await (db as any)
      .from("webhook_retries")
      .update({ status: "processing", updated_at: now })
      .eq("id", job.id);

    try {
      // Re-execute the delivery pipeline
      const deliveryInput = buildDeliveryInput(payload);
      const result = await executeDeliveryPipeline(deliveryInput);

      if (result.success) {
        // Mark completed
        const completedLog: ErrorLogEntry = {
          attempt: nextAttempt,
          timestamp: new Date().toISOString(),
          error: `Succeeded on attempt ${nextAttempt} (runId: ${result.runId})`,
        };

        await (db as any)
          .from("webhook_retries")
          .update({
            status: "completed",
            attempt: nextAttempt,
            next_retry_at: null,
            error_log: [...(job.error_log || []), completedLog],
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        console.log(`[Webhook Retry] Job ${job.job_id} succeeded on attempt ${nextAttempt}`);
        results.push({ jobId: job.job_id, status: "completed", attempt: nextAttempt });
      } else {
        // Pipeline returned failure (non-exception)
        const errMsg = result.error || "Pipeline returned failure";
        console.error(`[Webhook Retry] Job ${job.job_id} attempt ${nextAttempt} failed: ${errMsg}`);

        if (nextAttempt >= MAX_ATTEMPTS) {
          // Move to dead letter
          const dlEntry: ErrorLogEntry = {
            attempt: nextAttempt,
            timestamp: new Date().toISOString(),
            error: errMsg,
          };

          await (db as any)
            .from("webhook_retries")
            .update({
              status: "dead_letter",
              attempt: nextAttempt,
              next_retry_at: null,
              error_log: [...(job.error_log || []), dlEntry],
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);

          results.push({ jobId: job.job_id, status: "dead_letter", attempt: nextAttempt, error: errMsg });
        } else {
          // Schedule next retry
          const delaySec = BACKOFF_SECONDS[nextAttempt + 1] || BACKOFF_SECONDS[MAX_ATTEMPTS];
          const nextRetryAt = new Date(Date.now() + delaySec * 1000).toISOString();
          const retryEntry: ErrorLogEntry = {
            attempt: nextAttempt,
            timestamp: new Date().toISOString(),
            error: errMsg,
          };

          await (db as any)
            .from("webhook_retries")
            .update({
              status: "pending",
              attempt: nextAttempt,
              next_retry_at: nextRetryAt,
              error_log: [...(job.error_log || []), retryEntry],
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);

          results.push({ jobId: job.job_id, status: "retrying", attempt: nextAttempt, error: errMsg });
        }
      }
    } catch (err) {
      // Unhandled exception during pipeline execution
      const errMsg = err instanceof Error ? err.message : "Unhandled exception";
      console.error(`[Webhook Retry] Job ${job.job_id} attempt ${nextAttempt} exception: ${errMsg}`);

      if (nextAttempt >= MAX_ATTEMPTS) {
        const dlEntry: ErrorLogEntry = {
          attempt: nextAttempt,
          timestamp: new Date().toISOString(),
          error: errMsg,
        };

        await (db as any)
          .from("webhook_retries")
          .update({
            status: "dead_letter",
            attempt: nextAttempt,
            next_retry_at: null,
            error_log: [...(job.error_log || []), dlEntry],
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        results.push({ jobId: job.job_id, status: "dead_letter", attempt: nextAttempt, error: errMsg });
      } else {
        const delaySec = BACKOFF_SECONDS[nextAttempt + 1] || BACKOFF_SECONDS[MAX_ATTEMPTS];
        const nextRetryAt = new Date(Date.now() + delaySec * 1000).toISOString();
        const retryEntry: ErrorLogEntry = {
          attempt: nextAttempt,
          timestamp: new Date().toISOString(),
          error: errMsg,
        };

        await (db as any)
          .from("webhook_retries")
          .update({
            status: "pending",
            attempt: nextAttempt,
            next_retry_at: nextRetryAt,
            error_log: [...(job.error_log || []), retryEntry],
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        results.push({ jobId: job.job_id, status: "retrying", attempt: nextAttempt, error: errMsg });
      }
    }
  }

  return results;
}

// ── Dead Letter Queue ─────────────────────────────────

/**
 * Retrieve all dead-lettered webhook jobs for admin monitoring.
 * Returns newest first.
 */
export async function getDeadLetterQueue(): Promise<DeadLetterEntry[]> {
  const db = createAdminSupabase();
  if (!db) {
    console.error("[Webhook Retry] No database connection.");
    return [];
  }

  const { data, error } = await (db as any)
    .from("webhook_retries")
    .select("*")
    .eq("status", "dead_letter")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[Webhook Retry] Dead letter query error:", error.message);
    return [];
  }

  return (data || []).map((row: any) => {
    const errorLog = (row.error_log || []) as ErrorLogEntry[];
    return {
      id: row.id,
      jobId: row.job_id,
      payload: row.payload as WebhookRetryPayload,
      attempts: row.attempt,
      errorLog,
      lastError: errorLog.length > 0 ? errorLog[errorLog.length - 1].error : "Unknown",
      createdAt: row.created_at,
    };
  });
}

// ── Manual Retry from Dead Letter ─────────────────────

/**
 * Manually retry a dead-lettered job. Resets it to pending with attempt 0,
 * giving it a fresh set of 5 retry attempts.
 *
 * Returns true if the job was found and reset, false otherwise.
 */
export async function retryDeadLetter(entryId: string): Promise<boolean> {
  const db = createAdminSupabase();
  if (!db) {
    console.error("[Webhook Retry] No database connection.");
    return false;
  }

  // Verify the entry exists and is actually dead-lettered
  const { data: entry, error: fetchError } = await (db as any)
    .from("webhook_retries")
    .select("id, job_id, error_log")
    .eq("id", entryId)
    .eq("status", "dead_letter")
    .single();

  if (fetchError || !entry) {
    console.error(`[Webhook Retry] Dead letter entry ${entryId} not found or not in dead_letter status`);
    return false;
  }

  const now = new Date().toISOString();
  const resetEntry: ErrorLogEntry = {
    attempt: 0,
    timestamp: now,
    error: "Manual retry from dead letter queue — reset to pending",
  };

  // Reset: attempt back to 0, status to pending, immediate retry
  const { error: updateError } = await (db as any)
    .from("webhook_retries")
    .update({
      status: "pending",
      attempt: 0,
      next_retry_at: now, // Retry immediately on next cron tick
      error_log: [...(entry.error_log || []), resetEntry],
      updated_at: now,
    })
    .eq("id", entryId);

  if (updateError) {
    console.error(`[Webhook Retry] Failed to reset dead letter ${entryId}:`, updateError.message);
    return false;
  }

  console.log(`[Webhook Retry] Dead letter ${entry.job_id} (${entryId}) reset to pending for manual retry`);
  return true;
}

// ── Helpers ───────────────────────────────────────────

/**
 * Convert a WebhookRetryPayload back into a DeliveryInput
 * that executeDeliveryPipeline() expects.
 */
function buildDeliveryInput(payload: WebhookRetryPayload): DeliveryInput {
  const meta = payload.metadata || {};
  return {
    stripeSessionId: payload.stripePaymentIntentId,
    email: payload.email,
    domain: (meta.domain as string) || "",
    companyName: (meta.companyName as string) || undefined,
    locale: (meta.locale as string) || "en",
    headcount: meta.headcount ? parseInt(String(meta.headcount), 10) : undefined,
    monthlySpendEur: meta.monthlySpendEur ? parseFloat(String(meta.monthlySpendEur)) : undefined,
    industry: (meta.industry as string) || undefined,
  };
}
