#!/usr/bin/env node
/**
 * Production smoke test. Usage:
 *   BASE_URL=https://your-app.vercel.app npm run smoke
 *   BASE_URL=... SMOKE_LIVE=1 npm run smoke   # also runs a real AI analysis + creates a real ticket
 */
const base = (process.env.BASE_URL || "").replace(/\/$/, "");
if (!base) {
  console.error("Set BASE_URL");
  process.exit(1);
}
const code = process.env.SMOKE_LOCATION || "WC-F2";
let failed = 0;
const check = (ok, label, extra = "") => {
  console.log(`${ok ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failed++;
};

const home = await fetch(`${base}/`);
const homeHtml = await home.text();
check(home.ok && homeHtml.includes("بلّغ") && homeHtml.includes('dir="rtl"'), "Home page loads in Arabic RTL");

const report = await fetch(`${base}/report?loc=${code}`);
check(report.ok, `Report page with QR code ${code} loads`);

const resolve = await fetch(`${base}/api/locations/resolve?code=${code}`);
const resolved = await resolve.json().catch(() => ({}));
check(resolve.ok && resolved.location?.code === code, "QR location resolves", resolved.location?.name_ar);

const bad = await fetch(`${base}/api/locations/resolve?code=DOES-NOT-EXIST`);
check(bad.status === 404, "Unknown QR code is rejected");

const admin = await fetch(`${base}/api/admin/reports`);
check(admin.status === 401, "Admin API refuses anonymous access");

const track = await fetch(`${base}/api/reports/track`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ ticketNumber: "BLG-000001", secret: "x".repeat(32) }),
});
check(track.status === 404, "Tracking without the right secret reveals nothing");

if (process.env.SMOKE_LIVE === "1") {
  const description = "ما فيه مناديل من الصباح";
  const a = await fetch(`${base}/api/reports/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ description, locationCode: code, turns: [] }),
  });
  const analysis = await a.json();
  check(a.ok, "Live Llama analysis", a.ok ? `${analysis.status} by ${analysis.model}` : analysis.error?.message);
  if (a.ok && analysis.status === "ready") {
    const c = await fetch(`${base}/api/reports`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ analysisToken: analysis.analysisToken, description, turns: [], ...analysis.draft }),
    });
    const created = await c.json();
    check(c.status === 201, "Ticket saved in the database", created.ticketNumber);
    if (c.ok) {
      const t = await fetch(`${base}/api/reports/track`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticketNumber: created.ticketNumber, secret: created.trackingSecret }),
      });
      const tracked = await t.json();
      check(t.ok && tracked.status === "new", "Ticket tracking works", tracked.status);
      console.log(`  → Now log in to ${base}/admin, open ${created.ticketNumber}, change its status, then re-run tracking:`);
      console.log(`    ${base}/track#${created.ticketNumber}.${created.trackingSecret}`);
    }
  }
}

process.exit(failed ? 1 : 0);
