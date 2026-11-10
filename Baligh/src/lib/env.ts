import "server-only";
import { z } from "zod";

/**
 * Server-side environment, validated lazily so `next build` does not require
 * production secrets. Each getter throws a clear error when misconfigured.
 */

const openRouterSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(10, "OPENROUTER_API_KEY is missing"),
  OPENROUTER_MODEL: z.string().min(3, "OPENROUTER_MODEL is missing"),
  OPENROUTER_TIMEOUT_MS: z.coerce.number().int().min(3000).max(60000).default(25000),
});

const supabaseSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url("NEXT_PUBLIC_SUPABASE_URL must be a URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, "SUPABASE_SERVICE_ROLE_KEY is missing"),
});

const signingSchema = z.object({
  REPORT_SIGNING_SECRET: z.string().min(32, "REPORT_SIGNING_SECRET must be at least 32 characters"),
});

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

function parse<T extends z.ZodTypeAny>(schema: T): z.infer<T> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    throw new ConfigError(result.error.issues.map((i) => i.message).join("; "));
  }
  return result.data;
}

export const getOpenRouterEnv = () => parse(openRouterSchema);
export const getSupabaseEnv = () => parse(supabaseSchema);
export const getSigningSecret = () => parse(signingSchema).REPORT_SIGNING_SECRET;
