# KalaNidhi Test Plan — TDD and Acceptance Matrix

**Status:** v1.0, source of truth for tests
**Owner:** cross-phase test agent; executed by every phase agent
**Companions:** `docs/workspace-plan.md`, `docs/payments-gateway.md`, `docs/subagent-brief.md`, `DESIGN.md`, `README.md`
**Scope:** the app repository. The payments gateway has its own suite; this plan covers the app side of the contract and the fake used in app tests.

> If this plan and `docs/workspace-plan.md` disagree, the workspace plan wins. Stop and report the conflict. This plan may add test detail; it may not weaken an invariant.

---

## 0. How to use this plan

1. Read the workspace-plan section that owns the behaviour before writing a test.
2. Find the matrix row for that behaviour in this document.
3. Write the failing test first, with the row ID at the start of the test title.
4. Implement the smallest change that passes.
5. Refactor without changing the test's observable contract.
6. Report the IDs covered in the phase handoff (section 16).

### 0.1 Test ID convention

```text
P<phase>-<AREA>-<NN>        e.g. P3-PAY-50
```

| Phase | Area codes |
|---|---|
| 0 | `ACC` access, `AUTH` auth/session, `SCH` schema, `SHL` shell/guard, `FIX` fixtures |
| 1 | `ACC` accounts, `TCH` teacher verification, `LEAD` CRM, `CMS` content, `MED` media, `STAT` stats, `LOG` logs, `EXP` exports |
| 2 | `LRN` paths/cohorts/enrollment, `SUB` submissions, `ASM` assessments, `CRT` certificates |
| 3 | `WRK` works, `ORD` orders, `PAY` payments/money, `PYT` payouts, `RFD` refunds/disputes |
| 4 | `MSG` chat/voice notes, `NOT` notifications |
| 5 | `CALL` calls |
| 6 | `FLOW` flows, `SUP` support, `GOV` governance, `EXP` exports, `SEC` security |
| 7 | `E2E` journeys, `A11Y` accessibility, `LOAD` load, `SEC` adversarial security, `OPS` launch/restore |

Rules:

- IDs are stable. Never renumber. A removed requirement keeps its ID and is marked withdrawn.
- New tests take the next free number in their area and are listed in the handoff.
- A test title starts with the ID: `[P3-PAY-50] late payment after expiry enters reconciliation, not settlement`.
- One ID maps to one primary assertion. Parameterised cases may share an ID with a case label.

### 0.2 Product invariants under test

| Invariant | Enforced primarily by |
|---|---|
| One workspace, one shell, no role route prefixes | P0-SHL, P7-E2E |
| Roles additive; seller is earned and path-scoped | P0-ACC, P2-CRT, P3-WRK |
| Buying is universal; guest checkout works | P3-ORD, P7-E2E |
| Admin has operational access; sensitive data is break-glass | P0-ACC, P6-GOV |
| Admin does not silently grade, submit, or sell | P0-ACC, P2-ASM |
| Ledger append-only; 70/15/15 computed | P3-PAY, P3-PYT |
| Platform certificate with public verification | P2-CRT, P1-CMS |
| Base region Yogyakarta and Jawa Tengah | P1-CMS |
| No forbidden labels in UI copy | P1-CMS-11 |
| No invented metrics | P1-STAT |
| Bangku Kayu design and WCAG 2.1 AA | P7-A11Y |

### 0.3 Test data rules

- No live provider, LiveKit, email, WhatsApp, or SMS call in any test.
- No real personal data, phone numbers, addresses, account numbers, keys, or tokens.
- Test emails use the reserved `.test` TLD. Test phone numbers use the `+62 800` range.
- No production data copied into fixtures, snapshots, or E2E recordings.
- The forbidden-label list is defined once in `docs/subagent-brief.md` §2.11. Mirror it in one test constant; never spell it into fixture copy, UI assertions, or commit messages.
- Money is stored and asserted as integer rupiah. No floating point in assertions.
- Dates are explicit. No assertion depends on the machine clock or on `_creationTime` equality.

---

## 1. Test pyramid, commands, and CI gates

### 1.1 Layers

| Layer | Tool | Location | What it proves | Owner | Gate |
|---|---|---|---|---|---|
| Unit | Vitest | `tests/unit/**/*.test.ts` | money formulas, amount allocation, policy mapping, validation, transition tables, redaction | each phase | every PR |
| Integration | Vitest + `convex-test` | `tests/convex/**/*.test.ts` | Convex queries/mutations, scope, indexes, transactions, webhook idempotency, publish/rollback | each phase | every PR |
| Component | Vitest + Testing Library + jsdom | `tests/component/**/*.test.tsx` | capability-gated rendering, forms, dialogs, drawers, tables, status stamps | Phase 0 config; each phase tests | every PR from Phase 1 |
| E2E | Playwright | `tests/e2e/**/*.spec.ts` | role journeys across pages, real browser, test deployment | Phase 7 | main, nightly, release |
| Accessibility | `@axe-core/playwright` + manual pass | `tests/e2e/a11y/**` | WCAG 2.1 AA, keyboard, focus, reflow | Phase 7 | main, release |
| Load | k6 | `tests/load/**` | chat, call signalling, payment reconciliation, table paging | Phase 7 | nightly, release |
| Security | Vitest + Playwright | `tests/security/**`, `tests/e2e/security/**` | IDOR, rate limits, upload abuse, webhook HMAC/replay/SSRF, secret leakage | Phase 0 primitives; Phase 6/7 suite | nightly, release |

Component tests target client islands only. Server Components are covered by integration and E2E; do not mount the whole landing tree in jsdom.

### 1.2 Commands

Current commands already exist. The rest are added by the phase that owns the harness; a command that does not exist yet is a Phase 0 or Phase 7 deliverable, not an optional extra.

| Command | Status | Runs | Required for |
|---|---|---|---|
| `npm run lint` | exists | ESLint | every phase |
| `npm run typecheck` | exists | `tsc --noEmit` | every phase |
| `npm run build` | exists | Next production build | every phase |
| `npm test` | Phase 0 | unit + Convex integration + component | every phase |
| `npm run test:watch` | Phase 0 | Vitest watch | local TDD |
| `npm run test:unit` | Phase 0 | `tests/unit` | fast loop |
| `npm run test:convex` | Phase 0 | `tests/convex` with `convex-test` | server behaviour |
| `npm run test:component` | Phase 0 | `tests/component` | UI gating |
| `npm run test:coverage` | Phase 0 | coverage report + thresholds | PR gate |
| `npm run test:e2e` | Phase 7 | full Playwright suite | release |
| `npm run test:e2e:smoke` | Phase 7 | buyer, student, admin journeys | main |
| `npm run test:a11y` | Phase 7 | axe + keyboard specs | main, release |
| `npm run test:security` | Phase 7 | security-tagged Vitest + Playwright | nightly, release |
| `npm run test:load` | Phase 7 | k6 scenarios | nightly, release |

Harness constraints:

- CI uses Node 24 and `npm ci`, matching the current image workflow and the gateway runtime.
- `npm test` must run without `CONVEX_URL`, `CONVEX_DEPLOYMENT`, or any provider credential.
- `convex-test` creates an isolated database per test file. No shared dev deployment.
- Playwright runs against a dedicated test deployment whose name contains `e2e`; the seed helper fails closed on any other deployment.
- Every test command is non-interactive in CI and writes a machine-readable report (JUnit or JSON).

### 1.3 CI gates

| Workflow | Trigger | Steps | Blocks |
|---|---|---|---|
| `ci.yml` | pull request | `npm ci` → lint → typecheck → `test:unit` → `test:convex` → `test:component` → `build` | merge |
| `ci.yml` build matrix | pull request | build with `NEXT_PUBLIC_CONVEX_URL` unset | merge |
| `e2e.yml` | push to main, nightly | build → smoke E2E → axe on core routes | release |
| `security.yml` | nightly | `npm audit --omit=dev`, secret scan, `test:security` | release |
| `load.yml` | nightly | payment reconciliation + chat + call signalling scenarios | release |
| `docker-release.yml` | release tag | all PR gates → image build → deploy | production |
| Gateway contract job | app PR touching `convex/payments.ts`, `payouts.ts`, `app/api/payments/*` | app contract tests against pinned gateway fake | merge |

`docker-release.yml` currently runs only lint and typecheck. Phase 0 must add `npm test` and the no-URL build before the image step; Phase 7 must add E2E smoke and axe before release.

### 1.4 Coverage and quality thresholds

Proposed, fixed by Phase 0 in the Vitest config:

| Scope | Lines | Branches | Notes |
|---|---|---|---|
| Global | ≥ 80% | ≥ 75% | excludes generated code and shadcn primitives |
| `lib/access/*` | ≥ 95% | 100% | every capability and scope branch |
| money and allocation modules | ≥ 95% | 100% | every boundary and rejection path |
| state transition tables | ≥ 95% | 100% | every legal and illegal edge |

Coverage never replaces an assertion. A file can be 100% covered by executing it without testing its contract; that is a failing review.

### 1.5 Flake policy

- No `sleep` for synchronisation. Wait on observable state.
- No arbitrary retries locally. CI E2E may retry once and must report the retry.
- A flaky required test is quarantined with an owner, a ticket, and an expiry date. It still counts as not passing.
- No `.only` may be committed. CI fails the build if it finds one.
- No test may depend on execution order, shared database rows, or another spec's output.

---

## 2. Fixtures and seeds

### 2.1 Principles

- Build data through explicit helpers, not JSON blobs copied between tests.
- One canonical fixture pack per domain, extended additively.
- Every fixture value is deterministic and readable in a failure report.
- Fixtures are data and pure helpers. They must not export Convex mutations or queries.
- The content seed (`convex/seed.ts`, `convex/seedData.ts`) is production content, not test data. Tests must never call it against a shared deployment.

### 2.2 Fixture layout

```text
convex/test/
  fixtures.ts          reset + seed entry points
  identity.ts          users, roles, sessions, consents, payout accounts
  content.ts           site content, revisions, media, entities
  learning.ts          paths, cohorts, enrollments, submissions, assessments
  credentials.ts       certificates, work cards
  commerce.ts          works, orders, payments, payouts, refunds, ledger
  communication.ts     conversations, messages, calls, recordings
  operations.ts        leads, tickets, logs, flags, flows, metrics
tests/
  unit/
  convex/
  component/
  e2e/
  security/
  load/
```

`convex/test/*` is imported only by tests. It must not be imported by `app/`, `components/`, `lib/`, or runtime `convex/*.ts` files. Phase 0 adds a CI check for that boundary.

### 2.3 Canonical fixture identities

| Handle | Roles / state | Purpose |
|---|---|---|
| `guest` | no session, no account | guest checkout, public pages |
| `studentFresh` | `student`, no enrollment | registration, empty states |
| `studentActive` | `student`, one active enrollment, one submission due | core learning |
| `studentSeller` | `student`, valid certificate for path A, active seller profile, verified payout account | seller journey |
| `studentSellerRevoked` | as above, certificate revoked | scope removal |
| `teacherActive` | `teacher`, active profile for paths A and B | teaching and selling |
| `teacherApplicant` | application submitted, not verified | verification workflow |
| `teacherSuspended` | teacher, profile suspended | scope and cohort freeze |
| `teacherStudent` | `teacher` + `student`, enrolled in path B | additive roles |
| `teacherOther` | `teacher`, different path and cohort | cross-teacher isolation |
| `adminOps` | `admin`, MFA enrolled | operations |
| `adminReviewer` | `admin`, second reviewer | high-impact override |
| `adminSupport` | `admin` assigned to the support queue; not a stored role | support journey |
| `suspendedUser` | any role, suspended | mutation and session block |
| `minorStudent` | student under 18 with guardian consent | minors policy |
| `minorNoConsent` | student under 18 without guardian consent | call block |
| `buyerRegistered` | account with a claimed order | purchase history |
| `buyerGuest` | guest with an order token | guest status page |
| `institutionLead` | no account, institution inquiry | CRM |

`adminSupport` is an admin with a support assignment. Do not add a fourth stored role; the plan allows only `student`, `teacher`, `admin`.

### 2.4 Fixture packs by phase

| Pack | Needed by | Contents |
|---|---|---|
| Base identity | 0 | users, append-only role assignments, sessions, consents, payout accounts, suspended and minor variants |
| Content | 1 | one published `siteContent`, one draft revision, media with alt/credit/permission, catalog fields, paths, modules, lessons, teachers, works, testimonials, FAQs, redirects, SEO overrides, content lock |
| Learning | 2 | cohort with capacity, roster, lesson progress, submissions in every state, assessment with weighted rubric, dispute, certificates in issued/revoked/replaced states |
| Commerce | 3 | work cards across moderation states, guest and registered orders, payments in every status, unique amounts, ledger rows, payouts in every state, refunds, disputes |
| Communication | 4 | direct/cohort/support/system conversations, members, read receipts, text and voice messages, assets, flags, blocks, notification outbox |
| Calls | 5 | scheduled/ringing/active/ended/missed calls, participants, consent records, recording metadata, guardian consent and its absence |
| Operations | 6 | leads and notes, support tickets, audit/auth/payment/notification/call/moderation/content/API/error logs, webhook deliveries, flags, settings, metric definitions, flow definitions and transitions, SLA policies, automation rules, templates, API keys, privacy requests, impersonation session |

A phase may add fields to its pack. It may not rewrite another phase's pack. Shared identities are extended only by the Phase 0 owner.

### 2.5 Helper contract

Phase 0 owns the signatures; these are the required behaviours.

```ts
seedBase(t)                       // identities, roles, sessions
seedContent(t)                    // published + draft content, media, entities
seedLearning(t)                   // cohorts, enrollments, submissions, certificates
seedCommerce(t)                   // works, orders, payments, ledger, payouts
seedCommunication(t)              // conversations, messages, calls
seedOperations(t)                 // leads, tickets, logs, flags, flows
viewerFor(handle, overrides?)     // viewer with roles, entitlements, scopes
as(t, handle)                     // authenticated convex-test context
freezeNow(t, "2026-11-12T09:00:00+07:00")
```

Required properties:

- `seedBase` is idempotent inside one test database and returns handles, not raw IDs.
- `viewerFor` derives entitlements from stored data. It must not accept a hand-written capability list that production could not produce.
- `as` uses the same identity resolution path as production, not a test-only bypass.
- `freezeNow` sets the clock for the test and for the fixture timestamps. Business functions accept an injected `now` where the runtime allows it.

### 2.6 Determinism rules

| Concern | Rule |
|---|---|
| Clock | Fixed `NOW = 2026-11-12T02:00:00.000Z` (09:00 WIB). Every relative timestamp is derived from it. |
| Timezone | Product timezone is `Asia/Jakarta`. Test the conversion at least once per date-bearing feature. |
| IDs | Slugs, serials, and public codes are explicit fixtures. Token generators may use real crypto; assert shape and entropy, never a literal random value. |
| Currency | Integer rupiah only. No `0.1 + 0.2` style assertions. |
| Names | Javanese and Indonesian fixture names consistent with the product region. No real people. |
| Contact | `*.test` emails and `+62 800` phone numbers only. |
| Files | Tiny generated PNG/WebM fixtures. No copyrighted media. |
| Network | No outbound calls. Provider adapters are injected fakes. |
| Convex metadata | Do not assert exact `_creationTime`; assert domain timestamps written by the mutation. |

### 2.7 Seed safety and production-data separation

- Test fixtures live under `convex/test/` and `tests/`. Production seed data lives in `convex/seedData.ts`. The two never import each other.
- `seedBase` refuses to run when `NODE_ENV === "production"`.
- E2E seeding refuses unless the deployment name contains `e2e` and `E2E_SEED_ALLOWED === "1"`.
- No test-only mutation is reachable from the public API. If an E2E reset needs a mutation, it is an internal mutation plus a deployment guard, never a public one.
- `/ruang` has no preview mode, persona switcher, or local mock fixtures. A regression test asserts every workspace screen renders Convex data and that `/ruang` redirects to `/masuk` without a session.
- Fallback landing content is a legitimate runtime fallback, not test data. No fixture string may appear in `lib/content/fallback.ts` or `convex/seedData.ts`.
- CI runs a boundary check: no import of `convex/test/*` or `tests/*` from runtime code.

### 2.8 Schema and fixture contract tests

| ID | Test |
|---|---|
| P0-SCH-01 | Every table in workspace-plan §10 exists with a validator on every field and the indexes needed by its list, search, and detail queries. |
| P0-SCH-02 | `convex/schema.ts` composes domain modules only; no domain table is defined twice. |
| P0-SCH-03 | Fixture inserts for every domain validate; an unknown field or wrong enum fails. |
| P0-SCH-04 | Indexes cover user, role, status, date, path, cohort, teacher, order, payment, certificate, and conversation lookups. |
| P0-SCH-05 | Additive migrations keep existing rows valid; no destructive field rewrite without a migration test. |
| P0-FIX-01 | Two runs of the same fixture pack produce the same domain values and timestamps. |
| P0-FIX-02 | Fixture helpers are not imported by runtime code; the CI boundary check fails on a new import. |
| P0-FIX-03 | Test fixtures never call the production content seed or the public API. |
| P0-FIX-04 | The base pack supports every role state in section 2.3; a missing identity fails fast. |
| P0-FIX-05 | E2E seeding refuses a deployment whose name does not contain `e2e`. |

---

## 3. Permission matrix tests

### 3.1 Capability and scope matrix

Every row is a Convex integration test unless marked static. The actor is always resolved server-side; the test never passes a role or scope argument.

Phase 0 access rows may seed future-domain records and exercise the access layer directly, before the feature mutation exists. They must not depend on a feature API that has not landed; the owning phase re-runs the same row against its real function and reports the result.

| ID | Actor | Attempt | Expected |
|---|---|---|---|
| P0-ACC-01 | `studentActive` | read own enrollment and progress | allowed, own rows only |
| P0-ACC-02 | `studentActive` | read another student's enrollment by ID | not found, no existence leak |
| P0-ACC-03 | `studentActive` | list a cohort roster | forbidden |
| P0-ACC-04 | `teacherActive` | list own cohort roster | allowed |
| P0-ACC-05 | `teacherActive` | list `teacherOther`'s cohort | forbidden |
| P0-ACC-06 | `teacherActive` | grade a submission in own cohort | allowed |
| P0-ACC-07 | `teacherActive` | grade a submission in another cohort | forbidden |
| P0-ACC-08 | `teacherActive` | grade own enrollment or own work | forbidden by self-dealing guard |
| P0-ACC-09 | `adminOps` | read all enrollments and submissions | allowed |
| P0-ACC-10 | `adminOps` | grade a submission | forbidden: admin lacks `submissions.grade` |
| P0-ACC-11 | `adminOps` | submit an assignment | forbidden |
| P0-ACC-12 | `adminOps` | create a seller listing | forbidden: admin cannot sell |
| P0-ACC-13 | `teacherStudent` | reach learn, teach, assess, sell surfaces | union of entitlements, one nav |
| P0-ACC-14 | `studentSeller` | list a work for certified path A | allowed |
| P0-ACC-15 | `studentSeller` | list a work for uncertified path B | forbidden |
| P0-ACC-16 | `teacherActive` | sell within assigned teacher profile paths | allowed |
| P0-ACC-17 | `studentSellerRevoked` | list or keep selling path A after revocation | forbidden; existing listing paused, not silently sold |
| P0-ACC-18 | `suspendedUser` | any mutation, message, call, or new session | forbidden; existing sessions revoked |
| P0-ACC-19 | `guest` | complete checkout and view order by token | allowed |
| P0-ACC-20 | `guest` | open `/ruang` or call a workspace query | redirect to `/masuk`; query forbidden |
| P0-ACC-21 | `adminOps` | read chat content with a valid break-glass grant and reason | allowed, audited |
| P0-ACC-22 | `adminOps` | read chat content without a grant | forbidden, attempt audited |
| P0-ACC-23 | `adminSupport` | join a support conversation with user consent | allowed |
| P0-ACC-24 | `adminSupport` | join without consent or request | forbidden |
| P0-ACC-25 | `buyerRegistered` | buy a work they sell | forbidden: self-dealing |
| P0-ACC-26 | `adminOps` | approve a refund on their own order | forbidden |
| P0-ACC-27 | `adminOps` | impersonate a user | read-only; every mutation blocked; banner and audit |
| P0-ACC-28 | any authenticated | open a route without its capability | 403 or redirect to `/ruang`, never a blank shell |
| P0-ACC-29 | static | capability registry completeness | every capability has a policy entry and every nav item maps to one |
| P0-ACC-30 | static | feature components | no `role === "admin"` or equivalent role string check |
| P0-ACC-31 | static | role assignment records | append-only; no update or delete export |
| P0-ACC-32 | `teacherApplicant` | reach teaching, grading, or selling surfaces | forbidden until verified and active |

### 3.2 IDOR matrix

For every domain, request a real record ID that belongs to another actor. Expected: not found for scoped reads, forbidden for capability actions, never a partial record.

| ID | Object | Attacker | Expected |
|---|---|---|---|
| P0-ACC-40 | enrollment | other student | not found |
| P0-ACC-41 | submission and assets | other student | not found |
| P0-ACC-42 | assessment and rubric | other student | not found |
| P0-ACC-43 | certificate | unrelated account | not found; public code path returns only public fields |
| P0-ACC-44 | conversation and messages | non-member | not found |
| P0-ACC-45 | message asset URL | non-member | signed URL denied or expired |
| P0-ACC-46 | order | unrelated account | not found |
| P0-ACC-47 | order token | guessed or mutated token | not found, rate limited |
| P0-ACC-48 | work card draft | unrelated seller | not found |
| P0-ACC-49 | payout and ledger | unrelated teacher | not found |
| P0-ACC-50 | support ticket | unrelated user | not found |
| P0-ACC-51 | media asset | non-admin | not found |
| P0-ACC-52 | impersonation session | other admin | not found and blocked |

Rules:

- Scoped objects return not found, not forbidden, to avoid confirming existence.
- Capability failures on a route or collection return forbidden and are audited when sensitive.
- A query that accepts a client-supplied owner, role, scope, or viewer argument fails argument validation. That argument must not exist.

### 3.3 Break-glass tests

| ID | Behaviour |
|---|---|
| P0-ACC-60 | Grant requires capability, entity scope, reason, actor, and expiry. |
| P0-ACC-61 | Reason below the minimum length is rejected. |
| P0-ACC-62 | Grant cannot be reused after expiry or for another entity. |
| P0-ACC-63 | Every allowed access writes actor, entity, reason, timestamp, and grant ID. |
| P0-ACC-64 | Every denied attempt is logged without exposing content. |
| P0-ACC-65 | Break-glass never grants write access, export, or recording download. |
| P0-ACC-66 | Admin cannot use break-glass to approve their own financial record. |

### 3.4 Shell and route guard

| ID | Test |
|---|---|
| P0-SHL-01 | No session on `/ruang` redirects to `/masuk?next=/ruang`. |
| P0-SHL-02 | An authenticated viewer loads the one shell; the role tag is a derived label, not a theme. |
| P0-SHL-03 | Navigation is generated from capabilities; no `/admin`, `/pengajar`, or `/siswa` prefix exists. |
| P0-SHL-04 | No preview mode or mock fixtures exist in `/ruang`; every screen renders Convex data. |
| P0-SHL-05 | A build without `CONVEX_URL` renders the landing page and keeps `/ruang` guarded. |
| P0-SHL-06 | `/ruang` and every workspace route remain noindex. |

### 3.5 Static invariants

- One capability registry: `lib/access/capabilities.ts` and `lib/access/policy.ts`.
- One viewer contract: `convex/access.ts` and `lib/access/viewer.ts`.
- Navigation is derived from the capability table in workspace-plan §3.
- Components use `viewer.can(...)`; no local role arrays.
- Every Convex query and mutation calls the same require/scope helpers. A grep test lists files that reference `ctx.db` without an access import and fails on new exceptions.

---

## 4. Money tests

### 4.0 Ownership split with the gateway

The gateway owns provider charges, unique-amount allocation, quarantine, the provider session, and provider-side refunds. The app owns orders, the business payment view, settlement verification, the ledger, payouts, refunds, and disputes.

| Behaviour | Primary suite | App-side test |
|---|---|---|
| 70/15/15 split, ledger, payout, refund reversal, net revenue | app | unit + Convex integration |
| Webhook signature, replay, settlement mutation, idempotency | app | unit + Convex integration |
| Unique amount allocation, final-amount uniqueness, pool exhaustion, quarantine across restart | gateway | contract fake: app sends the order and handles 201/200/409 and the returned final amount |
| Charge storage, cancel, provider status, session vault | gateway | contract fake only |
| Provider protocol, QRIS payload, provider refunds | gateway | never exercised in the app suite |

Rows below that describe gateway-owned allocation are contract expectations: the app test uses the pinned fake and asserts the app's request, display, and error handling. Do not reimplement gateway internals in this repository, and do not duplicate the gateway or `merchantid` fork suites here.

### 4.1 Canonical rules

- All amounts are integer rupiah.
- The split is computed on `baseAmount`, never on the provider's `uniqueAmount`.
- 70% teacher, 15% platform, 15% community fund.
- Gateway fees are absorbed by the platform share. Teacher and community shares do not change.
- Ledger rows are append-only. Corrections are reversal entries.
- The unique offset is reconciliation cover, not revenue.
- Currency normalization happens once at the provider boundary.

### 4.2 Split rule (proposed, needs sign-off)

The plan does not state a rounding rule for amounts that do not divide evenly. Until product signs off, use:

```text
teacher  = floor(baseAmount * 70 / 100)
platform = floor(baseAmount * 15 / 100)
community = baseAmount - teacher - platform
```

Properties: the three shares sum exactly to `baseAmount`; rounding residue goes to the community fund; no share is more than one rupiah below its exact value. This rule lives in one function and is used by payouts, statements, split previews, and stats.

### 4.3 Split, fees, and revenue

| ID | Test |
|---|---|
| P3-PAY-01 | 1,450,000 splits into 1,015,000 / 217,500 / 217,500. |
| P3-PAY-02 | 1,000,001 splits with an exact sum and the documented residue rule. |
| P3-PAY-03 | 1, 999, and 1,000,000,000 are handled without float drift. |
| P3-PAY-04 | Zero, negative, fractional, NaN, and string amounts are rejected. |
| P3-PAY-05 | The split ignores the unique offset and uses `baseAmount`. |
| P3-PAY-06 | A gateway fee reduces only the platform share. |
| P3-PAY-07 | A fee larger than the platform share produces a negative platform net, never a negative teacher share. |
| P3-PAY-08 | Net revenue equals GMV minus refunds minus gateway fees. |
| P3-PAY-09 | GMV is paid gross before refunds. |
| P3-PAY-10 | Per-order ledger shares sum to the order `baseAmount`. |
| P3-PAY-11 | No admin API accepts a share amount, percentage, or ledger edit. |
| P3-PAY-12 | Changing the split in the future does not rewrite historical rows. |

### 4.4 Unique amounts and charges

| ID | Test |
|---|---|
| P3-PAY-20 | Offset is an integer in 1–999. |
| P3-PAY-21 | Uniqueness is enforced on the final amount, not the offset. |
| P3-PAY-22 | Two orders with the same base receive different final amounts. |
| P3-PAY-23 | 200 concurrent allocations for one base produce 200 distinct finals. |
| P3-PAY-24 | Pool exhaustion returns a retryable conflict. |
| P3-PAY-25 | Charge creation is idempotent by order ID: repeat returns the same charge. |
| P3-PAY-26 | Same order with a different amount returns a conflict. |
| P3-PAY-27 | Checkout displays the final amount as the total and discloses the offset. |
| P3-PAY-28 | Cancel is allowed only while pending. |
| P3-PAY-29 | Expired and cancelled amounts enter quarantine, not immediate reuse. |
| P3-PAY-30 | Quarantine lasts at least twice the clock-skew window and survives a restart. |

### 4.5 Settlement and webhooks

| ID | Test |
|---|---|
| P3-PAY-40 | Settlement requires the exact final amount. |
| P3-PAY-41 | Provider sen and rupiah scales are normalized once; a double-scaled amount is rejected. |
| P3-PAY-42 | Refund, partial refund, void, failed, and unknown statuses never settle. |
| P3-PAY-43 | A transaction ID that already settled another payment is rejected. |
| P3-PAY-44 | Only a pending payment can settle. |
| P3-PAY-45 | Payment at `createdAt - skew` is accepted; 1 ms earlier is rejected. |
| P3-PAY-46 | Payment at `expiresAt + skew` is accepted; 1 ms later is rejected. |
| P3-PAY-47 | Duplicate `eventId` is idempotent and writes no second ledger row. |
| P3-PAY-48 | Same `eventId` with a different payload is rejected and logged. |
| P3-PAY-49 | Two different events for one charge settle at most once. |
| P3-PAY-50 | Late payment after expiry enters the reconciliation queue; it is never auto-settled. |
| P3-PAY-51 | Manual match requires a reason, actor, and audit entry. |
| P3-PAY-52 | A client-reported payment status is ignored; only the verified webhook settles. |
| P3-PAY-53 | Settlement is atomic: payment, order, ledger, and payout rows commit together or not at all. |
| P3-PAY-54 | A malformed or unknown event is rejected without a partial write. |
| P3-PAY-55 | Reconciliation is scheduler-driven; buyer status polling never calls the provider. |

### 4.6 Refunds, reversals, and payouts

| ID | Test |
|---|---|
| P3-PAY-60 | Full refund creates reversal entries; it never edits the original ledger row. |
| P3-PAY-61 | Partial refund reverses the same proportions and preserves the 70/15/15 promise. |
| P3-PAY-62 | Refund after payout creates a negative balance carried to the next payout. |
| P3-PAY-63 | A paid ledger row cannot be updated or deleted by any exported mutation. |
| P3-PAY-64 | Payout states follow pending → held → approved → paid, or reversed. |
| P3-PAY-65 | Hold and reverse require a reason. |
| P3-PAY-66 | Release requires approval and `payouts.release`. |
| P3-PAY-67 | Reversing a paid payout creates a compensating entry, not an edit. |
| P3-PAY-68 | Payout statements and CSV exports reconcile to ledger rows. |
| P3-PAY-69 | Payout account changes require re-verification before the next release. |
| P3-PAY-70 | Gateway success rate is paid charges ÷ created charges, from records. |

### 4.7 Clock and configuration

| ID | Test |
|---|---|
| P3-PAY-80 | All expiry logic uses one injected clock and one skew setting. |
| P3-PAY-81 | Timezone changes do not shift payment expiry. |
| P3-PAY-82 | A host clock beyond the configured skew fails closed for settlement. |
| P3-PAY-83 | Expiry releases amounts only after the quarantine deadline. |

---

## 5. State-machine tests

### 5.1 Generic harness

One table-driven harness reads each domain's transition definition. Tests assert:

- Legal transitions succeed and write actor, timestamp, reason, and previous state.
- Illegal transitions fail with a stable `INVALID_TRANSITION` error and write no state.
- Terminal states accept no transition except the documented replacement path.
- A repeated same-target action is a no-op only where declared idempotent; otherwise it is rejected.
- Two concurrent actors cannot both win the same transition.
- Destructive or override transitions require a reason.
- Every transition writes one audit entry; no duplicate on retry.
- Public mutations never accept a raw `status` field.
- Admin overrides use the same transition with reason and audit, not a direct write.

### 5.2 Entity matrix

| Entity | Legal path | Must reject | Guards and side effects |
|---|---|---|---|
| Lead | `new → contacted → qualified → converted / lost / spam` | `new → converted`, anything out of `converted` | assign, contact, convert; conversion requires qualified; export logged |
| Teacher application | `draft → submitted → under_review → verified / rejected / suspended` | `draft → verified`, `rejected → verified` without resubmission | approve publishes profile; suspend unpublishes and freezes new cohorts; issued certificates stay valid |
| Enrollment | `pending_payment → active → completed / withdrawn` | `pending_payment → completed`, `withdrawn → active` | activation requires settled payment; withdraw needs reason; move/extend is admin with reason |
| Submission | `draft → submitted → under_review → revision_requested → approved / rejected` | `draft → approved`, `approved → submitted` without reopen | submit requires evidence; review is scoped to cohort; revision needs a note; approve can issue a certificate once |
| Assessment | `queued → in_review → completed → disputed → resolved` | `queued → completed`, `resolved → in_review` without a new dispute | grade requires assignment and rubric; dispute only after completion; resolve needs reason |
| Certificate | `issued → revoked / replaced` | `revoked → issued`, editing an issued snapshot | revoke requires reason; reissue creates a new code and marks the old replaced; revocation removes seller scope |
| Work card | `draft → submitted → teacher_confirmed → admin_review → published → paused / sold_out` | `draft → published`, `paused → submitted` | teacher confirmation requires path scope; publish requires admin review and valid permission; pause needs reason |
| Order | `draft → awaiting_payment → paid → in_progress → delivered → completed / cancelled / refunded / disputed` | `draft → paid`, `cancelled → paid`, `completed → refunded` outside refund flow | paid only from verified settlement; manual correction needs reason; refund/dispute branch from allowed states |
| Payment | `pending → paid / expired / failed / refunded` | `paid → pending`, `expired → paid` outside reconciliation | settle only by webhook; expire only pending; late payment goes to reconciliation |
| Payout | `pending → held → approved → paid / reversed` | `pending → paid`, `reversed → paid` | hold/reverse need reason; release requires approval and capability |
| Refund | `requested → reviewing → approved / rejected → paid` | `requested → paid`, `rejected → paid` | approve needs reason; paid writes reversal; payout already released creates negative carry |
| Dispute (assessment or order) | `open → reviewing → resolved → closed` | `open → closed` without review, reopening `closed` | resolution needs reason; high-impact override needs a second reviewer |
| Call | `scheduled → ringing → active → ended / missed / declined` | `scheduled → active` without accept, `ended → active` | accept checks membership and consent; end writes duration and quality summary |
| Support | `open → pending → resolved → closed` | `open → closed` without reply, `closed → pending` without reopen | assignment, escalation, resolution note; internal notes stay internal |
| Content | `draft → in_review → scheduled → published → archived` | `draft → published` without validation, `archived → published` without a new revision | publish requires capability and clean validation; rollback creates a new revision; schedule uses product timezone |

### 5.3 Cross-entity coupling

| ID | Test |
|---|---|
| P2-ASM-40 | Approval issues exactly one certificate; a retry does not issue a second. |
| P2-CRT-41 | Revocation removes seller scope in the same transaction; public verification shows revoked immediately. |
| P3-ORD-40 | An order cannot become paid without a settled payment. |
| P3-ORD-41 | A paid order creates payout rows in the same transaction. |
| P3-RFD-40 | A paid refund creates reversal rows and updates payout state together. |
| P5-CALL-40 | Ending a call writes participant leave times and a quality summary once. |
| P6-FLOW-40 | Runtime transitions match the configured flow definitions; drift fails the test. |

---

## 6. Content CMS tests

### 6.1 Editor groups

Every group in workspace-plan §6.10 and Appendix A is editable, validated, previewable, and publishable.

| Group | Required tests |
|---|---|
| Hero | title lines, description, both CTAs, plate image with alt/caption/note, work card title/serial/work/maker/teacher; required fields; image dimensions |
| Traction | label, note, each figure value and label; figures are records, never typed into a stat |
| Loop | label, title, description, return label/note, stages with code/title/description, diagram title/description; stage count and unique codes |
| Catalog | label, title, description, CTA, group status/title/blurb, field name/region/status/note; readiness enum |
| Mangsa | label, season, name, period, eyebrow, title, description, activities, provenance; local-calendar caveat preserved |
| Ethics | principles, access levels, share values, share aria label, source card, attribution; 70/15/15 copy matches the computed split; platform-certificate wording |
| Institution | label/title/description, segments, points, brief pairs, CTA, note, summary fields; no nationwide coverage claim |
| Section copy | paths, teachers, works, notes, FAQ, closing labels and CTAs; no duplicate CTA labels that break analytics-free tracking |
| Footer and newsletter | columns, links, secretariat, edition, copyright, sources, culture policy, certificate note, preferences, newsletter labels and states |
| Navigation | label and href; internal href resolves; duplicate order rejected |
| Overlays | policy, login, mangsa, verify, about, privacy, terms: icon, title, description, bullets, footnote, action |
| Header | brand/nav/mobile/search/menu aria labels, login/register CTAs, mobile search/register, sheet title/description, region |
| Search | title, description, placeholder, empty states, footer/esc/close labels, groups, coming-soon path, pages with label/description/href |
| Mobile CTA | label, price prefix/suffix, register CTA, note; price reflects the path record |
| Lead dialogs | student, institution, consultation, notify: title and description; intent maps to the lead enum |
| Metadata and SEO | site name, URL, area served, title, description, OG, Twitter, keywords, category, image URL/width/height/alt |
| Entities | catalog fields, paths and modules, teachers, works, testimonials, FAQs: create, edit, order, publish state, validation |

### 6.2 Validation

| ID | Test |
|---|---|
| P1-CMS-01 | Required fields reject empty and whitespace-only values. |
| P1-CMS-02 | Max lengths are enforced at the schema and the form. |
| P1-CMS-03 | URLs accept only http/https; `javascript:`, `data:`, and protocol-relative values are rejected. |
| P1-CMS-04 | Internal links resolve to a published route or a known redirect. |
| P1-CMS-05 | Images require alt text; dimensions meet the configured minimum; broken sources fail. |
| P1-CMS-06 | Markdown renders through the safe renderer; raw HTML and script are rejected or escaped. |
| P1-CMS-07 | Prices are integer rupiah; status and readiness use the defined enums. |
| P1-CMS-08 | Slugs are unique and URL-safe; duplicates are rejected. |
| P1-CMS-09 | Order values are unique within a list; gaps are allowed. |
| P1-CMS-10 | Newsletter and lead copy states consent and purpose; no pre-checked marketing consent. |
| P1-CMS-11 | Public copy contains none of the forbidden labels from the brief. |
| P1-CMS-12 | Certificate copy says platform certificate and public verification, with no accreditation claim. |
| P1-CMS-13 | The base region is Yogyakarta and Jawa Tengah; no nationwide coverage claim. |
| P1-CMS-14 | Every displayed number maps to a content or stats record, not a typed literal. |
| P1-CMS-15 | The same Zod schema validates the form, the mutation, and the stored revision. |
| P1-CMS-16 | The link checker runs before publish and blocks broken internal links, broken external links, and broken images; the result names the field and URL. |

### 6.3 Draft, preview, publish, schedule, rollback

| ID | Test |
|---|---|
| P1-CMS-20 | Draft saves without changing the public page. |
| P1-CMS-21 | Preview token is scoped to one revision, expires, and is noindex. |
| P1-CMS-22 | Preview desktop and mobile render the same revision with section anchors. |
| P1-CMS-23 | Publish requires `content.publish` and valid content. |
| P1-CMS-24 | Publish switches the public page atomically; a failed publish leaves the old page live. |
| P1-CMS-25 | Scheduled publish uses `Asia/Jakarta`, fires once, and can be cancelled. |
| P1-CMS-26 | A failed scheduled publish keeps the draft and alerts the owner. |
| P1-CMS-27 | Rollback creates a new revision from an old one; history is never deleted. |
| P1-CMS-28 | Revision diff shows changed fields and the actor. |
| P1-CMS-29 | Concurrent edit: the second writer gets a stale-version conflict, not last-write-wins. |
| P1-CMS-30 | Content lock is acquired, released, and expires; a stale lock does not block forever. |
| P1-CMS-31 | Sensitive changes require an explicit confirmation and are audited. |
| P1-CMS-32 | Publishing invalidates the landing cache; the next request serves the new revision. |
| P1-CMS-33 | Drafts and unpublished entities never appear in public queries or the sitemap. |
| P1-CMS-34 | A preview token cannot read another section's draft or another admin's lock. |

### 6.4 Media library

| ID | Test |
|---|---|
| P1-MED-01 | Upload accepts the configured image, audio, and video types and rejects others by MIME, not extension. |
| P1-MED-02 | Size and dimension limits are enforced server-side. |
| P1-MED-03 | Alt, caption, credit, permission, and focal point persist and render. |
| P1-MED-04 | Responsive variants are generated and referenced by width. |
| P1-MED-05 | Usage list shows every place an asset appears. |
| P1-MED-06 | Replacing an asset preserves references and updates the rendered source. |
| P1-MED-07 | Deleting an asset in use is blocked or requires a replacement. |
| P1-MED-08 | Private media uses signed URLs; no public bucket path is exposed. |
| P1-MED-09 | Upload failure leaves no orphan metadata row. |
| P1-MED-10 | SVG and HTML uploads cannot execute script in the admin or public page. |

### 6.5 SEO, routing, and public surface

| ID | Test |
|---|---|
| P1-CMS-40 | Title, description, canonical, OG, and Twitter tags render from content. |
| P1-CMS-41 | OG image dimensions and alt are present. |
| P1-CMS-42 | Robots and sitemap include only published routes. |
| P1-CMS-43 | Redirects resolve once, report hit counts, and reject loops. |
| P1-CMS-44 | Structured data parses and matches visible content. |
| P1-CMS-45 | 404 monitoring records a miss without storing sensitive query values. |
| P1-CMS-46 | `/ruang` remains noindex. |

---

## 7. Learning tests

### 7.1 Paths, cohorts, enrollment, progress

| ID | Test |
|---|---|
| P2-LRN-01 | A path requires a published status, ordered modules, lessons, materials, and estimated time. |
| P2-LRN-02 | A cohort requires an active teacher, capacity, schedule, and timezone. |
| P2-LRN-03 | Cohort capacity is enforced atomically; the last seat has one winner. |
| P2-LRN-04 | Enrollment starts `pending_payment` and activates only on settled payment. |
| P2-LRN-05 | Duplicate enrollment in the same cohort is rejected. |
| P2-LRN-06 | A student cannot enroll in an unpublished path or a full cohort. |
| P2-LRN-07 | Admin can move an enrollment or extend a deadline with a reason and audit. |
| P2-LRN-08 | Withdrawal requires a reason and preserves assessment and certificate history. |
| P2-LRN-09 | Completion follows the configured completion rule, not a hardcoded UI count. |
| P2-LRN-10 | Lesson completion and attendance are idempotent per student and lesson. |
| P2-LRN-11 | A student sees only their own progress; a teacher sees their cohort. |
| P2-LRN-12 | A teacher cannot see another teacher's roster. |
| P2-LRN-13 | At-risk and inactive flags derive from progress timestamps, not manual labels. |
| P2-LRN-14 | Enrollment detail links payment, progress, submissions, certificate, and seller state. |

### 7.2 Submissions, assessment, feedback, revision

| ID | Test |
|---|---|
| P2-SUB-01 | Submission accepts text, file, image, audio, and video within configured limits. |
| P2-SUB-02 | Draft autosave is scoped to the owner and does not submit. |
| P2-SUB-03 | Submit requires evidence and records the submitted timestamp. |
| P2-SUB-04 | Due date and late state are computed from the cohort deadline and timezone. |
| P2-SUB-05 | Revision request requires a note and reopens the submission. |
| P2-SUB-06 | A student cannot submit for another student or after approval without a reopen. |
| P2-SUB-07 | Submission assets are private and signed; non-owner access fails. |
| P2-ASM-01 | Grading queue is scoped by teacher, path, cohort, age, and SLA. |
| P2-ASM-02 | Rubric weights sum to 100 and each criterion is required. |
| P2-ASM-03 | Score is within the rubric range; a missing criterion fails validation. |
| P2-ASM-04 | Text, voice, or video feedback is stored; required course feedback has a transcript or summary. |
| P2-ASM-05 | Approve, reject, request revision, escalate, and dispute follow the state machine. |
| P2-ASM-06 | A teacher cannot grade their own enrollment or work. |
| P2-ASM-07 | Admin can reassign, nudge, escalate, or open a dispute with a reason, but cannot grade. |
| P2-ASM-08 | A score override requires a reason; a high-impact override requires a second reviewer. |
| P2-ASM-09 | Assessment history records every revision and override; nothing is overwritten silently. |
| P2-ASM-10 | First-feedback timestamps feed p50/p90 SLA; the SLA is computed from records. |
| P2-ASM-11 | Dispute `open → reviewing → resolved → closed` is enforced; resolution needs a reason. |
| P2-ASM-12 | A resolved dispute cannot be silently reopened; a new dispute is required. |

### 7.3 Certificates and Kartu Karya

| ID | Test |
|---|---|
| P2-CRT-01 | Approval issues exactly one platform certificate per assessment. |
| P2-CRT-02 | Serial and public code are unique and unguessable. |
| P2-CRT-03 | Certificate snapshots student, path, assessment, issue date, and status. |
| P2-CRT-04 | Public verification returns only public fields and shows issued status. |
| P2-CRT-05 | Revocation requires a reason and shows revoked immediately on the public page. |
| P2-CRT-06 | Reissue creates a new code; the old code shows replaced and never verifies as current. |
| P2-CRT-07 | Revocation removes seller scope for that path and pauses listings that depend on it. |
| P2-CRT-08 | A certificate remains valid when the teacher is suspended; the profile is unpublished, not the credential. |
| P2-CRT-09 | Certificate PDF and QR resolve to the same public verification record. |
| P2-CRT-10 | A certificate for path A never authorizes selling path B. |
| P2-CRT-11 | Certificate events are append-only and record actor, reason, and timestamp. |
| P2-CRT-12 | The public page says platform certificate with verification; it makes no accreditation claim. |
| P2-CRT-13 | Kartu Karya shows maker, technique, teacher, path, serial, and provenance. |
| P2-CRT-14 | A revoked certificate's Kartu Karya remains historically visible but cannot back a new listing. |

---

## 8. Commerce tests

### 8.1 Works and moderation

| ID | Test |
|---|---|
| P3-WRK-01 | A work card carries `pathId` and, for a student seller, `certificateId`. |
| P3-WRK-02 | Listing requires a valid seller scope for that path. |
| P3-WRK-03 | Price is a positive integer; unit and technique are present. |
| P3-WRK-04 | Images, permission, attribution, and provenance are required before moderation. |
| P3-WRK-05 | Work card follows draft → submitted → teacher_confirmed → admin_review → published. |
| P3-WRK-06 | Teacher confirmation is scoped to the teacher's path. |
| P3-WRK-07 | Admin publish/unpublish requires a reason and audit. |
| P3-WRK-08 | Split preview uses the same money function as the ledger. |
| P3-WRK-09 | Permission expiry or takedown bulk-pauses affected works. |
| P3-WRK-10 | A paused or sold-out work cannot be ordered. |
| P3-WRK-11 | Public work detail exposes only published fields and public provenance. |

### 8.2 Guest checkout and claim

| ID | Test |
|---|---|
| P3-ORD-01 | A guest can create an order and pay without an account. |
| P3-ORD-02 | Order token has sufficient entropy, is unguessable, and is rate limited. |
| P3-ORD-03 | Guest status page shows order state, amount, and limited contact, with noindex. |
| P3-ORD-04 | Guest checkout collects consent for transactional contact. |
| P3-ORD-05 | Claim requires a signed-in account with the matching verified email. |
| P3-ORD-06 | A wrong email, another account, or an already claimed order cannot claim. |
| P3-ORD-07 | A claimed guest order appears in purchases and keeps its history. |
| P3-ORD-08 | Claim is idempotent and audited. |
| P3-ORD-09 | Checkout double-submit returns the same order, not a duplicate charge. |
| P3-ORD-10 | Out-of-stock, paused, or unpublished work cannot be ordered. |

### 8.3 Order lifecycle

| ID | Test |
|---|---|
| P3-ORD-20 | Order follows draft → awaiting_payment → paid → in_progress → delivered → completed. |
| P3-ORD-21 | Paid requires a settled payment; a client status update is rejected. |
| P3-ORD-22 | Cancel is allowed only from the permitted states. |
| P3-ORD-23 | Refund and dispute branch from the permitted states and preserve history. |
| P3-ORD-24 | Manual correction requires a reason and audit; it cannot bypass payment settlement. |
| P3-ORD-25 | Buyer sees own purchases; seller sees own sales; admin sees all. |
| P3-ORD-26 | Completion is not possible before delivery. |
| P3-ORD-27 | Order detail links buyer, seller, work, payment, payout, refund, and dispute. |
| P3-ORD-28 | A seller cannot mark their own order paid or completed outside the flow. |

### 8.4 Payouts, refunds, disputes

| ID | Test |
|---|---|
| P3-PYT-01 | A paid order creates pending payout rows at 70/15/15. |
| P3-PYT-02 | Hold, approve, release, and reverse follow the payout state machine. |
| P3-PYT-03 | Hold and reverse require a reason; release requires approval. |
| P3-PYT-04 | Due payouts are listed by due date; paid rows are immutable. |
| P3-PYT-05 | Teacher statements and admin exports reconcile to the ledger. |
| P3-PYT-06 | Payout account change requires re-verification and audit. |
| P3-PYT-07 | A refund after release creates a negative carry, not a ledger edit. |
| P3-RFD-01 | Refund request captures reason, evidence, and order link. |
| P3-RFD-02 | Refund follows requested → reviewing → approved/rejected → paid. |
| P3-RFD-03 | Approval and rejection require a reason. |
| P3-RFD-04 | Paid refund writes reversal entries and updates payout state atomically. |
| P3-RFD-05 | A rejected refund cannot be paid. |
| P3-RFD-06 | Order dispute follows open → reviewing → resolved → closed. |
| P3-RFD-07 | A dispute does not block unrelated payouts. |
| P3-RFD-08 | Refund and dispute decisions are audited with actor and reason. |
| P3-RFD-09 | The app records the approved refund and ledger reversal; it does not call a typed provider refund, which stays manual until a provider endpoint exists. |

---

## 9. Messaging and calls tests

### 9.1 Chat

| ID | Test |
|---|---|
| P4-MSG-01 | Direct conversation requires an enrollment/cohort relationship. |
| P4-MSG-02 | Cohort conversation includes the teacher and enrolled students only. |
| P4-MSG-03 | Support conversation requires a request or user consent; admin joins with consent. |
| P4-MSG-04 | System conversation is generated, not user-created. |
| P4-MSG-05 | A non-member cannot read, send, search, or enumerate messages. |
| P4-MSG-06 | Text, voice, image, file, and system events render by type. |
| P4-MSG-07 | Replies, edits, and soft delete preserve history and audit. |
| P4-MSG-08 | Read receipts are per member and monotonic; a non-member cannot write one. |
| P4-MSG-09 | Typing and presence are scoped to the conversation. |
| P4-MSG-10 | Search is scoped to one conversation the viewer belongs to. |
| P4-MSG-11 | Link previews are off by default; external links show a warning. |
| P4-MSG-12 | Rate limits and spam checks stop burst sending. |
| P4-MSG-13 | Block prevents new direct messages and calls between the pair. |
| P4-MSG-14 | Report creates a moderation flag with the message reference. |
| P4-MSG-15 | Mute suppresses notifications without hiding messages. |
| P4-MSG-16 | Retention follows the configured chat policy; expired messages are removed from normal reads. |
| P4-MSG-17 | Admin sees metadata by default; content requires break-glass with reason. |
| P4-MSG-18 | Moderation remove, warn, mute, suspend messaging, and close are audited. |
| P4-MSG-19 | Internal support notes never appear in the user thread. |

### 9.2 Voice notes and uploads

| ID | Test |
|---|---|
| P4-MSG-30 | Audio-only Opus/WebM is preferred; the configured MIME allowlist is enforced. |
| P4-MSG-31 | Maximum duration is 10 minutes and maximum size is 25 MB, enforced server-side. |
| P4-MSG-32 | Upload uses a signed URL scoped to the sender and conversation. |
| P4-MSG-33 | Message stores asset ID, duration, waveform peaks, MIME, and size. |
| P4-MSG-34 | Inline playback, seek, and speed work without downloading the file. |
| P4-MSG-35 | Transcript is optional; required course feedback has a transcript or summary. |
| P4-MSG-36 | Oversized, wrong-MIME, extension-mismatch, and malformed uploads are rejected. |
| P4-MSG-37 | Repeated upload attempts hit the rate limit. |
| P4-MSG-38 | Soft-deleted voice notes follow retention and are inaccessible to non-members. |
| P4-MSG-39 | A moderation removal keeps the audit reference without exposing the media. |

### 9.3 Calls

| ID | Test |
|---|---|
| P5-CALL-01 | Token endpoint requires authentication and a call capability. |
| P5-CALL-02 | Student can call a teacher only during availability or an accepted invitation. |
| P5-CALL-03 | Teacher can call a student in their own cohort. |
| P5-CALL-04 | Admin can join a support call only with consent. |
| P5-CALL-05 | A blocked, suspended, or unrelated user cannot get a token. |
| P5-CALL-06 | Token is short-lived, room-scoped, and contains no secret. |
| P5-CALL-07 | Room names are unguessable and cannot be joined from another tenant path. |
| P5-CALL-08 | Call follows scheduled → ringing → active → ended/missed/declined. |
| P5-CALL-09 | Accept checks membership and consent at the moment of joining. |
| P5-CALL-10 | A cohort call caps at 25 participants in v1. |
| P5-CALL-11 | Waiting room and lobby gate entry before the host admits. |
| P5-CALL-12 | Device test runs before join and can be skipped without blocking audio fallback. |
| P5-CALL-13 | Media failure falls back to audio-only, then chat or reschedule; the user sees the fallback. |
| P5-CALL-14 | Recording is off by default and starts only with both parties' consent. |
| P5-CALL-15 | Recording access requires consent, a reason, break-glass, and an audit entry. |
| P5-CALL-16 | Recording retention is 30 days unless a legal hold applies. |
| P5-CALL-17 | Call metadata, participants, and quality summary are stored; no media secret is stored. |
| P5-CALL-18 | Minors need guardian consent for a 1:1 call; cohort calls are preferred. |
| P5-CALL-19 | A minor without consent cannot start or accept a 1:1 call. |
| P5-CALL-20 | Any report linked to a call triggers moderation review; recording stays off. |
| P5-CALL-21 | Missed and declined calls write terminal states and notify the other party. |
| P5-CALL-22 | Call reminders fire 10 minutes before the scheduled time. |
| P5-CALL-23 | No call token, room secret, or recording URL appears in logs or client bundles. |
| P5-CALL-24 | Ending a call is idempotent and writes duration once. |

---

## 10. Admin and governance tests

### 10.1 Appendix B coverage

Each checklist item maps to a required test group.

| Admin data area | Test group |
|---|---|
| Accounts and roles | P1-ACC |
| Sessions and login history | P1-ACC, P0-AUTH |
| Teacher applications and documents | P1-TCH |
| Seller profiles and payout accounts | P3-PYT |
| Leads and notes | P1-LEAD |
| Enrollments and progress | P2-LRN |
| Submissions and assessments | P2-SUB, P2-ASM |
| Certificates and work cards | P2-CRT, P3-WRK |
| Works and orders | P3-WRK, P3-ORD |
| Payments and reconciliation | P3-PAY |
| Payouts, refunds, disputes | P3-PYT, P3-RFD |
| Conversations metadata and break-glass content | P4-MSG, P0-ACC |
| Calls metadata, consent, recordings | P5-CALL |
| Content revisions and media | P1-CMS, P1-MED |
| Navigation, SEO, redirects | P1-CMS |
| Stats and exports | P1-STAT, P1-EXP |
| Flows and SLAs | P6-FLOW |
| All log types | P1-LOG |
| Support tickets | P6-SUP |
| Feature flags and integrations | P6-GOV |
| Privacy requests and retention holds | P6-GOV, P7-SEC |

### 10.2 Accounts, roles, and impersonation

| ID | Test |
|---|---|
| P1-ACC-01 | Search accounts by name, email, WhatsApp, role, region, and status. |
| P1-ACC-02 | Account detail shows roles, entitlements, teacher profile, seller profile, enrollments, certificates, works, orders, calls, message metadata, sessions, and login history. |
| P1-ACC-03 | Role assignment appends a record with actor, reason, and timestamp; no update or delete. |
| P1-ACC-04 | Invite admin or teacher works; public signup cannot create either role. |
| P1-ACC-05 | Suspend revokes sessions and blocks workspace mutations; reactivate restores access. Message and call blocks are re-tested in P4-MSG and P5-CALL. |
| P6-SEC-02 | MFA reset requires an admin action and audit. |
| P1-ACC-07 | Session revocation invalidates the device immediately. |
| P1-ACC-08 | Anonymize/delete respects retention and legal hold. |
| P1-ACC-09 | View-as is read-only, shows a persistent banner, expires, and is audited. |
| P1-ACC-10 | Impersonation cannot approve payments, refunds, grades, or role changes. |
| P1-ACC-11 | Impersonation cannot open break-glass content or export data. |
| P1-ACC-12 | Payout account change requires re-verification and audit. |

### 10.3 Logs

| ID | Test |
|---|---|
| P1-LOG-01 | Tabs exist for audit, auth, payments, notifications, calls, moderation, content, API, and errors. |
| P1-LOG-02 | Filter by actor, entity, action, severity, date, and request ID. |
| P1-LOG-03 | Detail drawer correlates events by request ID and entity. |
| P1-LOG-04 | Export is logged and scoped. |
| P1-LOG-05 | Retention differs by log type and is enforced. |
| P1-LOG-06 | Audit logs are append-only; no exported mutation updates or deletes them. |
| P1-LOG-07 | A tamper attempt fails and is itself logged. |
| P1-LOG-08 | Logs redact tokens, QR payloads, OTPs, session values, and personal contact fields. |
| P1-LOG-09 | Alert rules fire on error rate, webhook failure, and gateway health. |
| P1-LOG-10 | A denied break-glass attempt appears in the moderation log. |

### 10.4 Stats definitions

Every metric is computed from records. Admin can configure definitions and dates, never type a number.

| ID | Metric | Definition under test |
|---|---|---|
| P1-STAT-01 | Lead conversion | converted ÷ qualified, period |
| P1-STAT-02 | Enrollment activation | paid enrollments ÷ created enrollments |
| P1-STAT-03 | Completion | completed ÷ active enrollments |
| P1-STAT-04 | Submission rate | submitted tasks ÷ expected tasks |
| P1-STAT-05 | Assessment SLA | p50/p90 hours submit → first feedback |
| P1-STAT-06 | Pass rate | approved ÷ assessed submissions |
| P1-STAT-07 | Certificate issuance | issued ÷ approved assessments |
| P1-STAT-08 | Seller activation | first published listing within 30 days of certificate |
| P1-STAT-09 | GMV | paid order gross, before refunds |
| P1-STAT-10 | Net revenue | GMV − refunds − gateway fees |
| P1-STAT-11 | Payout due | approved but unpaid |
| P1-STAT-12 | Teacher load | active students per teacher |
| P1-STAT-13 | Cohort fill | enrolled ÷ capacity |
| P1-STAT-14 | Support first response | p50/p90 minutes |
| P1-STAT-15 | Gateway success | paid charges ÷ created charges |
| P1-STAT-16 | Content freshness | days since last publish per section |
| P1-STAT-17 | Date range and comparison | same definition, correct boundary, product timezone |
| P1-STAT-18 | Breakdowns | cohort, path, teacher, region reconcile to totals |
| P1-STAT-19 | Funnel | visitor → lead → enrollment → submission → assessment → certificate → first sale → repeat |
| P1-STAT-20 | No page-view claim | absent unless a real analytics source is configured |
| P1-STAT-21 | No manual number | no mutation accepts a stat value |
| P1-STAT-22 | Export | CSV matches the on-screen filtered total |

### 10.5 Flows and SLAs

| ID | Test |
|---|---|
| P6-FLOW-01 | Every domain has a flow definition with states, transitions, guards, and SLA. |
| P6-FLOW-02 | Invalid transition configuration is rejected. |
| P6-FLOW-03 | Runtime transitions match the definition; drift fails. |
| P6-FLOW-04 | Auto-assignment follows rules and records the actor as system. |
| P6-FLOW-05 | Reminder and escalation fire at the configured threshold. |
| P6-FLOW-06 | Stuck records list is sorted by age and links to the record. |
| P6-FLOW-07 | Manual override requires a reason and audit. |
| P6-FLOW-08 | No drag-and-drop script builder or arbitrary code execution exists in v1. |
| P6-FLOW-09 | SLA thresholds are editable by admin and used by stats and queues. |

### 10.6 Exports, privacy, and support

| ID | Test |
|---|---|
| P1-EXP-01 | Export runs as an async job for every domain. |
| P1-EXP-02 | Download link is signed, expiring, and audited. |
| P1-EXP-03 | Export scope matches the requester's capability and filters. |
| P1-EXP-04 | CSV escapes formulas and quoting to prevent spreadsheet injection. |
| P6-GOV-01 | Privacy access, correction, deletion, and retention hold are requestable and tracked. |
| P6-GOV-02 | Deletion anonymizes the account but preserves financial records under retention. |
| P6-GOV-03 | Legal hold overrides deletion and is visible in audit. |
| P6-SUP-01 | Ticket has priority, assignee, SLA, and links to account/order/payment/enrollment/certificate. |
| P6-SUP-02 | Canned responses and internal notes are separated from user messages. |
| P6-SUP-03 | Escalation routes to payment, content, or trust and safety. |
| P6-SUP-04 | Support joins chat or call only with consent and logs the join. |
| P6-GOV-10 | Feature flags gate seller, calls, recordings, and new sections; flags are audited. |
| P6-GOV-11 | Integration health reports gateway, email, WhatsApp, and LiveKit without secrets. |
| P6-GOV-12 | API keys are scoped, rotatable, and shown once. |

### 10.7 Audit immutability

| ID | Test |
|---|---|
| P6-GOV-20 | No exported mutation updates or deletes an audit row. |
| P6-GOV-21 | Every admin action writes before/after state, actor, reason, and request ID. |
| P6-GOV-22 | Audit rows survive account deletion and data retention jobs. |
| P6-GOV-23 | A direct database write attempt outside validated mutations fails in production. |

---

## 11. Security and privacy tests

### 11.1 Auth and session

| ID | Test |
|---|---|
| P0-AUTH-01 | Student registration works; admin and teacher accounts are invite-only. |
| P0-AUTH-02 | No public mutation grants a role or elevates to admin. |
| P0-AUTH-03 | Roles come from Convex, not from a JWT claim; a stale token does not carry a new role. |
| P6-SEC-01 | Admin MFA is required; a missing second factor blocks the admin session. (Phase 6; Phase 0 does not block on it.) |
| P0-AUTH-05 | Session cookie is httpOnly, secure, same-site, and scoped. |
| P0-AUTH-06 | Logout revokes the session; logout-all revokes every device. |
| P0-AUTH-07 | Session revocation takes effect on the next request. |
| P0-AUTH-08 | Device list shows last seen and can revoke one device. |
| P0-AUTH-09 | Session fixation: a pre-login identifier is replaced on sign-in. |
| P0-AUTH-10 | Suspended account cannot create a session; existing sessions are revoked. |
| P0-AUTH-11 | Login and OTP attempts are rate limited and do not reveal account existence. |
| P0-AUTH-12 | Expired and malformed sessions fail closed. |
| P0-AUTH-13 | First admin bootstrap is internal/CLI only; no default password. |

P0-AUTH-04 is withdrawn; admin MFA moved to P6-SEC-01 so Phase 0 does not block on it.

### 11.2 CSRF, rate limits, and request safety

| ID | Test |
|---|---|
| P7-SEC-01 | State-changing browser requests require same-site credentials; a cross-origin form POST is rejected. |
| P7-SEC-02 | GET never mutates. |
| P7-SEC-03 | Webhook is exempt from CSRF because it uses HMAC, not cookies. |
| P7-SEC-04 | Login, leads, messages, uploads, payment status, and calls each have a rate limit. |
| P7-SEC-05 | Rate limit returns a stable retry signal without leaking whether an account exists. |
| P7-SEC-06 | Verification lookup is rate limited and does not enumerate codes. |
| P7-SEC-07 | Request body size limits apply before parsing. |

### 11.3 Upload abuse

| ID | Test |
|---|---|
| P7-SEC-10 | MIME is sniffed; a renamed executable is rejected. |
| P7-SEC-11 | Extension and MIME mismatch is rejected. |
| P7-SEC-12 | Oversized files and image decompression bombs are rejected. |
| P7-SEC-13 | SVG and HTML cannot execute script when served. |
| P7-SEC-14 | Path traversal and crafted filenames cannot escape the asset namespace. |
| P7-SEC-15 | Signed upload URL expires and is bound to the user and purpose. |
| P7-SEC-16 | Malware scan hook runs where supported; failure fails closed or quarantines. |
| P7-SEC-17 | Private media has no public bucket URL. |

### 11.4 Webhooks and SSRF

| ID | Test |
|---|---|
| P7-SEC-20 | Signature is HMAC-SHA256 over `timestamp + "." + rawBody`. |
| P7-SEC-21 | Wrong signature, missing header, and body tampering are rejected. |
| P7-SEC-22 | Timestamp older than 5 minutes is rejected. |
| P7-SEC-23 | Replayed `eventId` is idempotent, not a second settlement. |
| P7-SEC-24 | Unknown event and malformed JSON are rejected without writes. |
| P7-SEC-25 | Comparison is timing-safe. |
| P7-SEC-26 | Webhook payload contains no session token, QR payload, or secret. |
| P7-SEC-27 | Outbound webhook URL rejects private, loopback, link-local, and metadata addresses. |
| P7-SEC-28 | Redirects are disabled for webhook delivery. |
| P7-SEC-29 | DNS rebinding residual risk is documented; the deployment uses an egress allowlist or firewall, verified in the runbook. |
| P7-SEC-30 | Dead-letter after the configured attempts and an operator can inspect it without secrets. |

### 11.5 Secrets, PII, and retention

| ID | Test |
|---|---|
| P7-SEC-40 | Logs and error responses contain no token, OTP, QR payload, session value, or key. |
| P7-SEC-41 | Health endpoints report state without secrets. |
| P7-SEC-42 | Client bundles and source maps contain no server secret. |
| P7-SEC-43 | Chat, voice notes, call metadata, recordings, and moderation evidence follow their retention periods. |
| P7-SEC-44 | Deletion request anonymizes PII while preserving financial and audit records. |
| P7-SEC-45 | Access and correction requests return the subject's data and are audited. |
| P7-SEC-46 | Retention hold blocks deletion and is visible in audit. |
| P7-SEC-47 | Export download expires and cannot be reused. |
| P7-SEC-48 | No personal data is sold or shared with a third party outside the documented processors. |
| P7-SEC-49 | Secret scan finds no committed `.env`, key, token, or credential. |
| P7-SEC-50 | `npm audit --omit=dev` has no unaccepted runtime vulnerability. |

---

## 12. Accessibility and responsive matrix

### 12.1 Standard

WCAG 2.1 AA. Axe runs with `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, and `best-practice`. Required result: zero violations on every listed route at desktop and mobile.

### 12.2 Route and viewport matrix

| Route | Roles | 360 | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|---|---|
| `/` | public | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/karya/[slug]` | public | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/pesan/[slug]` | public | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/pesanan/[token]` | guest | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/verifikasi/[kode]` | public | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/masuk`, `/daftar` | public | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/ruang` | student, teacher, admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/ruang/belajar`, `/ruang/tugas`, `/ruang/kredensial` | student, teacher | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/ruang/karya`, `/ruang/pesanan`, `/ruang/pesan`, `/ruang/panggilan` | student-seller, teacher | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/ruang/prospek`, `/ruang/orang`, `/ruang/konten`, `/ruang/statistik`, `/ruang/alur`, `/ruang/log`, `/ruang/dukungan`, `/ruang/tata-kelola` | admin | ✓ | ✓ | ✓ | ✓ | ✓ |

### 12.3 Checklist

| ID | Check |
|---|---|
| P7-A11Y-01 | Axe returns zero violations for every route and role. |
| P7-A11Y-02 | Skip link is first, visible on focus, and moves focus to main. |
| P7-A11Y-03 | One `h1` per page; headings are ordered. |
| P7-A11Y-04 | Landmarks and labelled regions are present. |
| P7-A11Y-05 | Every form control has a programmatic label; errors are associated and announced. |
| P7-A11Y-06 | Dialogs trap focus, close on Escape, and return focus to the trigger. |
| P7-A11Y-07 | Drawers and sheets are keyboard operable and restore focus. |
| P7-A11Y-08 | Tables have headers, scope, caption, and keyboard row actions. |
| P7-A11Y-09 | Status is shape plus label, never colour alone. |
| P7-A11Y-10 | Focus ring is visible on cream (copper) and dark wood (brass). |
| P7-A11Y-11 | Text contrast meets 4.5:1; large display meets 3:1. |
| P7-A11Y-12 | Touch targets are at least 44px. |
| P7-A11Y-13 | No horizontal overflow at 360, 390, 768, 1024, or 1440. |
| P7-A11Y-14 | Reflow works at 200% zoom without loss of content or action. |
| P7-A11Y-15 | `prefers-reduced-motion` removes the arrival gesture and textures. |
| P7-A11Y-16 | Data-saver preference removes motion and heavy media. |
| P7-A11Y-17 | Mobile dock is hidden from assistive technology and tab order until open. |
| P7-A11Y-18 | Icon-only buttons have an accessible name. |
| P7-A11Y-19 | Search opens with `Cmd/Ctrl+K`, is labelled, and restores focus. |
| P7-A11Y-20 | Voice notes and calls expose captions or transcripts where required. |
| P7-A11Y-21 | Live regions announce form results without moving focus unexpectedly. |
| P7-A11Y-22 | Manual screen-reader pass on NVDA and VoiceOver covers landing, workspace tables, dialogs, chat, and call controls. |

---

## 13. E2E scenarios per role

E2E runs in Phase 7 against a dedicated test deployment with the fake gateway and a local or stubbed LiveKit environment.

### 13.1 Buyer

| ID | Scenario | Assertions |
|---|---|---|
| P7-E2E-BUY-01 | Browse landing → open a published work → guest checkout | price, unique total, disclosure, consent |
| P7-E2E-BUY-02 | Pay via fake gateway → order status by token | paid state, receipt, no account needed |
| P7-E2E-BUY-03 | Sign in → claim guest order | order appears in purchases; token still valid |
| P7-E2E-BUY-04 | Request refund and track decision | request visible, status changes, reversal reflected |
| P7-E2E-BUY-05 | Verify a certificate from the public page | platform certificate, issued/revoked state, no accreditation claim |

### 13.2 Student

| ID | Scenario | Assertions |
|---|---|---|
| P7-E2E-STU-01 | Register → sign in → land on `/ruang` | student nav, no admin or seller items |
| P7-E2E-STU-02 | Open enrolled path → complete a lesson | progress updates, attendance recorded |
| P7-E2E-STU-03 | Submit text and file evidence → receive feedback → revise | draft, submit, revision request, resubmit |
| P7-E2E-STU-04 | View released rubric and score | score, feedback, appeal/dispute action |
| P7-E2E-STU-05 | Earn certificate → open public verification → download PDF | issued state, QR resolves |
| P7-E2E-STU-06 | Message teacher → send voice note → read receipt | membership, playback, transcript state |
| P7-E2E-STU-07 | Join a scheduled cohort call | consent, audio-only fallback, leave |
| P7-E2E-STU-08 | Update profile → export data → request deletion | confirmation, signed link, retention note |

### 13.3 Student seller

| ID | Scenario | Assertions |
|---|---|---|
| P7-E2E-SEL-01 | Onboarding checklist → payout account → consent | steps complete, verification state |
| P7-E2E-SEL-02 | Create listing only in certified path | path scope, teacher confirmation, admin moderation |
| P7-E2E-SEL-03 | Publish → receive order → see earnings | 70/15/15 preview, pending payout |
| P7-E2E-SEL-04 | Pause listing → resume | state and public availability |
| P7-E2E-SEL-05 | Certificate revoked → listing blocked | scope removed, clear explanation |

### 13.4 Teacher

| ID | Scenario | Assertions |
|---|---|---|
| P7-E2E-TCH-01 | Accept invite → complete profile → verification | applicant state, public profile after approval |
| P7-E2E-TCH-02 | Open cohort → roster → at-risk student | own cohort only, progress and last activity |
| P7-E2E-TCH-03 | Grade queue → rubric → request revision → approve | score, feedback, certificate issued once |
| P7-E2E-TCH-04 | Earnings and payout statement | 70% share, CSV, refund adjustment |
| P7-E2E-TCH-05 | Chat and call own student | teacher may call a student in their own cohort; student-initiated calls stay availability-bound |
| P7-E2E-TCH-06 | Try another teacher's cohort by URL | not found or forbidden, no data leak |

### 13.5 Admin

| ID | Scenario | Assertions |
|---|---|---|
| P7-E2E-ADM-01 | Command center → open a queue → resolve a record | counts, filters, next action |
| P7-E2E-ADM-02 | Verify a teacher application | dossier, approve, public profile |
| P7-E2E-ADM-03 | Edit every landing group → preview → publish → rollback | draft isolation, preview, atomic publish, history |
| P7-E2E-ADM-04 | Reconcile a late payment with reason | queue, manual match, audit |
| P7-E2E-ADM-05 | Hold → release a payout; approve a refund | reasons, ledger reversal, negative carry |
| P7-E2E-ADM-06 | Break-glass a conversation → review → close | reason, audit, content not exposed elsewhere |
| P7-E2E-ADM-07 | Open logs → correlate a request → export | filters, correlation, export audit |
| P7-E2E-ADM-08 | View-as a student | read-only, banner, mutation blocked, audit |
| P7-E2E-ADM-09 | Stats range and funnel | totals reconcile to records; no typed number |
| P7-E2E-ADM-10 | Suspend and reactivate an account | sessions revoked, access restored |

### 13.6 Support and moderation

| ID | Scenario | Assertions |
|---|---|---|
| P7-E2E-SUP-01 | Ticket → link order → reply → resolve | SLA, internal note separation |
| P7-E2E-SUP-02 | Join a support chat with consent | consent recorded, participant visible |
| P7-E2E-SUP-03 | Review a reported message → remove → warn | flag, reason, audit, user notice |
| P7-E2E-SUP-04 | Suspend messaging for spam | messages blocked, other access intact |
| P7-E2E-SUP-05 | Join a support call with consent | token issued, recording off, audit |
| P7-E2E-SUP-06 | Escalate to payment or trust and safety | assignment and SLA preserved |

---

## 14. Definition of done per phase

A phase is not done when the code compiles. It is done when the listed tests exist, pass, and are reported. A required test that is skipped or blocked means the phase is not done unless the orchestrator records a written waiver.

### Phase 0 — Foundation

- [ ] Vitest, `convex-test`, component harness, and coverage thresholds are configured.
- [ ] Fixture helpers and canonical identities exist; no production import of test fixtures.
- [ ] Schema inserts and indexes for identity, content, learning, credentials, commerce, communication, and operations.
- [ ] Role → capability mapping, including the full matrix in section 3.
- [ ] Student, teacher, admin, and multi-role scope tests.
- [ ] Seller entitlement from teacher profile and valid certificate.
- [ ] Certificate revocation removes scope.
- [ ] Admin cannot grade, submit, or sell.
- [ ] Suspended account, self-dealing, and IDOR baseline.
- [ ] Viewer resolution and forged-argument rejection.
- [ ] `/ruang` guard redirects without a session; no persona switcher exists.
- [ ] Production build without `CONVEX_URL` renders the landing page.
- [ ] No-mock-data-in-workspace test.
- [ ] `typecheck`, `lint`, `test`, `build` pass.

### Phase 1 — Admin core

- [ ] Every content group in section 6 has validation, preview, publish, schedule, and rollback coverage.
- [ ] Forbidden-label scan passes over public copy and the workspace placeholder sweep (P1-CMS-11).
- [ ] Concurrent edit lock and stale-version conflict.
- [ ] Media upload, variants, usage, replacement, deletion, and signed URL tests.
- [ ] Leads, notes, assignment, conversion, spam, bulk actions, export with audit.
- [ ] Accounts, invites, role append-only, suspend/reactivate, session revocation, impersonation limits.
- [ ] Teacher application approve/reject/suspend and public profile publish.
- [ ] Stats formulas in section 10.4, date range, breakdowns, funnel, CSV.
- [ ] All log tabs, filters, correlation, retention, redaction, immutability.
- [ ] Export job, signed link, expiry, CSV injection escape, audit.
- [ ] Break-glass access for teacher documents and account data; chat content access waits for Phase 4.
- [ ] `typecheck`, `lint`, `test`, `build` pass.

### Phase 2 — Learning

- [ ] Paths, modules, lessons, cohorts, capacity, schedule, timezone.
- [ ] Enrollment payment gate, duplicate, capacity, move, extend, withdraw, complete.
- [ ] Progress and attendance idempotency and scope.
- [ ] Submission types, limits, autosave, due dates, revision, private assets.
- [ ] Rubric weights, score bounds, feedback, override, second reviewer, history.
- [ ] Dispute lifecycle.
- [ ] Certificate issue, unique code, snapshot, public verification, revoke, reissue, QR/PDF.
- [ ] Certificate revocation removes seller scope; teacher suspension keeps issued certificates valid.
- [ ] Admin cannot grade or submit; teacher cannot grade own enrollment or work.
- [ ] `typecheck`, `lint`, `test`, `build` pass.

### Phase 3 — Commerce

- [ ] Work scope, moderation, permission, attribution, split preview, pause, sold-out.
- [ ] Guest checkout, token entropy, status page, claim, rate limits.
- [ ] Order lifecycle, payment gating, manual correction, buyer/seller/admin scope.
- [ ] Charge idempotency and unique amount contract against the gateway fake; pool exhaustion and quarantine remain gateway-owned.
- [ ] Settlement matching conditions, currency normalization, duplicate webhooks, late payment, expiry, clock skew.
- [ ] 70/15/15 split, gateway fee absorption, net revenue, GMV.
- [ ] Payout hold/release/reverse, statements, account re-verification.
- [ ] Refund full/partial, reversal, negative carry, paid-row immutability.
- [ ] Dispute lifecycle and decision audit.
- [ ] App contract tests against the pinned gateway fake; no live GoPay call.
- [ ] `typecheck`, `lint`, `test`, `build` pass.

### Phase 4 — Messaging and notifications

- [ ] Conversation types and membership derivation.
- [ ] Message types, replies, edits, soft delete, receipts, presence, search, link warnings.
- [ ] Voice note limits, signed upload, waveform, transcript, playback, moderation.
- [ ] Block, report, mute, rate limit, spam.
- [ ] Break-glass content access and audit.
- [ ] Notification outbox, retries, quiet hours, channel preferences, call reminders.
- [ ] Retention and redaction.
- [ ] `typecheck`, `lint`, `test`, `build` pass.

### Phase 5 — Calls

- [ ] Token endpoint capability, membership, availability, block, suspension.
- [ ] Consent, recording off by default, recording access and retention.
- [ ] No unsolicited calls; teacher own cohort; admin support with consent.
- [ ] Minors: age gate, guardian consent for 1:1, cohort preference, report review.
- [ ] Waiting room, 25-participant cap, screen share, device test.
- [ ] Audio-only fallback, media failure → chat/reschedule.
- [ ] Call state machine, participants, quality summary, idempotent end.
- [ ] Stubbed LiveKit integration test; the live smoke belongs to Phase 7.
- [ ] `typecheck`, `lint`, `test`, `build` pass.

### Phase 6 — Governance and hardening

- [ ] Flow definitions, transitions, guards, SLAs, auto-assignment, reminders, stuck list, override.
- [ ] Support inbox, links, canned responses, internal notes, escalation, consent join.
- [ ] Moderation actions and break-glass review.
- [ ] Exports for every domain; signed, expiring, audited.
- [ ] Privacy requests, retention holds, deletion/anonymization.
- [ ] Impersonation limits, feature flags, integration health, API keys.
- [ ] Admin MFA and MFA reset, with audit (P6-SEC-01, P6-SEC-02).
- [ ] Audit immutability and tamper rejection.
- [ ] Security suite extended and green across prior phases: auth, session, CSRF, rate limits, upload, webhook, SSRF, secrets, PII.
- [ ] Accessibility baseline on all routes; axe zero violations.
- [ ] `typecheck`, `lint`, `test`, `build` pass.

### Phase 7 — Launch

- [ ] E2E scenarios in section 13 pass for buyer, student, student-seller, teacher, admin, support.
- [ ] Axe zero violations on the full route matrix, desktop and mobile.
- [ ] Keyboard and screen-reader manual pass.
- [ ] Load targets: 10k MAU profile, 100 concurrent calls, 1k messages/minute, reconciliation window.
- [ ] Security adversarial suite and dependency/secret scan pass.
- [ ] One live small provider transaction against the merchant account, recorded; this is the only live provider test.
- [ ] LiveKit smoke on the chosen deployment, including TURN and fallback.
- [ ] Convex backup and restore drill within RPO 1 hour / RTO 4 hours for content and ledger.
- [ ] Media restore drill within RPO 24 hours.
- [ ] Content migration verified against the published site; rollback rehearsed.
- [ ] Incident response and launch runbook reviewed.
- [ ] All required tests pass or have an approved, written waiver.

---

## 15. Known risk register

| Risk | Impact | Detection | Mitigation | Owner |
|---|---|---|---|---|
| Unofficial provider endpoints change | Checkout and settlement fail | P3-PAY-40..55; gateway health; error alert | Provider adapter boundary; manual fallback; official adapter path | Phase 3 |
| No live provider test before launch | Settlement bug appears only in production | Phase 7 live transaction gate | One small live transaction; keep fake suite | Phase 7 |
| Refunds are manual | Slow or inconsistent refunds | P3-RFD-01..09; reconciliation report | Written manual procedure; ledger reversal; operator checklist | Phase 3 |
| DNS rebinding after webhook validation | SSRF to internal service | P7-SEC-27..29 | Egress firewall or allowlisted proxy; redirects off; resolve-and-pin where possible | Phase 3/7 |
| Clock skew beyond tolerance | Wrong expiry or settlement | P3-PAY-45, 46, 80..83 | NTP; configured skew; fail closed | Phase 3 |
| Unique amount pool exhaustion | Checkout blocked | P3-PAY-23, 24 | Retry message; pool monitoring; cleanup quarantine | Phase 3 |
| Gateway single instance / SQLite | Downtime or data loss | Health check; restart test | Named volume; one instance; backup; no horizontal scale | Phase 3/7 |
| LiveKit deployment or TURN failure | Calls fail | P5-CALL-06..14; health check | Audio-only then chat/reschedule; self-host or Cloud decision before Phase 5 | Phase 5 |
| Convex production deployment absent | Cannot run Phase 0 against real backend | Build-without-URL test; deployment checklist | Provision before Phase 0; local `convex-test` for development | Phase 0 |
| Content migration loses fields or copy | Public page regressions | P1-CMS-20..34; migration diff | Field map, dry run, revision snapshot, rollback | Phase 1/7 |
| Retention jobs delete needed evidence | Audit or legal gap | P7-SEC-43..46; retention report | Per-type policy; legal hold; dry-run counts | Phase 6/7 |
| Minor accesses a 1:1 call without consent | Safeguarding failure | P5-CALL-18..20 | Age gate; guardian consent; cohort preference; report review | Phase 5 |
| Admin break-glass misuse | Privacy breach | P0-ACC-60..66; P6-GOV-20..23 | Reason, scope, expiry, audit, review queue | Phase 0/6 |
| Audit log tampering | Trust and compliance failure | P1-LOG-06..07; P6-GOV-20..23 | Append-only API; no delete; tamper alert | Phase 1/6 |
| Test fixture or preview data reaches production | Fake data presented as real | P0-SHL live-data test; fixture boundary check | Deleted mock module; separate directories; CI import check | Phase 0 |
| E2E flakiness hides regressions | False confidence | Retry report; quarantine list | Deterministic fixtures; no sleeps; one retry with report | Phase 7 |
| CSV export formula injection | Operator workstation compromise | P1-EXP-04 | Escape leading formula characters; quote fields | Phase 1/6 |
| Secret in log or commit | Credential leak | P7-SEC-40..42, 49 | Redaction; secret scan; least-privilege keys | All |

---

## 16. Agent handoff protocol

### 16.1 Required report

Every phase agent reports the brief's template plus the test fields:

```text
Branch:
Commit:
Scope completed:
Files added/changed:
Tests added:
  - ID | file | title | status (pass/fail/skipped/blocked)
Test IDs covered:
New test IDs allocated:
Fixtures added or changed:
Commands and results:
Schema/capability changes:
Known risks:
Blocked items:
Skipped tests and reason:
Next phase handoff notes:
```

Rules:

- Report the exact command and the result. Do not claim a test, deployment, E2E run, or live provider check that did not happen.
- If a gate cannot run because credentials are absent, name the missing variable and run every test that can run.
- Link a failing or blocked test to its ID, file, and owner.
- A phase may not mark itself done with a required test unaccounted for.

### 16.2 Naming

- File names: `tests/<layer>/<domain>.test.ts` or `.test.tsx`; E2E `tests/e2e/<role>/<journey>.spec.ts`.
- Describe blocks: `describe("payments / settlement")`.
- Test titles: `it("[P3-PAY-40] settlement requires the exact unique amount")`.
- Behaviour first, implementation second. Never name a test after a private function.
- UI assertions use the visible Indonesian label; test names stay in English.
- No forbidden labels in test names, fixture copy, or example assertions.

### 16.3 Avoiding duplication

| Behaviour | Primary layer | Do not repeat in |
|---|---|---|
| Money formula, allocation, split | unit | integration/E2E beyond one display assertion |
| Permission and scope enforcement | Convex integration | component/E2E beyond route visibility |
| Component visibility by capability | component | E2E for every hidden button |
| Full role journey | E2E | unit/integration |
| Webhook signature and replay | unit + integration | E2E |
| Accessibility | axe + manual | unit snapshots |
| Provider protocol | gateway repo suite + app contract fake | app E2E against live provider |

Before adding a test:

1. Search this document for the behaviour and its ID.
2. Search `tests/` for the ID and the domain.
3. If the behaviour is already covered at the right layer, extend that test instead of creating a parallel one.
4. If the behaviour spans layers, test the seam once at the lower layer and the journey once at E2E.
5. Do not copy a fixture; import or extend the canonical pack.

### 16.4 Skipped, blocked, and quarantined tests

Use one annotation format:

```ts
// BLOCKED: <reason> | owner: <name> | issue: <link or ID> | expires: <date>
test.skip("[P5-CALL-18] ...", () => {})
```

Rules:

- `test.skip` requires a reason. A bare skip fails review.
- `test.todo` is allowed only for a requirement that is not yet in scope and must be listed in the handoff.
- No `.only`; CI rejects it.
- A quarantined E2E test keeps its ID, gets an owner and expiry, and does not count as passing.
- A blocked required test blocks the phase DoD unless the orchestrator records a waiver in the handoff.
- Never delete a failing test to make a phase green. Fix it, block it with a reason, or report the conflict.

### 16.5 Handoff checklist

- [ ] Every required ID for the phase exists and has a result.
- [ ] New IDs are listed with file and title.
- [ ] Fixtures changed are listed; no cross-phase pack rewrite.
- [ ] `typecheck`, `lint`, `test`, `build` results are exact.
- [ ] Skipped or blocked tests have owner, reason, and expiry.
- [ ] Security, accessibility, and retention impacts are stated.
- [ ] Schema, capability, and shared-file changes are called out for the orchestrator.
- [ ] Next phase knows which tests are its responsibility and which are already covered.

---

## Appendix A — Required test file map

| Area | Unit | Integration | Component / E2E |
|---|---|---|---|
| Access | `tests/unit/access-policy.test.ts` | `tests/convex/access.test.ts` | `tests/component/capability-gating.test.tsx` |
| Auth | `tests/unit/session.test.ts` | `tests/convex/auth.test.ts` | `tests/e2e/auth.spec.ts` |
| Schema | — | `tests/convex/schema.test.ts` | — |
| Content | `tests/unit/content-validation.test.ts` | `tests/convex/content.test.ts` | `tests/component/content-editor.test.tsx`, `tests/e2e/admin-content.spec.ts` |
| Media | `tests/unit/media-policy.test.ts` | `tests/convex/media.test.ts` | `tests/component/media-picker.test.tsx` |
| Leads | `tests/unit/lead-validation.test.ts` | `tests/convex/leads.test.ts` | `tests/e2e/admin-leads.spec.ts` |
| Learning | `tests/unit/learning-rules.test.ts` | `tests/convex/learning.test.ts` | `tests/e2e/student.spec.ts` |
| Submissions | `tests/unit/submission-rules.test.ts` | `tests/convex/submissions.test.ts` | `tests/e2e/student-submit.spec.ts` |
| Assessments | `tests/unit/rubric.test.ts` | `tests/convex/assessments.test.ts` | `tests/e2e/teacher-grade.spec.ts` |
| Certificates | `tests/unit/certificate-code.test.ts` | `tests/convex/certificates.test.ts` | `tests/e2e/verify.spec.ts` |
| Money | `tests/unit/money.test.ts` | `tests/convex/payments.test.ts` | `tests/e2e/buyer.spec.ts` |
| Orders | `tests/unit/order-rules.test.ts` | `tests/convex/commerce.test.ts` | `tests/e2e/buyer.spec.ts` |
| Payouts | `tests/unit/payout-rules.test.ts` | `tests/convex/payouts.test.ts` | `tests/e2e/admin-payout.spec.ts` |
| Refunds | `tests/unit/refund-rules.test.ts` | `tests/convex/refunds.test.ts` | `tests/e2e/admin-refund.spec.ts` |
| Messaging | `tests/unit/message-policy.test.ts` | `tests/convex/messaging.test.ts` | `tests/e2e/chat.spec.ts` |
| Calls | `tests/unit/call-policy.test.ts` | `tests/convex/calls.test.ts` | `tests/e2e/call.spec.ts` |
| Notifications | `tests/unit/notification-rules.test.ts` | `tests/convex/notifications.test.ts` | `tests/e2e/notifications.spec.ts` |
| Stats | `tests/unit/metrics.test.ts` | `tests/convex/stats.test.ts` | `tests/e2e/admin-stats.spec.ts` |
| Flows | `tests/unit/flow-table.test.ts` | `tests/convex/flows.test.ts` | `tests/e2e/admin-flows.spec.ts` |
| Support | `tests/unit/support-rules.test.ts` | `tests/convex/support.test.ts` | `tests/e2e/support.spec.ts` |
| Security | `tests/security/*.test.ts` | `tests/convex/security.test.ts` | `tests/e2e/security/*.spec.ts` |
| Accessibility | — | — | `tests/e2e/a11y/*.spec.ts` |
| Load | — | — | `tests/load/*.js` |

Phase 0 owns the config and the first access/auth/schema files. Each later phase owns its domain files and may add files, not rename another phase's.

## Appendix B — Assumptions and gaps

These are test-plan decisions where the product plan is silent. Each needs product or orchestrator confirmation before it becomes a hard requirement.

| # | Gap | Current test assumption |
|---|---|---|
| 1 | Split rounding for non-divisible amounts | Residue to the community fund; one shared function; sum exact |
| 2 | Enrollment completion rule | Defined in the Phase 2 flow definition; test reads the definition, not a hardcoded count |
| 3 | Support role | No fourth stored role; support is an admin duty/assignment |
| 4 | Suspension semantics | Sessions revoked; mutations, messaging, and calls blocked; read-only account access may remain |
| 5 | Impersonation target | Admin cannot impersonate another admin; all impersonation is read-only |
| 6 | Submission upload limits | Read from `settings`; the test asserts the configured value, not a guessed constant |
| 7 | Rubric score scale | Defined by the rubric record; the test asserts bounds and weights, not a fixed 0–100 |
| 8 | Component test dependency | Phase 0 adds Testing Library and jsdom with justification; if rejected, component coverage moves to Phase 7 and is marked blocked |
| 9 | Load tool | k6 preferred; Phase 7 records the final choice in the runbook |
| 10 | E2E provider and LiveKit | Fake gateway and local/stubbed LiveKit; one manual live provider check and one LiveKit smoke at launch |
| 11 | Retention defaults | Plan defaults: chat/voice 2 years, call metadata 2 years, recordings 30 days, moderation evidence 1 year; legal review may change them |
| 12 | Late-payment handling | Queued for manual reconciliation; never auto-settled |
| 13 | Boundary inclusivity | Payment window boundaries are inclusive; ±1 ms outside is rejected |
| 14 | Convex test location | Tests live in `tests/convex` so runtime bundling stays clean; `convex/test` holds data helpers only |
| 15 | CI workflow ownership | Phase 0 extends `ci.yml`/`docker-release.yml`; the test plan states the gate, the phase owns the edit |
| 16 | Existing preview placeholder copy | `components/workspace/*` currently contains placeholder copy that uses a forbidden label; Phase 1 must replace it before the P1-CMS-11 scan becomes a PR gate. Record the sweep in the handoff. |
| 17 | Existing `siteContent.value` validator | The current schema stores the content object as a generic value. Phase 0/1 must define typed content validation or record an approved boundary exception; P0-SCH-01 stays open until then. |
