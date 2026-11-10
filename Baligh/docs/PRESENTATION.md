# Balligh AI — Presentation Guide

A guide for presenting Balligh AI as a university project in about 10–12 minutes, with a live demo. Each section explains what to say, why it matters, and where it lives in the code, so you can answer follow-up questions with confidence.

---

## Before you present

- Run `npm run check:model` the morning of the presentation. If the free model is unavailable or out of quota, you want to find out at home, not in front of the committee.
- Print one QR poster (Admin → المواقع ورموز QR → ملصق للطباعة) and bring it. Scanning a real poster with a phone is the most convincing moment of the demo.
- Prepare two devices: your phone as the trainee, and a laptop logged into `/admin` on the projector.
- Have one ticket already in each status so the dashboard does not look empty.
- Keep a backup screen recording of the full flow in case the venue Wi-Fi fails.

---

## 1. The problem Balligh AI addresses

**Say:** "In a big campus, small problems such as no tissues, a broken AC, or dead Wi-Fi in one lab are noticed by dozens of trainees and reported by almost none. Reporting means finding a portal, picking a department, filling a form, and describing a location precisely. When reports do arrive, they're vague: 'the internet isn't working', with no room and no detail. Facilities staff spend their time chasing information instead of fixing things."

**Point to make:** the problem is not a lack of reporting tools. It is the friction and the poor quality of what gets reported. Balligh attacks both.

## 2. Why QR codes simplify reporting

**Say:** "Each place has its own QR code. You scan it with your normal phone camera, with no app and no login, and the reporting page opens with the location already filled in. The hardest part of a good report, *where exactly*, is answered before you type anything."

**Demo:** scan the printed poster with your phone. The page shows «الموقع المحدد من رمز QR: قاعة 204».

**Details worth mentioning:**

- The QR contains a normal URL: `/report?loc=ROOM-204`. The server checks the code against registered locations. An unknown or disabled code shows a clear message and a manual location list instead of failing.
- A QR code does not prove the person is physically there. It is a convenience, not a security check. Being honest about this shows engineering maturity.
- Posters use high error-correction QR codes, so a scratched print still scans.
- In production the system refuses to generate QR codes that point to `localhost`, a common real-world mistake.

*Code:* `src/app/report/page.tsx`, `src/lib/site-url.ts`, `src/lib/qr.ts`, `src/app/admin/(panel)/locations/[id]/poster/page.tsx`.

## 3. How Meta Llama understands Arabic reports

**Say:** "Trainees write the way they talk: «المكيف ما يبرد», «ما فيه مناديل», «النت ما يشتغل». Meta Llama reads that and produces a structured ticket: a professional Arabic title, a category from a fixed list, a priority with a reason, and the department that should handle it."

**Demo 1 (ready immediately):** on the QR page type «ما فيه مناديل من الصباح» and press تحليل. Show the preview: title, category المرافق والخدمات, priority عادية, and the reason.

**Demo 2 (follow-up question):** open `/report` without a QR code, type «النت ما يشتغل». The assistant asks «في أي قاعة أو معمل تواجه المشكلة؟». Answer it and show the updated ticket. Then explain: "If the location is already known from the QR code, it never asks this. We enforce that rule in code, not just in the prompt."

**Demo 3 (safety):** type «فيه سلك كهربائي مكشوف عند الباب». Show the red safety notice and that priority is عاجلة, with the note that safety rules raised it.

**How it works, in one breath:** the prompt tells the model about Saudi expressions, gives it the exact allowed categories and priorities, forbids inventing details, tells it to treat the trainee's text as data rather than instructions, and asks for JSON only. The model asks at most one question at a time and at most three in total.

*Code:* `src/lib/llm/prompt.ts`.

## 4. Why Llama is the main AI model

**Say:** "We chose Meta Llama because it is an open-weight model family. The same model we call through OpenRouter today could later be hosted inside the academy's own infrastructure, which matters for an educational institution that may want student data to stay in-house. It is also inexpensive. For short Arabic reports, an 8-billion-parameter model is enough, especially because we don't trust it blindly."

**Point to make:** the system never silently switches to GPT, Gemini, or anything else. If the configured Llama model is unavailable, users see a clear error, and the code refuses any model whose name doesn't start with `meta-llama/`. The tests check this.

**Honest trade-off to mention if asked:** a larger Llama (70B) would give more polished Arabic and more reliable JSON. The architecture supports switching with one setting.

## 5. How the frontend communicates with the backend

**Say:** "The browser never talks to the AI or to the database directly. It only talks to our own API routes."

- The page sends `{ description, locationCode, turns }` to `POST /api/reports/analyze`.
- The server answers with either a clarification question or a ready ticket draft plus a signed *analysis token*.
- When the trainee confirms, the browser sends the edited ticket and that token to `POST /api/reports`.
- For tracking, the browser sends the ticket number and private code to `POST /api/reports/track`.

**Why it matters:** API keys stay on the server, every input is validated on the server, and the browser can't skip steps.

*Code:* `src/components/report/report-flow.tsx`, `src/lib/api-types.ts`.

## 6. How the backend calls OpenRouter

**Say:** "The backend sends a normal chat-completions request to OpenRouter with the Llama model name, our system prompt, and the trainee's text. We use a low temperature for consistent output, a 25-second timeout, and no fallback model list."

**Failure handling (worth showing on a slide):** missing configuration, invalid key, no credits, model unavailable, rate limit, timeout, provider error, empty answer, and invalid output each produce a specific Arabic message. No fake answer is ever shown as if it came from Llama.

*Code:* `src/lib/llm/openrouter.ts`, `src/lib/llm/errors.ts`.

## 7. How reports are validated

This is the strongest technical part of the project. Present it as **four layers**:

1. **Input validation** with Zod: length limits, maximum three follow-up answers, location code format, request size cap, and removal of invisible control and text-direction characters.
2. **AI output validation:** the server extracts the JSON, checks its shape, and maps every category, priority, and department onto a fixed list. Anything unknown becomes a safe default. If the output is broken, the model gets one chance to repair it; otherwise the user sees an error.
3. **Deterministic safety rules:** fixed rules detect hazards like exposed wires, smoke, gas, water near electricity, or injuries and can only *raise* the priority. "Priority must never depend only on the AI." The AI's suggestion and the rule's decision are stored in separate columns, so an admin can see which one decided.
4. **Signed analysis token:** the server signs the AI result together with a hash of the exact text. A ticket can only be created with a valid token for the same text, so nobody can skip the AI step or forge a lower priority. The safety floor is recalculated again at submission.

*Code:* `src/lib/schemas.ts`, `src/lib/llm/parse.ts`, `src/lib/safety.ts`, `src/lib/analysis-token.ts`.

## 8. How tickets are stored

**Say:** "Tickets are stored in Supabase, which is a hosted PostgreSQL database. Each ticket gets a readable number like BLG-000014 and an audit history."

- Tables: `locations`, `reports`, `report_events` (history), `admin_users`, `rate_limits`.
- Creating a ticket and its first history entry happens in a single database function, so they can't get out of sync.
- Every category, priority, and status column has a database constraint. Even a bug in the app can't store an invalid value.
- **Anonymous tracking without accounts:** each ticket gets a random 32-character tracking code, shown once. The database stores only its hash, like a password. To see a ticket you need both the number and the code, and a wrong code gets exactly the same response as a ticket that doesn't exist.
- **Row Level Security:** anonymous users can read only active locations. Only admins can read tickets.

**Demo:** after submitting, show the success screen with the ticket number and tracking code, then open the tracking page.

*Code:* `supabase/migrations/20261102000000_init.sql`.

## 9. How administrators manage reports

**Demo (on the laptop):** go to `/admin`.

1. Point out the live counts and that they come straight from the database, not hard-coded numbers.
2. Filter to urgent tickets. Open the exposed-wire ticket from Demo 3.
3. Show the original trainee text, what Llama suggested, and the safety rule that raised the priority.
4. Change status to «قيد المعالجة» and add an internal note. Show the history update.
5. On your phone, refresh the tracking page. The new status appears, but the internal note does not.

**Security point:** "Admin access is checked on the server for every page and every API call, against a table of authorised users. The browser can't simply claim to be an admin. Admins also can't edit tickets directly in the database: every change goes through one function that checks permissions and records who changed what."

Then show **location management**: add a location, preview its QR, download PNG or SVG, open the printable poster, and disable a location to show what a trainee sees when scanning a disabled code.

## 10. What official academy adoption would require

Presenting this honestly is a strength. Balligh AI is an independent demo, and real adoption would need:

1. **Official approval and branding.** Use of the academy's identity and logo only with permission; today the project uses its own name and logo and states that it is independent.
2. **Real location registry.** Import the actual rooms and facilities and assign owners to each.
3. **Single sign-on for staff.** Connect admin login to the academy's identity provider and add roles per department, so the IT team sees only IT tickets.
4. **Integration with the existing ticketing or maintenance system,** so tickets flow into the tools staff already use.
5. **Notifications:** optional email or SMS to trainees when status changes, and alerts to on-call staff for urgent tickets.
6. **Data governance:** a privacy notice, retention periods, and possibly self-hosting Llama so report text never leaves academy infrastructure, which is possible because Llama is open-weight.
7. **Evaluation:** measure on real anonymised reports how often the AI's category and priority match staff decisions, and tune the prompt and safety rules.
8. **Operations:** service levels, monitoring, backups, a paid model tier sized for real traffic, and accessibility testing with real users.

---

## Suggested slide outline

1. Title: بلّغ AI, with an independent-project note
2. The problem (one photo of an empty tissue dispenser works well)
3. The idea: scan, describe, review, track
4. Live demo
5. Architecture diagram (browser → Next.js API → OpenRouter/Llama and Supabase)
6. Four layers of validation
7. Security and privacy
8. Admin experience
9. Testing: 87 automated tests, real-Postgres RLS tests, live model check
10. Limitations and path to adoption
11. Thank you, with the live URL and a QR code to it

## Likely questions

**"What if the AI is wrong?"** The trainee reviews and edits before sending, the admin can change everything afterwards, and hazard priority is guaranteed by fixed rules, not the model.

**"What if someone spams fake reports?"** Server-side rate limits per network, a signed AI analysis required for every ticket, and admins can close junk. A real deployment could add a CAPTCHA or require academy login.

**"Why not just a Google Form?"** A form can't understand «النت ما يشتغل», ask the right follow-up question, route to the right team, or escalate a dangerous report automatically, and it would require the trainee to choose categories and type the location themselves.

**"Is student data safe?"** No personal data is required. IP addresses are stored only as one-way hashes for rate limiting. Tracking codes are stored hashed, and nobody can see a ticket without its code.

**"Why not use GPT or Claude?"** The requirement was an open-weight model that could later be hosted in-house. Llama meets that, and the code deliberately refuses non-Llama models.
