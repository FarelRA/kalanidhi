# KalaNidhi Workspace — Full Product & Dashboard Plan

**Status:** proposal, v1.0  
**Scope:** all roles, all surfaces, one workspace  
**Companion:** [payments-gateway.md](./payments-gateway.md) — pending `merchantid` fork audit

---

## 1. Product model

KalaNidhi is one closed loop:

```text
Belajar → dinilai pengajar → sertifikat platform + Kartu Karya
        → berkarya / berjasa → kembali mengajar, menilai, atau memasok
        → jalur baru lahir
```

The workspace is not three separate dashboards. It is **one authenticated workspace** where role and entitlement decide what appears and what can be done.

```text
/masuk
  └─ session
       └─ /ruang
            ├─ same shell
            ├─ same navigation registry
            ├─ same components
            └─ capabilities decide:
                 · nav items
                 · data scope
                 · action slots
                 · overview widgets
```

### 1.1 Stored roles

```ts
roles: ("student" | "teacher" | "admin")[]
```

Roles are additive. A teacher taking a new path is also a student. No account migration, no mode switch.

### 1.2 Earned entitlements

```ts
learn   = hasRole("student") || hasActiveEnrollment
teach   = hasRole("teacher") && teacherProfile.status === "active"
assess  = teach && hasAssessmentAssignment(pathId)
sell    = teach || hasValidCertificate(pathId)
operate = hasRole("admin")

sellActive = sell && sellerProfile.status === "active"
```

`buy` is **not** role-gated. Everyone can buy, including guests.

### 1.3 Four visible states

| State | Roles | Entitlements | Surface |
|---|---|---|---|
| **Peserta** | `student` | `learn` | Belajar, Tugas, Kredensial |
| **Peserta · Penjual** | `student` | `learn` + `sell` | + Menjual, Pesanan, Pendapatan |
| **Pengajar · Penjual** | `teacher` | `teach` + `assess` + `sell` | + Mengajar, Penilaian, Kredensial kohort |
| **Pengelola** | `admin` | `operate` | Semua data, konten, statistik, log, alur |

Seller is an **earned, path-scoped entitlement**, never a stored role. Certificate revocation removes the scope automatically.

Institutions are **buyers and leads**, not a workspace role. An institution can request a quote, buy a cohort, or commission a service; its contact and orders live in the CRM and order tables, not in a fourth dashboard.

### 1.4 Seller scope

```ts
sellScopes = union(
  teacherProfile.pathIds,
  validCertificates.map(c => c.pathId)
)
```

Every work card carries `pathId` and, for student sellers, `certificateId`. The server checks `assertCanSell(viewer, pathId)` before listing.

A certificate in Batik Tulis Soga never authorizes selling pranatacara services.

---

## 2. Non-negotiable rules

1. **One admin plane.** `/ruang` is the control tower. No second admin app.
2. **Admin does not grade silently.** Admin can read, reassign, escalate, and override only with a reason and audit.
3. **Financial ledger is append-only.** Corrections are reversal entries, never edits.
4. **Certificate is a platform certificate.** Never government or BNSP language.
5. **70 / 15 / 15 is computed by the system.** Admin sees it, cannot edit it per transaction.
6. **Seller access is scoped by path.** No scope, no listing.
7. **Buying is universal.** Guest checkout is allowed; a buyer is a relationship, not a role.
8. **Sensitive data is break-glass.** Admin has access, but chat content, call recordings, and identity documents require a reason and are logged.
9. **No invented metrics.** Every number comes from a record.
10. **No raw database editor in production.** Admin edits through validated domain actions, not free-form SQL.

---

## 3. Route map

### Public

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/karya/[slug]` | Public work detail |
| `/pesan/[slug]` | Guest checkout |
| `/pesanan/[token]` | Guest order status and payment |
| `/verifikasi/[kode]` | Public certificate and Kartu Karya verification |
| `/masuk` | Sign in |
| `/daftar` | Student registration |

### Workspace — one tree

| Route | Capability | Student | Teacher | Admin |
|---|---|---|---|---|
| `/ruang` | authenticated | Ringkasan belajar | Ringkasan mengajar | Command center |
| `/ruang/belajar` | `learn` / `cohorts.read.all` | Jalur & progres | Kohort saya | Semua jalur & kohort |
| `/ruang/tugas` | `submissions.*` | Tugas saya | Antrean penilaian | Semua tugas + eskalasi |
| `/ruang/kredensial` | `certificates.*` | Sertifikat saya | Sertifikat kohort | Registry + cabut |
| `/ruang/karya` | `works.*` | Karya saya | Karya peserta | Moderasi |
| `/ruang/pesanan` | `orders.*` | Pembelian + penjualan | Pendapatan | Semua pesanan |
| `/ruang/pesanan/pembayaran` | `payments.manage` | — | — | Payment intents, reconciliation |
| `/ruang/pesanan/payout` | `payouts.release` | — | Pendapatan saya | Payout ledger |
| `/ruang/pesan` | `messages.read.own` | Chat | Chat | Moderasi |
| `/ruang/panggilan` | `calls.*` | Panggilan | Panggilan | Support/monitoring |
| `/ruang/jadwal` | `schedule.*` | Jadwal | Ketersediaan | Semua jadwal |
| `/ruang/prospek` | `leads.*` | — | — | CRM |
| `/ruang/orang` | `people.read` | — | Profil publik | Accounts, roles, verification |
| `/ruang/konten` | `content.publish` | — | — | Full landing CMS |
| `/ruang/statistik` | `stats.read` | — | — | All metrics |
| `/ruang/alur` | `flows.manage` | — | — | State machines, SLAs, automation |
| `/ruang/log` | `logs.read` | — | — | All logs |
| `/ruang/dukungan` | `support.*` | Support | Support | Support inbox |
| `/ruang/tata-kelola` | `governance.manage` | — | — | Permissions, takedown, audit |
| `/ruang/pengaturan` | authenticated | Profil | Profil + rekening | Platform settings |

Nav is generated from this table. Direct access to a route without the capability returns 403 or redirects to `/ruang`.

Navigation groups — **Belajar**, **Mengajar**, **Menjual**, **Kelola** — are derived from entitlements and point into the same resource routes. There are no `/admin`, `/pengajar`, or `/siswa` route prefixes.

---

## 4. Shared shell and components

One shell, one visual language, no role-specific themes.

### Shell

- Desktop: deep teak rail, cream canvas, copper active tag.
- Mobile: bottom bar with five primary destinations plus “Lainnya”.
- Top bar: breadcrumb, global search (`⌘K`), notifications, account menu.
- Role tag: derived label only — `Peserta`, `Peserta · Penjual`, `Pengajar · Penjual`, `Pengelola`.

### Shared components

| Component | Used by |
|---|---|
| `WorkspaceShell` | All |
| `PageHeader` | All |
| `FilterBar` | All tables |
| `DataTable` | All lists |
| `StatusStamp` | All states |
| `QueueList` | Grading, leads, payouts, support |
| `MetricRuler` | Stats, overview |
| `DetailDrawer` | Records |
| `ActionMenu` | Capability-gated actions |
| `EmptyState` | All |
| `ActivityFeed` | Audit, record timelines |
| `MediaPicker` | Content, works, submissions |
| `RichTextField` | Content and feedback |
| `ConfirmWithReason` | Destructive actions |
| `BreakGlassDialog` | Sensitive data access |
| `CallRoom` | Voice/video calls |
| `VoiceRecorder` | Chat and feedback |

### Composition rule

Components never check `role === "admin"`. They check capabilities:

```tsx
{viewer.can("leads.write") && <AssignLeadButton />}
```

The same `OrderTable` renders:

- buyer: own purchases
- seller: own sales
- admin: all orders, payments, payouts

---

## 5. Capability matrix

| Capability | Student | Teacher | Admin |
|---|---|---|---|
| `learn` | ✓ | if enrolled | — |
| `teach` | — | ✓ | — |
| `assess` | — | ✓ scoped | — |
| `sell` | with valid certificate | ✓ scoped | — |
| `buy` | ✓ | ✓ | ✓ |
| `messages.read.own` | ✓ | ✓ | ✓ |
| `messages.moderate` | — | — | ✓ break-glass |
| `calls.start` | ✓ scoped | ✓ scoped | ✓ support |
| `submissions.submit` | ✓ own | — | — |
| `submissions.grade` | — | ✓ own cohorts | — |
| `submissions.escalate` | — | — | ✓ |
| `certificates.read.own` | ✓ | ✓ cohort | ✓ all |
| `certificates.revoke` | — | request | ✓ with reason |
| `orders.read.own` | ✓ buyer/seller | ✓ seller | ✓ all |
| `payments.manage` | — | — | ✓ |
| `payouts.release` | — | — | ✓ |
| `leads.read/write` | — | — | ✓ |
| `people.read` | — | public profile | ✓ all |
| `people.manage` | — | — | ✓ |
| `content.publish` | — | — | ✓ |
| `stats.read` | — | own teaching | ✓ all |
| `flows.manage` | — | — | ✓ |
| `logs.read` | — | — | ✓ |
| `governance.manage` | — | — | ✓ |
| `settings.platform` | — | — | ✓ |

Admin does **not** inherit `submissions.grade` or `submissions.submit`. Separation of duties is explicit.

---

## 6. Admin workspace

Admin has:

- all business data, with sensitive content behind break-glass
- all logs
- all landing-page editing
- all accounts and roles
- all statistics
- all flows and state machines
- all moderation and support tools

No raw database editor. All writes go through validated mutations.

### 6.1 Command center — `/ruang`

**Today board**

- Lead baru
- Pengajuan pengajar
- Tugas menunggu penilaian
- Tugas melewati SLA
- Sertifikat terbit bulan ini
- Karya menunggu tinjauan
- Pesanan menunggu pembayaran
- Payout jatuh tempo
- Refund/dispute terbuka
- Gateway health
- Support backlog

**Panels**

- `Perlu keputusan`: teacher applications, certificate revocations, work moderation, payout holds, refunds
- `Antrean hari ini`: sorted by age, owner, next action
- `Aktivitas terakhir`: audit feed
- `Kesehatan sistem`: payment gateway, webhook delivery, email/WhatsApp, LiveKit, error rate
- Quick actions: invite admin, verify teacher, publish content, open payment reconciliation

Each panel links to the full filtered record list.

### 6.2 Accounts and identity — `/ruang/orang`

- Search every account by name, email, WhatsApp, role, region, status.
- Account detail: roles, entitlements, teacher profile, seller profile, enrollments, certificates, works, orders, calls, messages metadata, sessions, login history.
- Actions:
  - invite admin or teacher
  - assign/remove roles
  - suspend/reactivate
  - reset MFA
  - revoke sessions
  - anonymize/delete with retention rules
  - view as user (read-only impersonation with banner and audit)
- Role assignments are append-only records with actor, reason, timestamp.
- Payout account changes require re-verification and audit.

### 6.3 People and teacher verification

Tabs: **Pengguna**, **Pengajar**, **Tim**.

Teacher dossier:

- identity and contact
- region and community
- specialty and proposed paths
- experience
- permission document
- portfolio and references
- verification checklist

Actions:

- approve → create/update public `teachers` record, publish profile
- reject → reason, applicant can revise
- suspend → unpublish profile, freeze new cohorts, keep issued certificates valid

### 6.4 Leads / CRM — `/ruang/prospek`

Saved views: **Baru**, **Perlu dihubungi**, **Institusi**, **Selesai**, **Spam**.

- Table: intent, name, contact, interest, age, owner, status.
- Drawer: full message, timeline, notes, assignment, follow-up date, WhatsApp/email links.
- Convert to student invite or institution quote.
- Bulk assign, export, mark spam.
- Every export is logged.

### 6.5 Learning operations — `/ruang/belajar`

- Paths: status, teacher, price, modules, active cohorts, completion.
- Cohorts: roster, capacity, schedule, progress, at-risk students.
- Enrollment detail: payment, progress, submissions, certificate, seller state.
- Actions: create cohort, assign teacher, move enrollment, extend deadline, withdraw with reason.
- Admin cannot submit or grade.

### 6.6 Assessment and disputes — `/ruang/tugas`

- Queue by teacher, age, SLA, path.
- Submission detail: evidence, rubric, assessment history, messages.
- Admin actions: reassign, nudge, escalate, open dispute, resolve dispute.
- Score changes are never silent. A formal override requires a reason, a second reviewer for high-impact cases, and an audit record.
- Dispute states: `open → reviewing → resolved → closed`.

### 6.7 Credentials — `/ruang/kredensial`

- Registry searchable by serial, public code, name, path, teacher.
- Certificate detail: student, path, assessment, issue date, status, Kartu Karya.
- Revoke with reason; public verification immediately shows “dicabut”.
- Reissue creates a new code; old code becomes `replaced`.
- Preview public verification exactly as a buyer sees it.
- Export registry.

### 6.8 Works and commerce — `/ruang/karya`

- Moderation queue: maker, teacher, path scope, technique, permission, attribution, price, split preview.
- Publish/unpublish with reason.
- Work detail: images, provenance, certificate, orders, refunds.
- Bulk pause for takedown or permission expiry.

### 6.9 Payments, payouts, refunds — `/ruang/pesanan`

Tabs: **Pesanan**, **Pembayaran**, **Payout**, **Refund & Sengketa**.

**Pesanan**

- All orders, buyer, seller, amount, status, age.
- Manual status correction with reason.
- Link to buyer, seller, work, payment, payout.

**Pembayaran**

- Payment intents: order, provider, provider reference, unique amount, expiry, status.
- Reconciliation queue: unmatched transfers, duplicate amounts, late payments, expired QR with payment.
- Gateway health: session valid, last successful poll, error streak, pending intents.
- Manual match with reason and audit.
- Provider adapter can be GoPay unofficial now, official provider later.

**Payout**

- Ledger rows: 70% teacher, 15% platform, 15% community fund.
- States: `pending → held → approved → paid → reversed`.
- Release, hold, reverse; require reason for hold/reversal.
- Export statements per teacher and per period.
- Gateway fee is absorbed by the platform share; the 70/15/15 promise is on gross.

**Refund & Sengketa**

- Refund request, evidence, decision, reversal entries.
- If payout already released, create a negative balance carried to the next payout.
- Never edit a paid ledger row.

### 6.10 Content CMS — `/ruang/konten`

The admin can edit **every field** that appears on the landing page.

**Editor groups**

1. Hero
2. Traction figures
3. Loop
4. Catalog
5. Mangsa
6. Ethics and share
7. Institution
8. Section copy
9. Footer and newsletter
10. Navigation
11. Overlays
12. Header
13. Search
14. Mobile CTA
15. Lead dialogs
16. Metadata and SEO
17. Entities: catalog fields, paths, teachers, works, testimonials, FAQs

Appendix A lists the full field map.

**Publishing**

- Draft → preview → publish.
- Preview token, desktop/mobile preview, section anchors.
- Scheduled publish.
- Revision history with diff and rollback.
- Optimistic concurrency: warn if another admin edited the same record.
- Publish requires `content.publish`; sensitive changes require confirmation.

**Validation**

- Shared Zod schemas generated from `lib/content/types.ts`.
- Required fields, URL validation, image dimensions, alt text.
- No raw HTML injection; markdown is rendered through a safe renderer.
- Link checker and broken-image checker before publish.

**Media library**

- Convex storage; images, audio, video.
- Alt text, caption, credit, permission, focal point.
- Variants for responsive images.
- Usage list: where each asset appears.
- Replace asset without changing references.

**SEO and routing**

- Title, description, OG/Twitter, canonical, keywords.
- Robots and sitemap settings.
- Redirects manager with hit counts.
- Structured data preview.
- 404 monitoring.

### 6.11 Communication moderation — `/ruang/pesan`

- Admin sees conversation metadata by default; content requires break-glass.
- Flags: reported message, blocked user, spam, attachment issue.
- Actions: warn, mute, suspend messaging, remove message, close conversation, escalate to support.
- Every break-glass access, export, or deletion is logged.
- Call recordings: default off; admin can review only with consent and reason.

### 6.12 Statistics — `/ruang/statistik`

All metrics are computed from records. Definitions live in one place. Admin can configure the definition set and date boundaries, but cannot type a number directly into a stat.

| Metric | Definition |
|---|---|
| Lead conversion | converted leads ÷ qualified leads, period |
| Enrollment activation | paid enrollments ÷ created enrollments |
| Completion | completed enrollments ÷ active enrollments |
| Submission rate | submitted tasks ÷ expected tasks |
| Assessment SLA | p50/p90 hours from submit to first feedback |
| Pass rate | approved assessments ÷ assessed submissions |
| Certificate issuance | issued certificates ÷ approved assessments |
| Seller activation | first published listing within 30 days of certificate |
| GMV | paid order gross, before refunds |
| Net revenue | GMV − refunds − gateway fees |
| Payout due | approved but unpaid payouts |
| Teacher load | active students per teacher |
| Cohort fill | enrolled ÷ capacity |
| Support first response | p50/p90 minutes |
| Gateway success | paid charges ÷ created charges |
| Content freshness | days since last publish per section |

Views:

- Date range and comparison.
- Cohort, path, teacher, region.
- Funnel: visitor → lead → enrollment → submission → assessment → certificate → first sale → repeat.
- Export CSV.
- No page-view claims unless a real analytics source exists.

### 6.13 Flows — `/ruang/alur`

Admin can inspect and configure the state machines that run the product.

For each flow:

- current states and allowed transitions
- guards and required roles
- SLA thresholds
- auto-assignment rules
- reminder and escalation rules
- notification templates
- stuck-record list, sorted by age
- manual override with reason and audit

Flows:

- lead
- teacher application
- enrollment
- submission
- assessment
- certificate
- work card
- order
- payment
- payout
- refund/dispute
- call
- support ticket
- content publish

This is configuration, not arbitrary code. No drag-and-drop script builder in v1.

### 6.14 Logs and observability — `/ruang/log`

One log explorer with tabs:

- **Audit** — every admin and system action, before/after, reason.
- **Auth** — logins, failures, MFA, session revocations, impersonation.
- **Payments** — charges, webhooks, reconciliation, refunds.
- **Notifications** — email, WhatsApp, push, retries.
- **Calls** — starts, ends, participants, quality, recordings.
- **Moderation** — flags, actions, break-glass access.
- **Content** — revisions, publishes, rollbacks.
- **API** — request ID, route, actor, status, latency.
- **Errors** — stack trace, request ID, release.

Features:

- filter by actor, entity, action, severity, date, request ID
- detail drawer with correlated events
- export with audit
- retention policy per log type
- alert rules

Audit logs are append-only. No admin can delete them.

### 6.15 Support — `/ruang/dukungan`

- Inbox with priority, assignee, SLA.
- Link ticket to account, order, payment, enrollment, certificate.
- Canned responses.
- Internal notes separate from user messages.
- Escalate to payment, content, or trust and safety.
- Support can join a chat or call with consent.

### 6.16 Settings, integrations, flags — `/ruang/pengaturan`

- Admin team and invitations.
- Role and capability reference.
- SLA thresholds.
- Notification templates.
- Regions and timezone.
- Feature flags: seller, calls, recordings, new content sections.
- Integrations: payment gateway, email, WhatsApp (Waha), LiveKit, storage.
- Webhook endpoints and signing secrets.
- API keys with scopes and rotation.
- Maintenance mode and public banner.
- 70/15/15 display only, with explanation.

### 6.17 Data, privacy, impersonation

- Export any domain as CSV/JSON through an async job.
- Signed download links, expiry, audit.
- Privacy requests: access, correction, deletion, retention hold.
- Impersonation is read-only by default, shows a persistent banner, and cannot perform destructive actions.
- Break-glass access requires a reason and is visible in the audit log.
- Admin cannot access their own financial records for approval or refund.

### 6.18 Admin acceptance criteria

- Find any account, order, certificate, or content record in under 10 seconds.
- Edit every landing field without a developer.
- See every log type with filters and correlation.
- Resolve a stuck assessment, payment, payout, or refund without leaving `/ruang`.
- Every destructive action requires a reason and is reversible or compensated.
- No admin screen exposes a raw database write.
- Every sensitive access is logged.

---

## 7. Student workspace

### 7.1 Ringkasan

- Next lesson and deadline.
- Tasks waiting, feedback received.
- Certificate progress.
- Upcoming call or cohort session.
- Unread messages.
- Purchases and sales.

### 7.2 Belajar

- Enrolled paths and progress.
- Modules, lessons, materials, estimated time.
- Attendance and cohort schedule.
- Downloadable resources with access level.
- Completion state.

### 7.3 Tugas

- Task list with due dates and status.
- Submit text, file, image, audio, or video.
- Draft autosave.
- Feedback thread with teacher.
- Revision requests.
- Rubric and score after release.
- Appeal/dispute action.

### 7.4 Kredensial

- Certificate and Kartu Karya.
- Public verification link and QR.
- Download PDF.
- Status: issued, revoked, replaced.
- Seller scope unlocked by each certificate.

### 7.5 Menjual

Visible only when `sellActive`.

- Onboarding checklist: payout account, consent, first work card, tax details.
- Seller scope: certified paths.
- Create work or service listing.
- Upload images, technique, materials, price, unit.
- Teacher confirmation and admin moderation states.
- Orders, earnings, payouts, refunds.

### 7.6 Pesanan

- **Pembelian** — orders, payment status, receipts, refunds.
- **Penjualan** — seller orders, earnings, payout status.
- Guest orders claimed by verified email appear here.

### 7.7 Pesan dan panggilan

- Chat with assigned teacher, cohort, and support.
- Voice notes with waveform and transcript.
- Voice call and video call during office hours or scheduled sessions.
- Block and report.
- Notification preferences.

### 7.8 Jadwal

- Cohort sessions.
- Teacher office hours.
- Scheduled calls.
- Add to calendar.
- Timezone-aware.

### 7.9 Profil

- Name, photo, region, bio.
- Contact and consent.
- Payout account (if seller).
- Notification preferences.
- Data export and deletion request.
- Session and device list.

---

## 8. Teacher workspace

### 8.1 Ringkasan

- Grading queue and SLA.
- Upcoming sessions and calls.
- Student alerts: inactive, overdue, at risk.
- Earnings and payout due.
- Unread messages.

### 8.2 Mengajar

- Cohorts assigned.
- Roster with progress and last activity.
- Session schedule.
- Attendance.
- At-risk students.
- Cohort completion.

### 8.3 Penilaian

- Queue by age, path, cohort.
- Submission evidence.
- Rubric scoring.
- Text, voice, or video feedback.
- Request revision.
- Approve → certificate auto-issued.
- Escalate or dispute.
- Cannot grade own enrollment or own work.

### 8.4 Peserta

- Student profile scoped to own cohorts.
- Progress, submissions, certificates, works.
- Message or schedule a call.
- No access to other teachers’ students.

### 8.5 Konten

- Lesson materials and assignments for own cohorts.
- Rubric templates.
- Draft and publish within assigned paths.
- Admin review for path-level changes.

### 8.6 Ketersediaan

- Weekly office hours.
- Call slots and duration.
- Timezone.
- Buffer between calls.
- Temporary pause.

### 8.7 Pendapatan

- 70% share per order.
- Payout statements.
- Pending, held, paid.
- Refund adjustments.
- Download CSV.

### 8.8 Pesan dan panggilan

- Chat with students in own cohorts.
- Voice notes.
- Voice/video calls.
- Group cohort calls.
- Block/report.
- No unsolicited calls outside availability.

### 8.9 Profil publik

- Public teacher profile.
- Specialty, region, community, paths.
- Preview and publish request.
- Admin verification status.

---

## 9. Communication and real-time

### 9.1 Chat

Conversation types:

- `direct` — student ↔ teacher, scoped to enrollment/cohort.
- `cohort` — teacher + enrolled students.
- `support` — user ↔ support; admin can join.
- `system` — automated notices.

Features:

- text, voice note, image, file, system event
- replies, edits, soft delete
- read receipts, typing indicator, presence
- mute, block, report
- rate limits and spam checks
- link previews disabled by default; warn on external links
- message search scoped to conversation
- retention policy

Permissions:

- members only
- admin sees metadata by default; content requires break-glass
- support can join only with user consent or explicit request

### 9.2 Voice notes

- Browser `MediaRecorder`.
- Audio-only, Opus/WebM preferred, max 10 minutes, max 25 MB.
- Upload to Convex storage with signed upload URL.
- Message stores asset ID, duration, waveform peaks, MIME, size.
- Inline playback, seek, speed.
- Transcript optional; if enabled, stored as text and searchable.
- Accessibility: transcript or summary required for required course feedback.
- Moderation: flag, remove, retain per policy.

### 9.3 Voice and video calls

Use **LiveKit** as the real-time media layer.

- 1:1 calls: audio or video.
- Cohort calls: up to 25 participants in v1.
- Screen share.
- Waiting room and lobby.
- Device test before join.
- Bandwidth adaptation; audio-only fallback.
- TURN included; self-hosted LiveKit on Nodus with Redis, or LiveKit Cloud for the pilot if ops capacity is limited.
- Server issues short-lived room tokens; no secrets in the browser.
- Call record in Convex: room, initiator, participants, kind, status, timestamps, quality summary.
- Recording: default off; requires both parties’ consent; stored with retention and access policy.
- Calls can be scheduled from a conversation or office hours.
- No unsolicited calls: student can call teacher only during availability or an accepted invitation; teacher can call student in own cohort; admin can join support calls with consent.
- Safeguarding: age gate at registration; for minors, guardian consent is required for 1:1 calls, and cohort calls are preferred. Any report triggers moderation review. Recording remains off by default.
- Failure: if media fails, fall back to audio-only, then chat/reschedule.

### 9.4 Presence and notifications

- In-app notifications.
- Email via provider adapter.
- WhatsApp via existing Waha service.
- Push via PWA later.
- Outbox pattern with retries and delivery logs.
- Quiet hours and per-channel preferences.
- Call reminders 10 minutes before.

### 9.5 Communication data model

```text
conversations
conversationMembers
messages
messageAssets
messageReceipts
messageFlags
blocks
callSessions
callParticipants
callEvents
notificationOutbox
```

Retention:

- chat: configurable, default 2 years
- voice notes: same as chat
- call metadata: 2 years
- recordings: 30 days unless legal hold
- moderation evidence: 1 year

---

## 10. Data model

### Identity

| Table | Purpose |
|---|---|
| `users` | auth identity, profile, roles, status |
| `roleAssignments` | append-only role grants |
| `invites` | admin/teacher invitations |
| `sessions` | device and session management |
| `consents` | privacy, recording, marketing |
| `payoutAccounts` | verified seller payout details |

### Content

| Table | Purpose |
|---|---|
| `siteContent` | published landing copy |
| `contentRevisions` | drafts, published versions, diffs |
| `mediaAssets` | images, audio, video, credits |
| `catalogFields` | cultural fields and readiness |
| `paths` | learning paths |
| `pathModules` | curriculum modules |
| `lessons` | lessons and materials |
| `teachers` | public teacher profiles |
| `works` | public works and services |
| `testimonials` | participant notes |
| `faqs` | questions |
| `redirects` | URL redirects |
| `seoOverrides` | per-route SEO |

### Learning

| Table | Purpose |
|---|---|
| `cohorts` | path run by a teacher |
| `cohortSessions` | scheduled sessions |
| `enrollments` | student ↔ cohort/path |
| `lessonProgress` | completion and attendance |
| `submissions` | task evidence |
| `submissionAssets` | uploaded evidence |
| `assessments` | rubric, score, feedback |
| `assessmentEvents` | revisions, overrides, disputes |
| `disputes` | assessment and order disputes |

### Credentials

| Table | Purpose |
|---|---|
| `certificates` | serial, public code, snapshot, status |
| `certificateEvents` | issue, revoke, replace |
| `workCards` | Kartu Karya and provenance |

### Commerce

| Table | Purpose |
|---|---|
| `orders` | buyer, seller, work, amount, status |
| `orderItems` | line items |
| `payments` | provider intent, unique amount, status |
| `paymentEvents` | provider events and reconciliation |
| `payouts` | 70/15/15 ledger |
| `refunds` | refund requests and decisions |
| `ledgerEntries` | append-only financial entries |

### Communication

| Table | Purpose |
|---|---|
| `conversations` | direct, cohort, support, system |
| `conversationMembers` | membership, read state, mute |
| `messages` | text, voice, file, call event |
| `messageAssets` | uploads |
| `messageReceipts` | delivered/read |
| `messageFlags` | reports and moderation |
| `blocks` | user blocks |
| `callSessions` | LiveKit room record |
| `callParticipants` | join/leave |
| `callEvents` | ringing, accepted, ended, quality |
| `callRecordings` | consent, asset, retention, access log |

### CRM and operations

| Table | Purpose |
|---|---|
| `leads` | inquiries |
| `leadNotes` | notes and follow-ups |
| `leadAssignments` | ownership |
| `supportTickets` | support inbox |
| `supportMessages` | thread |
| `auditLogs` | append-only admin actions |
| `authLogs` | login and session events |
| `webhookDeliveries` | outbound webhook attempts |
| `notificationOutbox` | email/WhatsApp/push queue |
| `featureFlags` | staged rollout |
| `settings` | platform configuration |
| `integrationHealth` | gateway, email, WhatsApp, LiveKit |
| `dailyMetrics` | materialized daily aggregates |
| `metricDefinitions` | metric name, formula, owner, version |
| `flowDefinitions` | state machine per domain |
| `flowTransitions` | allowed states, guards, SLA |
| `slaPolicies` | thresholds and escalation rules |
| `automationRules` | assignment, reminders, auto-actions |
| `notificationTemplates` | email, WhatsApp, in-app copy |
| `apiKeys` | scoped integration keys |
| `webhookEndpoints` | outbound endpoints and secrets |
| `privacyRequests` | access, correction, deletion, hold |
| `impersonationSessions` | actor, target, reason, expiry |
| `contentLocks` | concurrent editing guard |

Indexes are designed for the actual queries: by user, role, status, date, path, cohort, teacher, order, payment, certificate, conversation.

---

## 11. State machines

| Entity | States | Key transitions |
|---|---|---|
| Lead | new → contacted → qualified → converted / lost / spam | assign, contact, convert |
| Teacher application | draft → submitted → under_review → verified / rejected / suspended | approve, reject, suspend |
| Enrollment | pending_payment → active → completed / withdrawn | pay, start, complete, withdraw |
| Submission | draft → submitted → under_review → revision_requested → approved / rejected | submit, review, revise, decide |
| Assessment | queued → in_review → completed → disputed → resolved | assign, grade, dispute, resolve |
| Certificate | issued → revoked / replaced | revoke, reissue |
| Work card | draft → submitted → teacher_confirmed → admin_review → published → paused / sold_out | submit, confirm, approve, pause |
| Order | draft → awaiting_payment → paid → in_progress → delivered → completed / cancelled / refunded / disputed | pay, deliver, complete, cancel, refund |
| Payment | pending → paid / expired / failed / refunded | create, settle, expire, reconcile |
| Payout | pending → held → approved → paid / reversed | hold, approve, release, reverse |
| Refund | requested → reviewing → approved / rejected → paid | review, approve, pay |
| Call | scheduled → ringing → active → ended / missed / declined | invite, accept, end |
| Support | open → pending → resolved → closed | reply, escalate, resolve |
| Content | draft → in_review → scheduled → published → archived | preview, schedule, publish, rollback |

Every transition records actor, timestamp, reason, and previous state.

---

## 12. Security, privacy, and compliance

- Better Auth + Convex Better Auth; roles stored in Convex, not JWT.
- Server-side capability checks on every Convex query/mutation; UI checks are cosmetic.
- Admin MFA; invite-only admin accounts.
- Session revocation and device list.
- Rate limits on login, leads, messages, uploads, payment status, calls.
- CSRF protection from auth library; same-site cookies.
- Upload validation: MIME, size, extension, image dimensions, malware scan where supported.
- Signed URLs for private media; no public bucket.
- AES-256-GCM for provider session tokens.
- Secrets in Nodus env/volumes, never in images or logs.
- Audit log append-only; sensitive access requires reason.
- PII minimization and retention policy.
- UU PDP alignment: consent, access, correction, deletion, breach process.
- No sale of personal data.
- Chat and recording access policy published to users.
- Backups encrypted and restore-tested.
- Incident response runbook.

---

## 13. Reliability and performance

- Idempotency keys for payments, orders, webhooks, and notifications.
- Outbox pattern for email/WhatsApp/webhooks.
- Retries with bounded backoff and dead-letter queue.
- Payment reconciliation by scheduler, not per-request polling.
- Unique amount per active order; persistent claims.
- Convex indexes for every list and search path.
- Pagination and virtualized tables.
- Cache public landing data with `"use cache"` and short revalidation.
- Graceful degradation:
  - gateway down → manual payment and reconciliation
  - LiveKit down → audio-only/chat/reschedule
  - email/WhatsApp down → in-app notification
  - media storage down → placeholder and retry
- Backup targets: content and ledger RPO 1 hour, RTO 4 hours; media RPO 24 hours. Restore drills quarterly.
- Health checks and uptime monitoring.
- Structured logs with request IDs.
- Error tracking and alerting.
- Load targets: 10k monthly active users, 100 concurrent calls, 1k messages/minute; revisit after pilot.

---

## 14. Accessibility and design

- WCAG 2.1 AA.
- Keyboard-operable tables, drawers, dialogs, call controls.
- Visible focus; copper on cream, brass on dark wood.
- Status is shape + label, never color alone.
- Captions and transcripts for calls and voice notes where required.
- Reduced motion and data-saver respected.
- Mobile-first for chat, calls, submissions, and seller tools.
- No horizontal overflow at 360, 390, 768, 1024, 1440.
- Touch targets at least 44px.

---

## 15. Testing and acceptance

### Test layers

- **Unit:** money math, amount allocation, state transitions, permissions, content validation.
- **Integration:** Convex functions with `convex-test`; payment webhook idempotency; content publish/rollback.
- **E2E:** Playwright for student, teacher, admin, buyer.
- **Security:** permission matrix, IDOR, rate limits, upload abuse, webhook signature, break-glass audit.
- **Accessibility:** axe on every main route.
- **Load:** chat, call signaling, payment reconciliation.

### Role acceptance

**Student**

- Enroll, learn, submit, receive feedback, earn certificate, sell, get paid.
- Chat, voice note, voice call, video call.
- See own data only.

**Teacher**

- Onboard, manage cohort, assess, issue certificate, earn 70%.
- Chat and call own students only.
- Cannot see other teachers’ cohorts.

**Admin**

- Find and edit any record through validated actions.
- Edit every landing field with preview and rollback.
- See all logs and stats.
- Resolve payment, payout, refund, assessment, and support exceptions.
- Sensitive access is logged.

**Buyer**

- Buy without an account.
- Track order by token.
- Claim order after sign-in.
- Request refund.

---

## 16. Delivery plan

| Phase | Outcome | Estimate |
|---|---|---|
| **0. Foundation** | Better Auth, roles/entitlements, `/ruang` shell, capability registry, audit, content schema, media | 1–1.5 weeks |
| **1. Admin core** | Command center, accounts, teacher verification, leads, full content CMS, stats, logs | 2–2.5 weeks |
| **2. Learning** | Paths, cohorts, enrollments, submissions, assessments, certificates | 2 weeks |
| **3. Commerce** | Works, orders, payments, payout ledger, refunds | 2 weeks |
| **4. Messaging** | Chat, voice notes, presence, notifications | 1.5 weeks |
| **5. Calls** | LiveKit voice/video, scheduling, consent, recording policy | 1.5–2 weeks |
| **6. Governance and hardening** | Flows, support, moderation, exports, security, accessibility, load | 2 weeks |
| **7. Launch** | Data migration, runbook, backups, monitoring, PWA install and push, pilot | 1 week |

For one developer: roughly 12–14 weeks. With parallel subagents and a fixed scope: 8–10 weeks.

Dependencies:

- Production Convex deployment must exist before Phase 0.
- `merchantid` fork hardening passed 529 tests, including durable quarantine; a live merchant test remains before production.
- LiveKit decision before Phase 5.
- WhatsApp/email provider decision before Phase 4 notifications.

---

## 17. Open decisions

1. **LiveKit:** self-host on Nodus with Redis + TURN, or LiveKit Cloud for the pilot?
2. **Chat retention:** 2 years default, or shorter for privacy?
3. **Admin chat access:** break-glass with reason, or metadata-only by default?
4. **Payments:** merge `kalanidhi-hardening` after the live merchant test, or keep a long-lived fork branch until the official provider adapter exists?
5. **Payout execution:** manual bank/GoPay transfer first, or Xendit disbursement?
6. **Email provider:** Resend, Postmark, or SES?
7. **WhatsApp:** existing Waha service, or a managed provider?
8. **Media storage:** Convex storage first, or external S3-compatible storage?
9. **Search:** Convex search indexes first, or Typesense/Meilisearch?
10. **Recording:** never in v1, or consent-based recording for disputes?

---

## 18. Implementation map

### 18.1 App structure

```text
app/
  (site)/                    public landing, works, checkout
  (auth)/masuk               sign in
  ruang/
    layout.tsx               session guard, viewer, shell
    page.tsx                 role-aware command center
    belajar/page.tsx
    tugas/page.tsx
    kredensial/page.tsx
    karya/page.tsx
    pesanan/page.tsx
    pesanan/pembayaran/page.tsx
    pesanan/payout/page.tsx
    pesan/page.tsx
    panggilan/page.tsx
    jadwal/page.tsx
    prospek/page.tsx
    orang/page.tsx
    konten/page.tsx
    statistik/page.tsx
    alur/page.tsx
    log/page.tsx
    dukungan/page.tsx
    tata-kelola/page.tsx
    pengaturan/page.tsx
  api/
    payments/create/route.ts
    payments/webhook/route.ts
    livekit/token/route.ts
  verifikasi/[kode]/page.tsx
components/
  workspace/
    shell/
    data/
    learning/
    credentials/
    commerce/
    content/
    communication/
    governance/
lib/
  access/
    capabilities.ts
    policy.ts
    viewer.ts
  validation/
    content.ts
    learning.ts
    commerce.ts
convex/
  users.ts
  access.ts
  content.ts
  media.ts
  leads.ts
  learning.ts
  assessments.ts
  certificates.ts
  commerce.ts
  payments.ts
  payouts.ts
  messaging.ts
  calls.ts
  notifications.ts
  audit.ts
  stats.ts
  flows.ts
  support.ts
  settings.ts
payments-gateway/
  src/server.ts
  src/store.ts
  src/session.ts
  src/webhook.ts
  src/poller.ts
  Dockerfile
```

### 18.2 Convex modules

| Module | Responsibilities |
|---|---|
| `users.ts` | viewer, invites, roles, sessions, suspension |
| `access.ts` | capability checks, scopes, break-glass grants |
| `content.ts` | published site, drafts, revisions, publish/rollback |
| `media.ts` | upload URLs, metadata, usage |
| `leads.ts` | list, assign, notes, status, exports |
| `learning.ts` | paths, modules, cohorts, enrollments, progress |
| `assessments.ts` | submissions, rubric, grade, revision, dispute |
| `certificates.ts` | issue, revoke, reissue, public verification |
| `commerce.ts` | works, work cards, orders, buyers |
| `payments.ts` | intents, settlement, reconciliation, provider events |
| `payouts.ts` | 70/15/15 ledger, release, hold, reverse |
| `messaging.ts` | conversations, messages, voice notes, receipts, flags |
| `calls.ts` | call sessions, participants, LiveKit tokens, events |
| `notifications.ts` | templates, outbox, delivery state |
| `audit.ts` | append-only events, query, export |
| `stats.ts` | aggregates, funnel, cohort metrics |
| `flows.ts` | state machines, SLAs, automation rules |
| `support.ts` | tickets, messages, assignment |
| `settings.ts` | flags, integrations, thresholds, API keys |

Server components load the shell and guard routes. Client components subscribe with `useQuery` for real-time tables, chat, calls, and queues.

### 18.3 Payment gateway service

Separate deployable in a private repo: [`FarelRA/kalanidhi-payments`](https://github.com/FarelRA/kalanidhi-payments), `main` at `d6109f9`.

```text
kalanidhi-payments/
  src/http/app.ts      private HTTP API
  src/domain/*         charges, reconcile, session, webhook
  src/db.ts            SQLite
  vendor/              pinned merchantid tarball
  Dockerfile
```

It calls the hardened `merchantid` fork. It never writes orders or payouts. It emits signed events to Next.js. No public port; one instance; SQLite volume.

### 18.4 LiveKit

- Nodus service: LiveKit + Redis + TURN.
- `app/api/livekit/token/route.ts` issues room tokens after capability checks.
- `components/workspace/communication/call-room.tsx` renders the room.
- `convex/calls.ts` stores session and participant records.
- Recording egress to Convex storage only when consent is recorded.

### 18.5 Build order

1. Convex schema, access layer, Better Auth, `/ruang` shell.
2. Content CMS, accounts, leads, teacher verification, stats, logs.
3. Learning, submissions, assessments, certificates.
4. Works, orders, payments gateway, payout ledger, refunds.
5. Chat, voice notes, notifications.
6. LiveKit voice/video calls, scheduling, consent, moderation.
7. Flows, support, exports, security, accessibility, load, launch.

---

## Appendix A — Landing content field map

Every field below is editable in `/ruang/konten`.

### Hero

- title lines
- description
- primary CTA
- secondary CTA
- plate image, alt, caption, note
- work card title, serial, work, maker, teacher

### Traction

- label, note
- figures: value, label

### Loop

- label, title, description
- return label, return note
- stages: code, title, description
- diagram title, description

### Catalog

- label, title, description, CTA
- groups: status, title, blurb
- fields: name, region, status, note

### Mangsa

- label, season, name, period, eyebrow, title, description
- activities
- activity label
- provenance

### Ethics

- label, title, description
- principles: title, description
- access levels: label, note
- share: label, value, note
- share title, note, aria label
- card: source title, permission label, reference label
- attribution: permission, access, reference, sources

### Institution

- label, title, description
- segments, points
- brief pairs
- CTA, note, summary label, summary title, year

### Section copy

- paths: label, title, description, CTAs, price/status/content/includes labels, curriculum pending
- teachers: label, title, description, profile CTA, dialog label, ask CTA
- works: label, title, description, featured/service/price labels, ask CTA
- notes: label, title, description
- FAQ: label, title, description, policy CTA, ask CTA
- closing: label, title, description, CTAs, note suffix

### Footer

- description, columns, links
- secretariat
- edition, copyright
- source label/description, sources label
- culture label/policy CTA
- certificate note
- preferences, language, data saver, privacy, terms, back to top
- newsletter: label, placeholder, CTA, pending, note, error, interest, source

### Navigation

- label, href

### Overlays

- policy, login, mangsa, verify, about, privacy, terms
- icon, title, description, bullets, footnote, action

### Header

- brand aria, nav aria, mobile nav aria, search aria/label, menu aria
- login/register CTAs
- mobile search/register
- sheet title/description
- region

### Search

- title, description, placeholder
- empty prefix/suffix
- footer label, esc label, close label
- groups
- path coming soon
- pages: label, description, href

### Mobile CTA

- label, price prefix/suffix, register CTA, note

### Lead dialogs

- student, institution, consultation, notify: title, description

### Metadata

- site name, URL, area served
- title, description
- OG title/description
- Twitter title/description
- keywords, category
- image URL, width, height, alt

### Entities

- catalog fields
- paths and modules
- teachers
- works
- testimonials
- FAQs

---

## Appendix B — Admin “all data” checklist

- [ ] Accounts and roles
- [ ] Sessions and login history
- [ ] Teacher applications and documents
- [ ] Seller profiles and payout accounts
- [ ] Leads and notes
- [ ] Enrollments and progress
- [ ] Submissions and assessments
- [ ] Certificates and work cards
- [ ] Works and orders
- [ ] Payments and reconciliation
- [ ] Payouts, refunds, disputes
- [ ] Conversations metadata and break-glass content
- [ ] Calls metadata, consent, recordings
- [ ] Content revisions and media
- [ ] Navigation, SEO, redirects
- [ ] Stats and exports
- [ ] Flows and SLAs
- [ ] Audit, auth, payment, notification, call, moderation, API, error logs
- [ ] Support tickets
- [ ] Feature flags and integrations
- [ ] Privacy requests and retention holds
