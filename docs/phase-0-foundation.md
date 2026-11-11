# Phase 0 — Foundation

This document records the contracts Phase 1–5 agents build on. The plan in
`docs/workspace-plan.md` is the source of truth; this file only explains the
Phase 0 implementation.

## What exists

- Full initial Convex schema, composed from `convex/tables/*`.
- Better Auth + Convex Better Auth wiring, email/password student sign-up, and
  invite-only teacher/admin roles.
- One capability registry and one viewer contract.
- `/ruang` server guard, real viewer wiring, and a development-only preview
  fallback when Convex is absent.
- `/masuk` sign-in and student sign-up page.
- Vitest + `convex-test` harness.

Feature pages under `/ruang/*` still contain the approved visual prototype.
Those prototypes render only in the development preview. With a real session,
the shell renders a foundation state instead of presenting local records as
production data. Feature phases replace that state with real modules.

## Environment

Copy `.env.example` to `.env.local` and fill:

```sh
CONVEX_URL=https://<deployment>.convex.cloud
NEXT_PUBLIC_CONVEX_URL=https://<deployment>.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://<deployment>.convex.site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Convex-side secrets are set on the deployment, not in `.env.local`:

```sh
npx convex env set BETTER_AUTH_SECRET=$(openssl rand -base64 32)
npx convex env set SITE_URL http://localhost:3000
```

Without Convex, `npm run build` and the landing page still work from
`lib/content/fallback.ts`. In development, `/ruang` renders the preview shell
with a visible development banner. In production, `/ruang` renders a
configuration notice and never presents preview records as real data.

`NEXT_PUBLIC_WORKSPACE_PREVIEW=1` is an explicit staged-verification escape
hatch. Do not set it in production.

## First admin

There is no public elevation path, no seeded admin, and no default password.

1. Start Convex and the app: `npx convex dev` and `npm run dev`.
2. Sign up at `/masuk` with the intended admin email. The Better Auth trigger
   creates the application account as `student`.
3. Run the internal bootstrap mutation with that email:

   ```sh
   npx convex run users:bootstrapAdmin \
     '{"email":"admin@example.com","name":"Nama Admin"}'
   ```

   It refuses if an admin already exists. It appends an `admin` role grant and
   an audit entry.
4. Sign out and sign in again so the cached viewer is refreshed.

Alternative if the application row does not exist yet: pass `authUserId` from
the Better Auth component user table.

## Teacher and admin invitations

Only admins with `people.manage` can invite. Student registration is public.

```ts
await client.mutation(api.users.invite, {
  email: "pengajar@example.com",
  roles: ["teacher"],
  reason: "Dossier pengajar terverifikasi",
})
```

The returned token is shown once. The Better Auth `user.onCreate` trigger
consumes a pending invite for the same email and grants the invited roles only
when the auth account has a verified email. If the account already exists,
`api.users.acceptInvite` applies the invite and also requires a verified email.
No request ever accepts a role from the client.

Phase 0 does not ship an email provider. Until Phase 4 configures one, verify
the identity out of band and use `api.users.setRoles` with a reason, or use the
first-admin bootstrap. Do not bypass email verification in a production path.

## Access model

Stored roles are additive: `student`, `teacher`, `admin`. Seller is never a
stored role. It is derived from issued certificates and active teacher profile
paths, then gated by an active seller profile.

Key server helpers in `convex/access.ts`:

- `getViewer` — resolves the current application user and every scope.
- `requireCapability(viewer, capability)` — authentication, suspension, and
  capability check.
- `assertScope(viewer, "teach" | "assess" | "sell", pathId)` — path boundary.
- `assertNoSelfDealing(viewer, action, counterpartyUserId)` — grading own work,
  buying from self, or approving own money.

`convex/users.ts` owns `current`, `invite`, `acceptInvite`, `setRoles`,
`suspend`, and `bootstrapAdmin`. Role grants and revocations are append-only
`roleAssignments`; role changes and suspensions also write `auditLogs`.

## Capability matrix

| Capability | Student | Teacher | Admin |
|---|---|---|---|
| `learn` | role student or active enrollment | only if also enrolled | — |
| `teach` | — | active teacher profile | — |
| `assess` / `submissions.grade` | — | active cohort path | — |
| `sell` / `orders.sell` | issued certificate + active seller profile | active profile path + active seller profile | — |
| `buy` / `orders.buy` | ✓ | ✓ | ✓ |
| `submissions.submit` | ✓ | only as student | — |
| `certificates.read.own` | ✓ | only as student | — |
| `certificates.read.cohort` | — | ✓ | — |
| `certificates.manage` / `certificates.revoke` | — | — | ✓ |
| `orders.read.own` | ✓ | ✓ | ✓ |
| `orders.read.all` | — | — | ✓ |
| `payments.manage` / `payouts.release` | — | — | ✓ |
| `payouts.view.own` | seller only | seller only | — |
| `messages.read.own` | ✓ | ✓ | ✓ |
| `messages.moderate` | — | — | ✓ break-glass |
| `calls.start` | ✓ | ✓ | — |
| `calls.monitor` | — | — | ✓ |
| `leads.read` / `leads.write` | — | — | ✓ |
| `people.read` / `people.manage` | — | — | ✓ |
| `content.publish` | — | — | ✓ |
| `stats.read` | — | — | ✓ |
| `stats.teach` | — | ✓ | — |
| `flows.manage` / `logs.read` | — | — | ✓ |
| `support.request` | ✓ | ✓ | ✓ |
| `support.manage` | — | — | ✓ |
| `governance.manage` / `settings.platform` | — | — | ✓ |

Admin never inherits `learn`, `teach`, `assess`, `submissions.submit`,
`submissions.grade`, `sell`, or `orders.sell`, even when another role is also
attached. This is separation of duties, tested in `tests/access-policy.test.ts`
and `tests/convex-access.test.ts`.

## Schema modules

| File | Tables |
|---|---|
| `convex/tables/identity.ts` | `users`, `roleAssignments`, `invites`, `sessions`, `consents`, `payoutAccounts`, `sellerProfiles` |
| `convex/tables/content.ts` | `siteContent`, `contentRevisions`, `mediaAssets`, `catalogFields`, `paths`, `pathModules`, `lessons`, `teachers`, `works`, `testimonials`, `faqs`, `redirects`, `seoOverrides` |
| `convex/tables/learning.ts` | `cohorts`, `cohortSessions`, `enrollments`, `lessonProgress`, `submissions`, `submissionAssets`, `assessments`, `assessmentEvents`, `disputes` |
| `convex/tables/credentials.ts` | `certificates`, `certificateEvents`, `workCards` |
| `convex/tables/commerce.ts` | `orders`, `orderItems`, `payments`, `paymentEvents`, `payouts`, `refunds`, `ledgerEntries` |
| `convex/tables/communication.ts` | `conversations`, `conversationMembers`, `messages`, `messageAssets`, `messageReceipts`, `messageFlags`, `blocks`, `callSessions`, `callParticipants`, `callEvents`, `callRecordings` |
| `convex/tables/operations.ts` | `leads`, `leadNotes`, `leadAssignments`, `supportTickets`, `supportMessages`, `auditLogs`, `authLogs`, `webhookDeliveries`, `notificationOutbox`, `featureFlags`, `settings`, `integrationHealth`, `dailyMetrics`, `metricDefinitions`, `flowDefinitions`, `flowTransitions`, `slaPolicies`, `automationRules`, `notificationTemplates`, `apiKeys`, `webhookEndpoints`, `privacyRequests`, `impersonationSessions`, `contentLocks` |

`sellerProfiles` is a Phase 0 addition: the plan's seller entitlement refers to
`sellerProfile.status`, but its table list did not name the table.

`siteContent.value`, revision snapshots, provider payloads, audit before/after,
settings, and notification payloads are documented JSON bags. Every other field
has a typed `v` validator.

## Session revocation

Application `sessions` is a projection used for device management and
revocation. `users.suspend` marks the projection revoked. Better Auth owns the
authoritative session rows inside its component; Phase 1 or 6 should wire an
admin action to the component's session revocation API, or revoke through the
Better Auth server, before exposing device management to admins.

## Tests

```sh
npm test
npm run test:watch
npm run test:coverage
```

Coverage includes schema inserts and indexes for every domain, viewer
resolution, role matrix, multi-role accounts, certificate revocation,
suspension, self-dealing, admin separation of duties, route guards, open
redirect protection, and the landing fallback without Convex.

## Handoff rules

- `convex/schema.ts` is composition only. Extend your own table module.
- Shared files owned by Phase 0: `lib/access/*`, `convex/access.ts`,
  `convex/users.ts`, `convex/auth.ts`, `convex/http.ts`,
  `convex/auth.config.ts`, `app/ruang/layout.tsx`,
  `components/workspace/shell/*`, `package.json`. Request changes instead of
  editing concurrently.
- Any feature query must derive its viewer through `convex/access.ts` and
  check capabilities server-side. Client checks are cosmetic only.
- Do not store `isSeller` or a seller role. Derive scope from certificates and
  teacher profile paths.
- Ledger and audit tables are append-only. Corrections are reversal entries.
