/**
 * Resolves the public base URL that QR codes and tracking links point to.
 * In production, a localhost URL is a configuration error: printed QR posters
 * would be useless, so we refuse instead of silently generating them.
 */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);

export class SiteUrlError extends Error {}

export function getSiteUrl(
  raw: string | undefined = process.env.NEXT_PUBLIC_SITE_URL,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): string {
  if (!raw) throw new SiteUrlError("NEXT_PUBLIC_SITE_URL is not set");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SiteUrlError("NEXT_PUBLIC_SITE_URL is not a valid URL");
  }
  if (nodeEnv === "production") {
    if (LOCAL_HOSTS.has(url.hostname)) {
      throw new SiteUrlError("NEXT_PUBLIC_SITE_URL points to localhost in production");
    }
    if (url.protocol !== "https:") {
      throw new SiteUrlError("NEXT_PUBLIC_SITE_URL must use https in production");
    }
  }
  return url.origin;
}

export function buildReportUrl(locationCode: string, base?: string): string {
  const origin = base ?? getSiteUrl();
  const url = new URL("/report", origin);
  url.searchParams.set("loc", locationCode);
  return url.toString();
}
