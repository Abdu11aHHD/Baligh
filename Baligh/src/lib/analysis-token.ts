import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getSigningSecret } from "./env";
import type { Category, Department, Priority, Subcategory } from "./constants";
import type { SafetyFlag } from "./safety";
import type { Turn } from "./schemas";

/**
 * The analysis token binds a ticket submission to a real, server-side Llama
 * analysis of the exact same text. It lets us:
 *  - store the genuine AI suggestion separately from what the trainee edited,
 *  - refuse tickets that never went through analysis (cheap spam path),
 *  - keep the API stateless (no draft table needed).
 */

export interface AnalysisTokenPayload {
  v: 1;
  /** Hash of description + clarification turns */
  h: string;
  /** Registered location id resolved at analysis time, if any */
  loc: string | null;
  ai: {
    title: string;
    category: Category;
    subcategory: Subcategory;
    priority: Priority;
    department: Department;
    priorityReason: string;
  };
  /** Deterministic safety flags */
  f: SafetyFlag[];
  /** Model id that actually answered */
  m: string;
  iat: number;
}

const MAX_AGE_MS = 45 * 60 * 1000;

export function hashConversation(description: string, turns: Turn[]): string {
  return createHash("sha256").update(JSON.stringify({ d: description, t: turns }), "utf8").digest("base64url");
}

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data, "utf8").digest("base64url");
}

export function signAnalysisToken(payload: Omit<AnalysisTokenPayload, "v" | "iat">, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ ...payload, v: 1, iat: now }), "utf8").toString("base64url");
  return `${body}.${sign(body, getSigningSecret())}`;
}

export type TokenCheck =
  | { ok: true; payload: AnalysisTokenPayload }
  | { ok: false; reason: "malformed" | "signature" | "expired" | "mismatch" };

export function verifyAnalysisToken(
  token: string,
  description: string,
  turns: Turn[],
  now = Date.now(),
): TokenCheck {
  const [body, mac, extra] = token.split(".");
  if (!body || !mac || extra !== undefined) return { ok: false, reason: "malformed" };
  const expected = Buffer.from(sign(body, getSigningSecret()));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "signature" };
  let payload: AnalysisTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (payload.v !== 1 || typeof payload.iat !== "number") return { ok: false, reason: "malformed" };
  if (now - payload.iat > MAX_AGE_MS || payload.iat - now > 60_000) return { ok: false, reason: "expired" };
  if (payload.h !== hashConversation(description, turns)) return { ok: false, reason: "mismatch" };
  return { ok: true, payload };
}
