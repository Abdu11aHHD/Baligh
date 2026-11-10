#!/usr/bin/env node
/**
 * Verifies that OPENROUTER_MODEL is currently listed on OpenRouter and answers
 * a minimal live completion. Run: npm run check:model
 */
const model = process.env.OPENROUTER_MODEL;
const key = process.env.OPENROUTER_API_KEY;
if (!model) {
  console.error("✗ OPENROUTER_MODEL is not set");
  process.exit(1);
}

const list = await fetch("https://openrouter.ai/api/v1/models").then((r) => r.json()).catch(() => null);
const ids = new Set((list?.data ?? []).map((m) => m.id));
if (!list) console.warn("! Could not download the OpenRouter model list");
else if (ids.has(model)) console.log(`✓ ${model} is listed on OpenRouter`);
else {
  const llamas = [...ids].filter((id) => id.startsWith("meta-llama/")).sort();
  console.error(`✗ ${model} is NOT listed on OpenRouter right now.`);
  console.error("  Meta Llama models currently listed:\n   - " + llamas.join("\n   - "));
  console.error("  The app will not silently switch models. Choose one explicitly and update OPENROUTER_MODEL.");
}

if (!key) {
  console.warn("! OPENROUTER_API_KEY is not set — skipping live completion");
  process.exit(ids.has(model) ? 0 : 1);
}

const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "Balligh AI" },
  body: JSON.stringify({ model, messages: [{ role: "user", content: 'Reply with exactly: {"ok":true}' }], max_tokens: 20, temperature: 0 }),
});
const body = await res.json().catch(() => null);
if (!res.ok || body?.error) {
  console.error(`✗ Live completion failed (HTTP ${res.status}):`, body?.error?.message ?? body);
  process.exit(1);
}
console.log(`✓ Live completion OK — answered by ${body.model}: ${body.choices?.[0]?.message?.content?.trim()}`);
