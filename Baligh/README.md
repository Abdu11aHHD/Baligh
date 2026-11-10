# بلّغ AI — Balligh AI

**An intelligent, QR-based facility reporting system designed around the Tuwaiq Academy use case.**

A trainee scans a QR code posted in a restroom, classroom, or lab. The reporting page opens with that location already selected. They describe the problem in everyday Saudi Arabic ("المكيف ما يبرد", "ما فيه مناديل"). Meta Llama turns that into a structured ticket, asks one short question if something essential is missing, and the trainee reviews and confirms. The ticket is stored in Supabase, appears in a protected admin dashboard, and the trainee can follow its status with a private tracking code.

> **Independent demonstration project.** Balligh AI is inspired by the Tuwaiq Academy digital experience but is not affiliated with, endorsed by, or connected to Tuwaiq Academy or any of its internal systems. All seed locations are fictional.

---

## Contents

1. [Why this is useful](#why-this-is-useful)
2. [Features](#features)
3. [User flow](#user-flow)
4. [Architecture](#architecture)
5. [AI integration (Meta Llama)](#ai-integration-meta-llama)
6. [QR code architecture](#qr-code-architecture)
7. [Database](#database)
8. [Security](#security)
9. [API routes](#api-routes)
10. [Environment variables](#environment-variables)
11. [Local setup](#local-setup)
12. [Testing](#testing)
13. [Deploying to Vercel](#deploying-to-vercel)
14. [Known limitations](#known-limitations)
15. [Project status](#project-status)

---

## Why this is useful

In a large training campus, small facility problems such as an empty tissue dispenser, a projector that turns itself off, or a dead Wi-Fi access point in one lab often go unreported. Reporting usually means finding the right portal, the right form, and the right department, then describing a location precisely. Most people do not bother, and the problems that do get reported arrive as vague messages that facilities staff must chase.

Balligh AI removes each of those steps. The QR code answers "where", the trainee answers "what" in their own words, and the model handles classification, wording, routing, and priority. Staff receive consistent, actionable tickets instead of free text, and dangerous reports such as exposed wiring are escalated by fixed server rules rather than by chance.

## Features

**For trainees**

- QR-code entry with the location pre-selected, or manual entry from the website.
- Free-form Arabic description with quick example chips.
- Live analysis by Meta Llama: professional Arabic title, category and sub-type, suggested department, priority with a stated reason, and a factual summary.
- Short follow-up questions only when essential (maximum three), shown as a conversation.
- Editable ticket preview before anything is saved.
- Safety notice for immediate hazards, with a clear statement that submitting a ticket is not an emergency response.
- Ticket number plus a private tracking code, saved in the browser for convenience.
- Status tracking page with a progress bar and public status history.

**For facilities administrators**

- Supabase Auth login, with admin access checked on the server against an `admin_users` table.
- Dashboard with live counts (total, new, in progress, resolved, urgent and still open) and a category distribution.
- Ticket list with search by ticket number or title, filters by status, category, priority and location, date sorting, and pagination.
- Ticket details: original trainee text, clarification Q&A, final fields, what Llama suggested, which safety rules fired, and a full audit history.
- Change status, priority, and department; add internal notes; mark as resolved. Every change is written to the audit trail in the same database transaction.
- Location management: add, edit, disable/enable, QR preview, PNG and SVG downloads, reporting link, and a printable A4 QR poster.

## User flow

```
Scan QR ──► /report?loc=ROOM-204 ──► server resolves code ──► location shown
                                                               │
Trainee writes "النت ما يشتغل" ──► POST /api/reports/analyze ──► Llama
                                                               │
                ┌────────── needs_clarification ◄──────────────┤
                │  question shown as chat, trainee answers      │
                └──────────► POST /api/reports/analyze (turns) ─┤
                                                               ▼
                                     ready + signed analysis token
                                                               │
Trainee edits preview, confirms ──► POST /api/reports ──► Supabase (create_report)
                                                               │
              ticket number + tracking code ◄──────────────────┘
                                                               │
Admin logs in ──► /admin ──► updates status (admin_update_report)
                                                               │
Trainee opens /track#BLG-000123.<code> ──► POST /api/reports/track ──► new status
```

## Architecture

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS v4 with a custom token set, IBM Plex Sans Arabic (self-hosted via Fontsource), Lucide icons, Motion |
| Backend | Next.js Route Handlers, Zod 4 validation |
| AI | Meta Llama through the OpenRouter chat completions API |
| Database & auth | Supabase PostgreSQL with Row Level Security, Supabase Auth |
| QR | `qrcode` (server-side PNG/SVG generation) |
| Hosting | Vercel |

Cache Components is deliberately turned off in `next.config.ts`. Nearly every route reads live tickets or sessions, so the request-time model with explicit `dynamic = "force-dynamic"` is simpler and safer to reason about. The session-refresh hook lives in `src/proxy.ts` (Next 16 renamed `middleware` to `proxy`).

```
src/
  app/
    page.tsx                         Home
    report/page.tsx                  Reporting (server resolves ?loc=)
    track/page.tsx                   Tracking
    admin/login/page.tsx             Admin login
    admin/(panel)/                   Protected admin area (layout re-checks admin)
      page.tsx                       Dashboard + ticket list
      reports/[id]/page.tsx          Ticket details + actions
      locations/page.tsx             Locations & QR
      locations/[id]/poster/page.tsx Printable A4 poster
    api/…                            Route handlers (see API routes)
  components/                        UI (report flow, admin, primitives)
  lib/
    llm/                             OpenRouter client, prompt, parser, pipeline, errors
    safety.ts                        Deterministic hazard rules
    analysis-token.ts                HMAC-signed analysis tokens
    tracking.ts                      Tracking secret generation / hashing
    rate-limit.ts                    Postgres-backed rate limiting
    auth.ts, admin-api.ts            Server-side admin checks
    supabase/                        Service-role, cookie, and browser clients
    data/                            Data-access helpers
    schemas.ts, constants.ts         Zod schemas and controlled vocabularies
supabase/
  migrations/20261102000000_init.sql Schema, RLS, functions
  seed.sql                           Fictional example locations
  bootstrap-admin.sql                Grants admin to a user by email
  tests/                             Plain-Postgres schema & RLS tests
tests/                               Vitest unit, API, and live tests
scripts/                             Model check, bundle secret scan, smoke test
docs/PRESENTATION.md                 University demo guide
```

## AI integration (Meta Llama)

**Model:** `meta-llama/llama-3.1-8b-instruct:free` as requested, configured through `OPENROUTER_MODEL`.
**Endpoint:** `https://openrouter.ai/api/v1/chat/completions`.

> ⚠️ **Check model availability before relying on it.** At the time of writing, OpenRouter's page for the `:free` variant redirects to the paid `meta-llama/llama-3.1-8b-instruct` page. If the free variant has been withdrawn, every analysis returns a clear "model unavailable" error. Run `npm run check:model` to see whether the configured model is currently listed and answering. Switching to another Meta Llama model is a one-line change in `OPENROUTER_MODEL`, and the project owner should make that choice explicitly.

How a report is analysed (`src/lib/llm/analyze.ts`):

1. **Validate the request** with Zod: description 4–1000 characters, at most 3 clarification turns, location code format, 16 KB body cap.
2. **Resolve the QR location** against the `locations` table. Unknown or disabled codes are rejected before the model is called.
3. **Build a strict prompt** (`prompt.ts`). The system prompt is in English, which small models follow more reliably. It requires Arabic output, lists every allowed enum value, explains priority levels, forbids invented details, tells the model the trainee text is data rather than instructions, and includes one worked example. The registered location is passed as known context, so the model is told never to ask for it.
4. **Call OpenRouter** with `temperature: 0.2`, a timeout (`OPENROUTER_TIMEOUT_MS`, default 25 s), and no fallback model list. The app also refuses to start a call if `OPENROUTER_MODEL` is not a `meta-llama/` model.
5. **Extract and validate JSON** (`parse.ts`). The free model does not reliably support structured-output modes, so the parser pulls the first balanced JSON object out of the reply (tolerating code fences or extra prose), validates its shape, and maps every enum onto the controlled lists. Unknown values become safe defaults (`other`, `normal`, the category's default department) and are logged. If the reply is unusable, one repair request is sent showing the model its own output. If that also fails, the user sees an error. **No fake or template result is ever returned.**
6. **Apply business rules.** A location question is dropped when the location is already known. After the third clarification the model must produce a ticket.
7. **Apply the safety floor** (`safety.ts`). Fixed Arabic keyword rules (exposed wiring, smoke/fire, gas, electric shock, water near electricity, major leaks, structural damage, injury, trapped elevator) can only raise the priority. The AI suggestion (`ai_priority`) and the rule result (`safety_flags`, `safety_min_priority`) are stored separately so their sources stay auditable.
8. **Sign the result.** For ready results the server returns an HMAC-signed *analysis token* binding the AI suggestion to the exact description and answers. Ticket creation requires a valid, unexpired token whose hash matches the submitted text.

Errors are mapped to specific, user-facing Arabic messages: configuration problem, invalid key, no credits, model unavailable, rate limited, timeout, provider error, empty reply, invalid output, and incomplete after the maximum number of questions.

## QR code architecture

- Each location has a unique `code` (for example `ROOM-204`). Its QR code encodes `NEXT_PUBLIC_SITE_URL/report?loc=ROOM-204`.
- The server validates the code format and looks it up. A valid active code shows the location; an unknown or disabled code shows an Arabic explanation and the manual location picker.
- A QR code proves nothing about where the person physically is. It only makes reporting easier. No GPS or maps are used.
- QR images are generated on the server with error-correction level Q (25%), so a scuffed printed poster still scans.
- **Production QR codes cannot point at localhost.** In production, `getSiteUrl()` refuses `localhost` and plain `http`, and the admin QR page shows an error instead of generating a useless poster.
- `NEXT_PUBLIC_SITE_URL` is baked in at build time. After changing it, **redeploy**.
- Changing a location's code invalidates any posters already printed for it. The edit form warns about this.

## Database

Created by `supabase/migrations/20261102000000_init.sql`.

| Table | Purpose |
| --- | --- |
| `locations` | Registered campus locations: `code` (unique, format-checked), `name_ar`, `building`, `floor`, `area`, `is_active`. |
| `reports` | Tickets. `ticket_number` (`BLG-000001`, from a sequence), `location_id` *or* `location_text`, `raw_description`, `clarifications` (jsonb), final `title` / `summary` / `category` / `subcategory` / `priority` / `assigned_department` / `status`, the AI's original suggestion (`ai_*` columns, `ai_model`), `safety_flags`, `safety_min_priority`, `tracking_hash`, timestamps. Every enum column has a `CHECK` constraint. |
| `report_events` | Audit trail: `created`, `status_changed`, `priority_changed`, `department_changed`, `note`. `is_internal` controls what the trainee can see. |
| `admin_users` | Which Supabase Auth users are admins (`admin` or `staff`). |
| `rate_limits` | Fixed-window counters keyed by hashed IP and bucket. |

Functions:

- `create_report(jsonb)`: inserts the report and its `created` event atomically. Callable only by the service role.
- `admin_update_report(...)`: checks `is_admin(auth.uid())`, locks the row, applies changes, and writes one audit event per change. This is the **only** way to modify a report; there is no direct UPDATE policy.
- `admin_report_stats()`: dashboard counts, `SECURITY INVOKER`, so RLS applies and non-admins get zeros.
- `check_rate_limit(key, limit, window)`: atomic upsert counter. Service role only.
- `is_admin(uid)`: helper used by policies.

Indexes cover `created_at`, `status`, `priority`, `category`, `location_id`, and `(report_id, created_at)` on events.

## Security

| Concern | What the code does |
| --- | --- |
| Secrets | `OPENROUTER_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `REPORT_SIGNING_SECRET` are read only in modules marked `server-only`. `npm run check:bundle` scans `.next/static` for their names, values, and server-only markers after each build. |
| Input validation | Zod on every route; request size caps; control and bidi-override characters stripped; enums enforced in both Zod and SQL `CHECK` constraints. |
| AI output | Treated as untrusted: JSON extracted, schema-validated, enums coerced to controlled lists, lengths capped. React escapes all text; there is no `dangerouslySetInnerHTML`. |
| Prompt injection | Trainee text is fenced and labelled as data. Even a successful injection can only influence title, summary, and enum choices inside the allowed lists, and the trainee and admin review those anyway. |
| Abuse | Durable Postgres-backed rate limits per hashed IP on analyze, create, track, and location resolve. The limiter fails closed. Ticket creation requires a signed analysis token, so the cheap "skip the AI" path is closed. |
| Anonymous tracking | 192-bit random secret per ticket, shown once. Only its SHA-256 hash is stored, and comparison is constant-time. A wrong secret and a non-existent ticket return the same 404. Internal notes are never returned. |
| Admin auth | Supabase Auth with email and password. Each admin page and API call runs `supabase.auth.getUser()` (validated with the auth server) and looks up `admin_users` on the server. Client flags are never trusted. |
| Database | RLS on every table. Anonymous users can read only active locations. Reports and events are readable only by admins, and modifications go through the audited function. |
| Headers | `X-Frame-Options: DENY`, `nosniff`, HSTS, strict referrer policy, and a restrictive permissions policy. |
| Privacy | No personal data is required to report. IPs are HMAC-hashed before storage. Tracking links carry the secret in the URL fragment (`#…`), which browsers never send to servers. |

## API routes

| Method & path | Auth | Purpose |
| --- | --- | --- |
| `POST /api/reports/analyze` | public, rate-limited | Validate → resolve location → Llama → validate → safety floor → `ready` (with analysis token) or `needs_clarification`. |
| `POST /api/reports` | public, rate-limited, analysis token | Create the ticket. Re-applies the safety floor; returns ticket number and tracking secret. |
| `POST /api/reports/track` | ticket number + secret | Ticket status and public history. |
| `GET /api/locations/resolve?code=` | public, rate-limited | Resolve a QR location code. |
| `GET /api/admin/reports` | admin | List with filters (`q`, `status`, `category`, `priority`, `location`, `sort`, `page`). |
| `GET /api/admin/reports/[id]` | admin | Ticket details and full history. |
| `PATCH /api/admin/reports/[id]` | admin | Update status, priority, department, or add a note (audited). |
| `GET /api/admin/locations` | admin | All locations. |
| `POST /api/admin/locations` | admin | Create a location. |
| `PATCH /api/admin/locations/[id]` | admin | Edit, disable, or enable a location. |
| `GET /api/admin/locations/[id]/qr?format=png\|svg&download=1` | admin | QR image for the location's production URL. |

## Environment variables

Copy `.env.example` to `.env.local` for local development. Set the same variables in Vercel for production.

| Variable | Scope | Notes |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | server | Your OpenRouter key (the one labelled "Balligh"). |
| `OPENROUTER_MODEL` | server | Must start with `meta-llama/`. Default as requested: `meta-llama/llama-3.1-8b-instruct:free`. |
| `OPENROUTER_TIMEOUT_MS` | server, optional | Per-call timeout, 3000–60000 ms (default 25000). |
| `NEXT_PUBLIC_SITE_URL` | public | Production domain, e.g. `https://balligh.vercel.app`. Used in QR codes. Must be `https` in production. |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon key (safe in the browser because RLS applies). |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Bypasses RLS. Never expose it. |
| `REPORT_SIGNING_SECRET` | server | At least 32 random characters. Signs analysis tokens and keys the IP hash. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. |

`REPORT_SIGNING_SECRET` is the only variable added beyond the original list. It is needed so the ticket endpoint can verify that a real Llama analysis happened, without storing drafts.

## Local setup

Requirements: Node.js 20.9 or newer (22 recommended) and a Supabase project (the free tier is fine).

```bash
npm install
cp .env.example .env.local      # fill in the values
```

**1. Create the database.** In the Supabase dashboard, open **SQL Editor** and run these in order:

1. `supabase/migrations/20261102000000_init.sql`
2. `supabase/seed.sql` (seven fictional example locations)

If you use the Supabase CLI instead: `supabase link` then `supabase db push`, and run `seed.sql` in the SQL editor.

**2. Create the first admin.**

1. In **Authentication → Users → Add user**, create a user with email and password and tick *Auto Confirm User*.
2. Edit the email in `supabase/bootstrap-admin.sql` and run it in the SQL editor.
3. Recommended: in **Authentication → Providers → Email**, turn off *Allow new users to sign up*. Strangers who sign up still cannot reach admin data, but there is no reason to let them create accounts.

**3. Check the model and run the app.**

```bash
npm run check:model   # is OPENROUTER_MODEL listed and answering?
npm run dev           # http://localhost:3000
```

Try `http://localhost:3000/report?loc=ROOM-204`, then log in at `/admin/login`.

## Testing

| Command | What it covers | Real services? |
| --- | --- | --- |
| `npm test` | 87 Vitest tests. Unit: safety rules, JSON extraction and normalisation, schemas, tracking secrets, analysis tokens, site URL rules. API: analyze route (prompt contents, model name, QR handling, clarification, location-question suppression, repair retry, every OpenRouter failure mode, timeout, safety escalation, non-Llama refusal, rate limiting, max turns), create route (safety floor, token tampering, location rules, hash-only storage), track route (correct versus wrong secret), admin routes (401 for anonymous, RPC mapping, validation). | **Mocked** OpenRouter and Supabase. |
| `npm run test:db` | Applies the real migration and seed to a throwaway Postgres (with a small Supabase stand-in for roles and `auth.uid()`), then tests ticket creation, constraints, rate limiting, and RLS as anon, non-admin, and admin, plus audited updates and stats. Requires `TEST_DATABASE_URL`. | Real Postgres 16, not hosted Supabase. |
| `npm run test:live` | Calls the real configured Llama model through OpenRouter for three reports. Skipped automatically if no key is set. | **Live** OpenRouter. |
| `npm run check:model` | Checks the model is listed on OpenRouter and answers one completion. | **Live** OpenRouter. |
| `npm run check:bundle` | After `build`, scans browser bundles for secret names, values, and server-only markers. | — |
| `npm run smoke` | Production smoke test: home in RTL, QR resolution, invalid code rejected, admin API refuses anonymous access, tracking reveals nothing without a secret. With `SMOKE_LIVE=1` it also runs a live analysis, creates a real ticket, and tracks it. | **Live** deployment. |
| `npm run verify` | lint, typecheck, test, build, check:bundle. | — |

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint, typecheck, unit/API tests, the Postgres schema tests, the build, and the bundle scan on every push.

## Deploying to Vercel

1. Push the project to a GitHub repository (`.env.local` is git-ignored; never commit secrets).
2. In Vercel, choose **Add New → Project** and import the repository. The framework is detected as Next.js; keep the default build settings.
3. Add every variable from the table above under **Settings → Environment Variables** for *Production*. For the first deploy, set `NEXT_PUBLIC_SITE_URL` to the domain Vercel will give you (for example `https://balligh-ai.vercel.app`), or to your custom domain.
4. Deploy. If the final domain differs from what you set, update `NEXT_PUBLIC_SITE_URL` and **redeploy**, because it is baked in at build time.
5. Run the smoke tests:

   ```bash
   BASE_URL=https://your-domain npm run smoke
   BASE_URL=https://your-domain SMOKE_LIVE=1 npm run smoke
   ```

6. Finish by hand: log in at `/admin/login` from a second device, open the smoke-test ticket, change its status, then open the tracking link the script printed and confirm the new status appears.
7. In `/admin/locations`, open a QR code and confirm the link uses your production domain. Print one poster and scan it with a phone camera.

`/api/reports/analyze` sets `maxDuration = 60` seconds. Vercel's Hobby plan allows this with Fluid compute (the default for new projects).

## Known limitations

- **Free model availability and quotas.** The `:free` variant may be unavailable, and OpenRouter's free models have low daily request limits. A paid Meta Llama model costs only cents for a project of this size, but switching must be an explicit decision.
- **8B model quality.** Llama 3.1 8B handles Saudi dialect reasonably well but sometimes returns imperfect JSON or slightly awkward Arabic titles. The repair retry and normalisation absorb most of this, and trainees and admins can edit the result. `meta-llama/llama-3.3-70b-instruct` is noticeably more reliable if you choose to switch.
- **Safety rules favour false positives.** Keyword matching cannot fully understand negation ("ما فيه دخان" still matches "دخان"). This is intentional: an over-escalated ticket costs an admin a few seconds. Admins can lower the priority.
- **Shared campus IPs.** Rate limits are per IP. Campus Wi-Fi often puts many trainees behind one address, so the defaults are generous (see `src/lib/rate-limit.ts`). Adjust them if needed.
- **Tracking code recovery.** If a trainee loses both the tracking code and their browser storage, the ticket cannot be tracked anonymously. This is the price of not requiring accounts.
- **No notifications.** Trainees check status themselves; there is no email or SMS.
- **Demo only.** The system does not dispatch staff, guarantee response times, or connect to any academy system.
- **Next.js 16.** This project uses the current major version of Next.js. If you upgrade, read `node_modules/next/dist/docs` for breaking changes.

## Project status

**Verified in the build environment**

- `npm run lint` and `npm run typecheck`: clean.
- `npm test`: 87/87 passing (mocked OpenRouter and Supabase).
- `npm run test:db`: migration, seed, constraints, RLS, rate limiter, and audited admin updates all pass on real PostgreSQL 16.
- `npm run build`: production build succeeds.
- `npm run check:bundle`: no secret names, values, or server-only markers in client bundles, checked with real-looking placeholder secrets set at build time.
- The production server was run against a mock Supabase API. Every page was rendered in Chromium on desktop and mobile widths and reviewed: home, report, clarification, preview, success, invalid QR, tracking, admin login, dashboard, ticket detail, locations, and poster. QR codes on the home page and poster were decoded and point to the configured production domain. The A4 poster prints to exactly one A4 page.
- With no internet access to OpenRouter, the analyze endpoint returned a clear "temporary error" instead of a fabricated result.

**Not yet verified (requires your accounts)**

- A live analysis by the configured Meta Llama model (`npm run check:model`, `npm run test:live`).
- The migration on a hosted Supabase project, and the real Supabase Auth login flow.
- Vercel deployment and the production smoke test, including an admin status change seen by the trainee.
