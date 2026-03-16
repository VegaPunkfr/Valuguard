/**
 * GHOST TAX — RESILIENT FETCH (SERVER-ONLY)
 *
 * Generic fetch wrapper with:
 *   - Configurable timeout (default 15s)
 *   - Exponential backoff retry (default 3 attempts)
 *   - Jitter to prevent thundering herd
 *   - 429 / 5xx detection for intelligent retry
 *   - Structured error reporting
 *
 * Usage:
 *   import { fetchWithRetry } from "@/lib/network/fetch-retry";
 *   const resp = await fetchWithRetry("https://crt.sh/?q=...", { method: "GET" });
 */

export interface FetchRetryOptions {
  /** Max retry attempts (default 3) */
  retries?: number;
  /** Base delay in ms before first retry (default 1000) */
  baseDelayMs?: number;
  /** Request timeout in ms (default 15000) */
  timeoutMs?: number;
  /** Only retry on these status codes. Default: [429, 500, 502, 503, 504] */
  retryOnStatus?: number[];
  /** Called on each retry attempt (for logging) */
  onRetry?: (attempt: number, status: number | null, delayMs: number) => void;
}

const DEFAULT_RETRY_STATUSES = [429, 500, 502, 503, 504];

/**
 * Fetch with exponential backoff, timeout, and jitter.
 *
 * Throws FetchRetryError after all attempts exhausted.
 * Returns the Response object on success (caller checks resp.ok if needed).
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  opts?: FetchRetryOptions,
): Promise<Response> {
  const retries = opts?.retries ?? 3;
  const baseDelay = opts?.baseDelayMs ?? 1000;
  const timeoutMs = opts?.timeoutMs ?? 15000;
  const retryStatuses = opts?.retryOnStatus ?? DEFAULT_RETRY_STATUSES;

  let lastError: Error | null = null;
  let lastStatus: number | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Merge caller's signal with our timeout
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      // If caller passed a signal, abort our controller if theirs fires
      if (init?.signal) {
        init.signal.addEventListener("abort", () => controller.abort(), { once: true });
      }

      const resp = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Success — return even if !resp.ok (caller decides)
      if (resp.ok || !retryStatuses.includes(resp.status)) {
        return resp;
      }

      // Retryable status code
      lastStatus = resp.status;
      lastError = new Error(`HTTP ${resp.status}`);

      if (attempt < retries) {
        const delay = calcDelay(attempt, baseDelay);
        opts?.onRetry?.(attempt + 1, resp.status, delay);
        await sleep(delay);
        continue;
      }

      // Exhausted retries — return the last response anyway
      return resp;
    } catch (err) {
      clearTimeout(0); // safety
      lastError = err instanceof Error ? err : new Error(String(err));
      lastStatus = null;

      // Abort/timeout or network error
      if (attempt < retries) {
        const delay = calcDelay(attempt, baseDelay);
        opts?.onRetry?.(attempt + 1, null, delay);
        await sleep(delay);
        continue;
      }
    }
  }

  // Should not reach here, but safety net
  throw new FetchRetryError(
    `fetchWithRetry exhausted ${retries + 1} attempts for ${url}`,
    lastStatus,
    lastError,
  );
}

/**
 * Convenience: fetch JSON with retry. Returns parsed body or null on failure.
 */
export async function fetchJSONWithRetry<T = unknown>(
  url: string,
  init?: RequestInit,
  opts?: FetchRetryOptions,
): Promise<T | null> {
  try {
    const resp = await fetchWithRetry(url, init, opts);
    if (!resp.ok) return null;
    return (await resp.json()) as T;
  } catch {
    return null;
  }
}

// ── Internals ────────────────────────────────────────

function calcDelay(attempt: number, baseMs: number): number {
  // Exponential: base × 2^attempt + random jitter (0-500ms)
  return baseMs * Math.pow(2, attempt) + Math.random() * 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class FetchRetryError extends Error {
  status: number | null;
  cause: Error | null;

  constructor(message: string, status: number | null, cause: Error | null) {
    super(message);
    this.name = "FetchRetryError";
    this.status = status;
    this.cause = cause;
  }
}
