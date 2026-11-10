import "server-only";
import { getAdminSession, type AdminSession } from "./auth";
import { apiError, internalError } from "./http";

/** Wraps an admin route: verifies the Supabase session + admin_users row server-side. */
export function withAdmin<C>(
  handler: (req: Request, session: AdminSession, ctx: C) => Promise<Response>,
  context: string,
) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      const session = await getAdminSession();
      if (!session) return apiError(401, "UNAUTHORIZED", "يلزم تسجيل الدخول بحساب مشرف.");
      return await handler(req, session, ctx);
    } catch (err) {
      return internalError(err, context);
    }
  };
}

export function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
