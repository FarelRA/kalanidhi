# Subagent Implementation Brief

This brief is mandatory for every implementation subagent. Read it in full, then read the product plan in full.

## 1. Required reading, in order

1. `docs/workspace-plan.md` — the complete product and workspace plan. Read every section, including the appendices.
2. `docs/payments-gateway.md` — payment architecture and the hardened gateway.
3. `docs/phase-0-foundation.md` — the merged foundation contracts, auth setup, capability matrix, and handoff rules.
4. `docs/test-plan.md` — the cross-phase TDD and acceptance matrix. Read the sections for your phase.
5. This brief.
6. `DESIGN.md` — Bangku Kayu visual rules.
7. `README.md` — current stack and run commands.
8. The existing code in your assigned area.

Do not skim. Do not rely on a summary. If this brief and the plan conflict, the plan wins; stop and report the conflict.

**Phase 0 is merged.** The shell renders feature pages for real sessions. Preview data is only allowed when the shell is in explicit preview mode. In a live session, never render `lib/workspace/mock-data.ts` or any local fixture as production data. If a module is not wired yet, render an explicit empty state.

---

## 2. Product invariants

1. **One workspace.** `/ruang` is the only authenticated workspace. No separate admin, teacher, or student app.
2. **One shell, one component set.** Role and entitlement change navigation, data scope, and action slots — not layout or visual language.
3. **Stored roles are additive:** `student`, `teacher`, `admin`. A teacher can also be a student.
4. **Seller is an earned, path-scoped entitlement**, never a stored role. A valid certificate or verified teacher profile unlocks selling for specific paths.
5. **Buying is universal.** Guests can buy. A buyer is a relationship to an order, not a role.
6. **Admin has full operational access** to data, logs, content, accounts, stats, and flows. Sensitive chat, recordings, and identity documents use break-glass access with a reason and an audit entry.
7. **Admin does not silently grade.** Reassign, escalate, or override with a reason and audit.
8. **Financial ledger is append-only.** Corrections are reversal entries. 70 / 15 / 15 is computed by the system.
9. **Certificate is a platform certificate** with public verification. Never government or BNSP language.
10. **Base region is Yogyakarta and Jawa Tengah**, open to practitioners elsewhere. No nationwide coverage claim.
11. **No forbidden labels** in UI copy: `dummy`, `contoh`, `prototipe`, `sample`, `uji coba`, `maestro`.
12. **No invented metrics.** Every number comes from a record. Stats are derived, not typed in.
13. **Bangku Kayu design.** Cream, teak, copper, moss, brass; Fraunces + Karla; square plates; dense tables; status shape + label; no generic SaaS cards or gradients.

---

## 3. Architecture rules

- **Convex is the business system of record.** Orders, payments, payouts, enrollments, assessments, certificates, content, audit.
- **Better Auth + Convex Better Auth.** Roles live in Convex, not in JWTs. Verify current APIs from docs; do not guess.
- **Capability-based authorization.** One capability registry used by nav, routes, components, and Convex functions. No `role === "admin"` checks in feature components.
- **Server-side scope.** Every query derives scope from the viewer. The client never sends a role or a wider scope.
- **Payment gateway is external.** Private repo `FarelRA/kalanidhi-payments`; app talks to it over a private network with `x-internal-key`. Convex owns orders and ledger; the gateway owns provider charges and sessions.
- **LiveKit for calls.** Chat and voice notes use Convex storage; calls use LiveKit tokens issued server-side.
- **No raw database editor** in the admin UI. All writes go through validated mutations.
- **No secrets in code, tests, logs, or commits.** Use `.env.example` placeholders only.

---

## 4. Engineering method

### TDD

- Write the failing test first.
- Then the smallest implementation that passes.
- Then refactor.
- Every permission, money calculation, state transition, scope boundary, idempotency path, and schema invariant needs a test.
- Use `vitest` + `convex-test` for Convex functions. Use Playwright for critical E2E flows when the harness exists.
- Test names describe behaviour, not implementation.

### DRY

- One capability registry: `lib/access/capabilities.ts` and `lib/access/policy.ts`.
- One viewer contract: `convex/access.ts` and `lib/access/viewer.ts`.
- One table component, one status stamp, one page header, one filter bar.
- Do not duplicate a role check, a money formula, or a state machine in two places.
- If a second use appears, extract only after the second use is real. Do not build speculative abstractions.

### KISS

- Small modules with one responsibility.
- Prefer explicit code over clever generic factories.
- No new runtime dependency without a written justification in the commit message.
- No `any` unless it is at a true external boundary and documented.
- No disabling lint rules to make a build pass.

### Quality gates

Every implementation phase must pass:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

If a gate cannot run because the environment lacks Convex credentials, report exactly why and still run the tests that can run.

---

## 5. Parallelization and file ownership

- Phase 0 is the foundation and must land before feature phases.
- After Phase 0, feature agents may run in parallel only when their file ownership is disjoint.
- `convex/schema.ts` is **composition only**. Domain tables live in `convex/tables/<domain>.ts`. Feature agents may extend their own table module additively. Do not rewrite another agent's table module.
- Shared files — `convex/schema.ts`, `convex/access.ts`, `lib/access/*`, `app/ruang/layout.tsx`, `components/workspace/shell/*`, `package.json` — are owned by Phase 0 or the orchestrator. Feature agents request changes; they do not edit them concurrently.
- One branch per phase: `feat/phase-0-foundation`, `feat/phase-1-admin`, etc.
- Commit locally. Do not push or merge unless the orchestrator explicitly asks.
- If you find a conflict or need a shared-file change, stop and report instead of guessing.

### Phase ownership map

| Phase | Owns | May read |
|---|---|---|
| 0 Foundation | `convex/schema.ts`, `convex/tables/*`, `convex/users.ts`, `convex/access.ts`, `convex/auth.ts`, `convex/http.ts`, `convex/auth.config.ts`, `lib/access/*`, `lib/auth/*`, `app/(auth)/*`, `app/api/auth/*`, `app/ruang/layout.tsx`, `components/workspace/shell/viewer-provider.tsx`, providers, test config | Everything |
| 1 Admin core | `convex/content.ts`, `convex/media.ts`, `convex/leads.ts`, `convex/people.ts`, `convex/stats.ts`, `convex/audit.ts`, `app/ruang/page.tsx`, `components/workspace/overview/*`, content/people/leads/stats/log pages and components | Phase 0 contracts |
| 2 Learning | `convex/learning.ts`, `convex/assessments.ts`, `convex/certificates.ts`, learning/credentials pages and components | Phase 0 contracts |
| 3 Commerce | `convex/commerce.ts`, `convex/payments.ts`, `convex/payouts.ts`, `app/api/payments/*`, commerce pages and components | Phase 0 + gateway contract |
| 4 Messaging | `convex/messaging.ts`, `convex/notifications.ts`, chat/voice-note UI | Phase 0 |
| 5 Calls | `convex/calls.ts`, `app/api/livekit/token`, call UI | Phase 0 + infra |
| 6 Governance | `convex/flows.ts`, `convex/support.ts`, `convex/governance.ts`, flows/logs/support UI | All prior |
| 7 Launch | hardening, E2E, accessibility, load, runbook | All |

---

## 6. Phase map

| Phase | Goal | Depends on |
|---|---|---|
| 0 | Schema, Better Auth, access, viewer, `/ruang` guard, test harness, admin bootstrap | None |
| 1 | Accounts, teacher verification, leads, full content CMS, stats, logs | 0 |
| 2 | Paths, cohorts, enrollments, submissions, assessments, certificates | 0 |
| 3 | Works, orders, payment gateway integration, 70/15/15 ledger, refunds | 0 + gateway |
| 4 | Chat, voice notes, presence, notifications | 0 |
| 5 | LiveKit voice/video calls, scheduling, consent, recording policy | 0 + LiveKit |
| 6 | Flows, support, moderation, exports, governance | 0–5 |
| 7 | Security, accessibility, load, backups, launch | All |

---

## 7. Phase 0 scope — foundation

Phase 0 is the only foundation agent. Do not implement feature pages beyond what is needed to prove the contracts.

### 7.1 Test harness

- Add `vitest` and `convex-test`; wire `npm test`, `npm run test:watch`, and coverage if practical.
- Add a test helper for a viewer with roles, entitlements, and scopes.
- Add a test helper for a Convex test database.
- Do not add Playwright yet unless it is already present; Phase 7 owns E2E.

### 7.2 Schema

Create the full initial schema from the plan, split by domain:

```text
convex/tables/identity.ts
convex/tables/content.ts
convex/tables/learning.ts
convex/tables/credentials.ts
convex/tables/commerce.ts
convex/tables/communication.ts
convex/tables/operations.ts
```

`convex/schema.ts` composes them.

Include indexes needed by the plan. Additive changes only after Phase 0. Do not leave tables without validators. Use `v` validators for every field.

### 7.3 Auth

- Better Auth + Convex Better Auth.
- `convex/auth.ts`, `convex/http.ts`, `convex/auth.config.ts`.
- `app/api/auth/[...all]/route.ts`.
- `lib/auth-client.ts`, `lib/auth-server.ts`.
- Email/password or OTP sign-in for students; admin and teacher invitations only.
- First admin bootstrap through an internal mutation or CLI, never public signup.
- Session revocation and device/session records.
- MFA is Phase 6 unless the auth library makes it trivial; do not block Phase 0.

### 7.4 Access and viewer

- `lib/access/capabilities.ts` — capability union.
- `lib/access/policy.ts` — role → capabilities, derived entitlements, seller scopes.
- `lib/access/viewer.ts` — shared viewer type.
- `convex/access.ts` — `getViewer`, `requireCapability`, `assertScope`, `assertNoSelfDealing`.
- `convex/users.ts` — `current`, `invite`, `setRoles`, `suspend`, `bootstrapAdmin`.
- `roleAssignments` append-only.
- Admin cannot grade, submit, or sell. Separation of duties enforced in policy and tests.
- Seller scope derives from valid certificates and teacher profile paths.

### 7.5 Workspace guard

- `app/ruang/layout.tsx` becomes a server guard.
- If session exists, load viewer and pass it to `WorkspaceShell`.
- If no session, redirect to `/masuk?next=...`.
- Preserve build without `CONVEX_URL`: the landing page must still build and run. In that case `/ruang` may render the existing preview shell behind an explicit development flag, but production must never expose mock data as real.
- `/ruang` stays `noindex`.
- The preview role switcher is development-only. Production uses the real viewer.
- Keep `components/workspace/shell` visually unchanged except for real viewer wiring.

### 7.6 Admin bootstrap

- Document how to create the first admin.
- Provide an internal mutation and a CLI command or `npx convex run` instruction.
- No default password, no seeded production admin, no public elevation path.

### 7.7 Tests

At minimum:

- schema inserts and indexes for each domain;
- role → capability mapping;
- student/teacher/admin scope;
- multi-role teacher-student;
- seller entitlement from certificate and teacher profile;
- certificate revocation removes scope;
- admin cannot grade/submit/sell;
- suspended account;
- self-dealing guard;
- viewer resolution;
- auth route guard redirects;
- build without `CONVEX_URL` still renders the landing page.

### 7.8 Definition of done

- Tests written first and passing.
- `typecheck`, `lint`, `test`, `build` pass.
- Landing page unchanged.
- `/ruang` still renders the approved shell.
- No feature phase implemented beyond foundation.
- Commit on `feat/phase-0-foundation`.
- Report: branch, commit, tests, schema tables, capability matrix, env/setup instructions, blockers.

---

## 8. Environment constraints

- Production Convex is not connected on this machine. Do not create external accounts or deployments without explicit approval.
- If `CONVEX_URL` is absent, the landing page and build must still work from the seed fallback.
- Use `convex-test` and local fixtures for function tests.
- No real GoPay credentials, OTPs, sessions, or QRIS payloads.
- The payments gateway lives in a separate private repo; do not import it into the app.
- Node version: follow the existing app. The payment gateway requires Node 24; the app currently uses the installed Node.
- Do not run destructive commands, delete unrelated files, or rewrite another agent's work.
- Do not commit `.env`, `.next`, SQLite files, session files, or secrets.

---

## 9. Reporting template

Every agent reports:

```text
Branch:
Commit:
Scope completed:
Files added/changed:
Tests added:
Commands and results:
Schema/capability changes:
Known risks:
Blocked items:
Next phase handoff notes:
```

Be honest about failures. Do not claim a live provider test, deployment, or E2E pass that did not happen.

---

## 10. Forbidden

- Separate admin/teacher/student dashboards or route prefixes.
- Storing `isSeller` as a role instead of deriving it from credentials.
- Client-side-only permission checks.
- Silent score edits, ledger edits, or audit deletion.
- Raw SQL/database editor in admin.
- Mock data presented as production data.
- New UI libraries, chart libraries, or state libraries without justification.
- Obfuscated code, telemetry, or hidden network calls.
- Government/BNSP certificate claims.
- Nationwide coverage claims.
- Invented metrics or testimonials.
