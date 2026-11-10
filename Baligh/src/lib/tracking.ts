import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 24 random bytes → 32 url-safe characters (~192 bits of entropy). */
export function generateTrackingSecret(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * SHA-256 is appropriate here because the secret is high-entropy random data,
 * not a human password; slow KDFs only matter for guessable inputs.
 */
export function hashTrackingSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function verifyTrackingSecret(secret: string, storedHash: string): boolean {
  const a = Buffer.from(hashTrackingSecret(secret), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
