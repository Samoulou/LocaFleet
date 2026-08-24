# LocaFleet

Fleet rental management SaaS for Swiss SMEs.

## Documentation

See the full Product Requirements Document: [docs/index.md](docs/index.md)

A DELETE : 
resultat de l'audit : 
Review complete — LocaFleet audit
Static checks: tsc --noEmit ✅ clean · ESLint: 0 errors / 28 warnings · no committed secrets · .env.example sanitized ✅
🔴 Security — High priority
1. AI Copilot bypasses RBAC entirely — src/app/api/ai/chat/route.ts + src/lib/ai/tool-executors.ts
Auth is checked (getCurrentUser, rate-limited 10/min/user ✅) and queries are tenant-scoped ✅ — but no hasPermission() anywhere in the tool layer. Consequence: an employee (déménageur, matrix = clients ❌ contracts ❌ invoices ❌) or viewer can ask the copilot and get client lists, contract amounts, unpaid balances (getClientBalance), monthly revenue (getDashboardSummary). Privilege escalation through the chat box.
Fix: map tools → required (resource, action) and check before dispatching each call.
2. Public endpoint without rate limiting — src/actions/trial-requests.ts:89
Landing form: Zod ✅ honeypot ✅ HTML escaping ✅ — but nothing stops flooding: DB pollution + Resend email cost abuse. Fix: IP-based checkRateLimit (with its per-instance caveat) + optionally Cloudflare Turnstile.
3. Dependencies: 41 vulns (2 critical, 24 high)
- better-auth@1.4.18 — 4 critical advisories ≤1.6.21. Your config (email+password only, no OAuth/OIDC provider) makes most non-exploitable today, but the upgrade path will hurt more later. Upgrade to ≥1.6.22.
- xlsx@0.18.5 (prototype pollution + ReDoS, no fix available): imported nowhere in src/ → dead dependency, remove it.
- vitest critical — dev-only, trivial bump.
- ws (via supabase/openai) — npm audit fix.
🟡 Medium
- Password policy: minPasswordLength: 6 (src/lib/auth.ts:28) — too weak for a multi-tenant SaaS. Raise to 10–12.
- Sign-in brute force: no explicit rateLimit config in betterAuth({...}) — you're relying on defaults (~100 req/min/IP). Configure explicitly, stricter on /sign-in.
- Cross-tenant duplicate emails possible: uniqueness = (email, tenantId) (schema.ts:283), but Better Auth resolves sessions by email globally. Same person/email in two tenants = wrong-row match risk at sign-in. Either enforce globally-unique email or validate the adapter's lookup.
- PII in logs: ai/chat/route.ts:168 logs full tool args (client data) to console. Trim.
- OpenAI client without timeout/maxRetries (openrouter.ts) × up to 10 iterations = a hung request can hold a connection for a long time.
🟢 Bugs / logic
- AI availability ≠ blocking engine: tool-executors.ts:104 ignores draft contracts in availability, whereas conflicts.ts:17 blocks on draft. The copilot can say "available" for a vehicle that createDraftContract would refuse. Also different boundary semantics (gte vs gt) between the two files.
- checkEmployeeConflicts doesn't filter users.isActive (minor, future-proofing).
- 28 ESLint warnings (react-hooks/incompatible-library on TanStack tables...) — non-blocking.
✅ What's solid (verified)
- tenantId filtering present in all sampled actions, both PDF routes, conflicts engine
- Uniform requirePermission + AuthorizationError pattern; the only action without auth is trial-requests (by design)
- Zod validation everywhere, including the LLM body
- FOR UPDATE lock against double-booking (contracts.ts:185), quote numbering under transaction
- In-memory rate limiter: documented single-instance assumption + eviction cap — honest V1 design

Du coup j'ai demandé de tout fix : 
il a fait et rep ca : 
All green. Summary of the fixes on branch fix/security-hardening:
Changes (10 files)
① AI Copilot RBAC gate (the big one)
- New src/lib/ai/tool-permissions.ts — maps each copilot tool to an RBAC (resource, action) pair; employees are now limited to vehicle tools, denied clients/contracts/invoices/revenue
- ai/chat/route.ts — only role-allowed tools are sent to the LLM + defensive re-check on every dispatch
- Bonus: my own test caught a prototype-chain hole (__proto__ as tool name passed the lookup) — fixed with Object.hasOwn
② Public trial form throttled — trial-requests.ts: 5 req/hour per IP (x-forwarded-for), honeypot hits don't consume budget
③ Dependencies — removed dead xlsx, better-auth 1.4.18 → 1.7.1, non-breaking audit fix. Vulnerabilities: 41 (2 critical) → 11 (0 critical). Remaining 11 are inherited/transitive (sharp/libvips CVEs) needing upstream fixes
④ Auth hardening — auth.ts: password min length 6→10, explicit rate limiting (sign-in/up: 5/min vs default 100)
⑤ Logic consistency — getVehicleAvailability now uses the same conflict engine as contract creation (draft contracts + event attributions count), so the copilot can no longer report a vehicle available when booking would be refused. Plus limit clamps (≤50) and NaN date guards on all LLM-facing executors
⑥ Cleanup — PII (tool args) no longer logged, OpenRouter client gets 30s timeout + max 1 retry
Verification
- npm run check ✅ exit 0 (tsc strict + ESLint 0 errors)
- 1153 tests PASS, 0 fail (+11 new: permission matrix ×5 roles, unknown-tool denial, IP throttle/per-IP budget/honeypot exemption)
