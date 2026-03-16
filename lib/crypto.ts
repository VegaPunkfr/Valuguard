/**
 * GHOST TAX — APPLICATION-LEVEL ENCRYPTION (ALE)
 *
 * AES-256-GCM encryption for sensitive financial data at rest.
 * Ensures data stored in Supabase is never in cleartext.
 *
 * Usage:
 *   import { encryptData, decryptData } from "@/lib/crypto";
 *   const cipher = encryptData("127000");
 *   const plain  = decryptData(cipher);
 *
 * Environment:
 *   ENCRYPTION_MASTER_KEY — 32-byte hex string (64 hex chars)
 *   Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *   Example output: a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
 *
 * Wire format: iv:authTag:ciphertext (all hex-encoded, colon-delimited)
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm" as const;
const IV_LENGTH = 16; // 128-bit IV for GCM
const TAG_LENGTH = 16; // 128-bit auth tag

function getMasterKey(): Buffer {
  const hex = process.env.ENCRYPTION_MASTER_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "[Ghost Tax Crypto] ENCRYPTION_MASTER_KEY must be a 64-char hex string (32 bytes). " +
      "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns a colon-delimited string: iv:authTag:ciphertext (all hex).
 */
export function encryptData(plaintext: string): string {
  const key = getMasterKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv, { authTagLength: TAG_LENGTH });

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted,
  ].join(":");
}

/**
 * Decrypt AES-256-GCM ciphertext.
 * Input format: iv:authTag:ciphertext (all hex, colon-delimited).
 * Throws if tampered (GCM auth tag verification failure).
 */
export function decryptData(encryptedPayload: string): string {
  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) {
    throw new Error("[Ghost Tax Crypto] Invalid encrypted payload format. Expected iv:tag:ciphertext");
  }

  const [ivHex, tagHex, cipherHex] = parts;
  const key = getMasterKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");

  const decipher = createDecipheriv(ALGO, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Encrypt a JSON-serializable object.
 * Returns the encrypted string representation.
 */
export function encryptJSON(data: unknown): string {
  return encryptData(JSON.stringify(data));
}

/**
 * Decrypt and parse a JSON object from encrypted payload.
 */
export function decryptJSON<T = unknown>(encryptedPayload: string): T {
  return JSON.parse(decryptData(encryptedPayload)) as T;
}

/**
 * Check if ENCRYPTION_MASTER_KEY is configured.
 * Non-throwing — use to gracefully skip encryption in dev.
 */
export function isEncryptionConfigured(): boolean {
  const hex = process.env.ENCRYPTION_MASTER_KEY;
  return typeof hex === "string" && hex.length === 64;
}

/**
 * Conditionally encrypt: if key is configured, encrypt; otherwise return plaintext.
 * Allows gradual rollout without breaking existing data.
 */
export function encryptIfConfigured(plaintext: string): string {
  return isEncryptionConfigured() ? encryptData(plaintext) : plaintext;
}

/**
 * Conditionally decrypt: detects encrypted format (iv:tag:cipher) and decrypts.
 * Falls back to returning the input as-is if not encrypted.
 */
export function decryptIfEncrypted(value: string): string {
  if (!isEncryptionConfigured()) return value;
  // Encrypted format: 32hexIV:32hexTag:cipherHex → at least 3 colon-separated hex segments
  const parts = value.split(":");
  if (parts.length === 3 && parts[0].length === 32 && parts[1].length === 32) {
    try {
      return decryptData(value);
    } catch {
      // Not encrypted or corrupted — return as-is
      return value;
    }
  }
  return value;
}
