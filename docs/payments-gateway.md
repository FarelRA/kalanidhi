# Payments Gateway — Architecture and Integration

**Status:** design, v1.0  
**Provider:** GoPay Merchant / GoBiz, unofficial QRIS  
**Core:** hardened fork of `alhifnywahid/merchantid`  
**Companion:** `docs/workspace-plan.md`

---

## 1. Decision

Use `merchantid` as the payment domain core, wrapped in a private KalaNidhi service.

Do **not** embed it in the Next.js request path. Do **not** use the original obfuscated gateway. Do **not** let a payment service become a second admin plane.

```text
Browser
  │
  ▼
Next.js  ──────────────►  Convex
  │  orders, payment intents,
  │  payout ledger, audit
  │
  │  private HTTP + HMAC webhook
  ▼
payments-gateway
  │  charges, unique amounts,
  │  claimed transactions, session
  ▼
GoPay / GoBiz
```

Convex is the business system of record. The gateway is a replaceable provider adapter.

---

## 2. Fork and hardening status

- Upstream: [`alhifnywahid/merchantid`](https://github.com/alhifnywahid/merchantid) (MIT)
- Fork: [`FarelRA/merchantid`](https://github.com/FarelRA/merchantid)
- Branch: [`kalanidhi-hardening`](https://github.com/FarelRA/merchantid/tree/kalanidhi-hardening) at `db51ed9`
- Base: `upstream/master` at `1fa55b3`; upstream has no `main` branch.
- Working tree clean. No merge to `master`; no push to upstream.
- Freed-amount quarantine is now persisted in SQLite and survives restart.

### Commits

| SHA | Purpose |
|---|---|
| `546671c` | Fail-closed settlement matching, deterministic reconciliation |
| `8b3c5f3` | SQLite store, signed webhooks, AES-256-GCM session vault |
| `523174c` | KalaNidhi integration and operations docs |
| `db51ed9` | Durable freed-amount quarantine, including restart and race tests |

### Verification

| Gate | Result |
|---|---|
| `npm ci` | Passed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run format:check` | Passed |
| `npm test` | 529 tests across 35 files |
| Coverage | 88.3% lines; thresholds passed |
| `npm run build` | Passed; ESM/CJS/declarations |
| Runtime dependencies | None; `npm audit --omit=dev` 0 |

### Hardening completed

1. ✅ Strict settlement statuses; no fail-open on unknown status.
2. ✅ One currency scale; GoPay sen normalized once.
3. ✅ Refunds, partial refunds, voids, and failed transactions rejected as settlement.
4. ✅ Deterministic reconciliation; one provider transaction settles at most one payment.
5. ✅ Persistent `PaymentStore` with atomic unique-amount constraint.
6. ✅ HMAC webhook delivery with retries, idempotency, and SSRF validation.
7. ✅ AES-256-GCM session vault for access/refresh tokens and device ID.
8. ✅ Durable freed-amount quarantine in SQLite, written atomically with the terminal transition.
9. ✅ Tests for same-amount orders, duplicate transactions, refunds, missing timestamps, expiry, restart, and quarantine races.
10. ✅ KalaNidhi integration contract documented in `docs/kalanidhi.md`.

### Remaining production gates

- **No live provider test.** All GoPay/Shopee tests use fixtures and mocks. Run one real small transaction against the merchant account before production.
- **Refunds are manual.** No typed provider refund call. Use the GoBiz dashboard and record a ledger reversal.
- **DNS rebinding residual risk.** Webhook URL validation resolves DNS and disables redirects, but `fetch` resolves again. Pair it with an egress firewall or allow-listed proxy.
- **`payment.failed` is application-level.** The core has no failed payment status; emit it for order failures, not settlement.
- **Node 18 is not locally exercised.** Core targets Node 18, but SQLite requires Node 22.13+ and local tests used Node 24.
- **`node:sqlite` is experimental.** Validate against the production Node version and pin it.
- **Clock dependence.** Quarantine deadlines use wall-clock time; hosts must run NTP and stay within `clockSkewMs`.
- **Custom store contract.** Durable quarantine only works when a store implements the quarantine methods and rejects quarantined amounts in `create()`. A partial custom store remains unsafe across processes.
- **Store `update()` guard.** `SqlitePaymentStore.update()` does not re-check quarantine; `PaymentService` never writes a pending row through it, but external callers must not resurrect a terminal payment with a quarantined amount.

---

## 3. Data ownership

### Convex owns

- orders
- order items
- payment intents (business view)
- ledger entries
- payouts
- refunds
- disputes
- audit log
- admin reconciliation decisions

### Gateway owns

- GoPay session and tokens
- provider charge records
- unique payable amount allocation
- provider transaction IDs
- claimed transaction IDs
- QRIS payloads
- gateway health

### Sync

The gateway emits signed webhooks. Next.js verifies the signature and calls an idempotent Convex mutation. Convex never trusts a client-reported payment status.

---

## 4. API contract

All routes are private. Only the Next.js server can call them.

```text
POST /v1/charges
GET  /v1/charges/:id
POST /v1/charges/:id/cancel
POST /v1/reconcile
GET  /v1/health
POST /v1/session/request-otp
POST /v1/session/verify-otp
GET  /v1/session/status
```

### Create charge

```json
{
  "orderId": "KN-2026-000123",
  "baseAmount": 1450000,
  "expiresInSeconds": 900,
  "description": "Batik Tulis Soga — Kain Soga Anyaman"
}
```

Response:

```json
{
  "chargeId": "ch_...",
  "orderId": "KN-2026-000123",
  "baseAmount": 1450000,
  "uniqueAmount": 1450037,
  "qrString": "000201...",
  "expiresAt": "2026-11-11T16:15:00.000Z",
  "status": "pending"
}
```

The buyer must pay `uniqueAmount` exactly. The checkout UI displays it as the total.

### Charge status

```json
{
  "chargeId": "ch_...",
  "status": "pending",
  "providerReference": "TRX-...",
  "paidAt": null,
  "providerTransactionId": null
}
```

Statuses: `pending`, `paid`, `expired`, `failed`, `cancelled`, `refunded`.

---

## 5. Unique amount allocation

Same-priced orders are separated by a small unique offset:

```text
Order A Rp 1.450.000 → Rp 1.450.037
Order B Rp 1.450.000 → Rp 1.450.081
```

Rules:

- Offset window: 1–999 rupiah.
- Uniqueness is enforced on the **final amount**, not the offset.
- Active payments reserve their final amount atomically in the store.
- Released amounts are quarantined for at least twice the clock-skew window.
- Consumed provider transaction IDs are remembered across ticks.
- If the pool is exhausted, return `409` and ask the buyer to retry.
- The offset is not platform revenue. Record `baseAmount` and `uniqueAmount` separately. The 70/15/15 split is calculated on `baseAmount`; the offset covers reconciliation and is disclosed at checkout.

---

## 6. Settlement matching

A transaction settles a payment only if all are true:

1. Provider transaction amount normalizes to exactly `uniqueAmount`.
2. Status is a known settled/capture/success status.
3. Transaction time is inside `createdAt − clockSkew` to `expiresAt + clockSkew`.
4. The provider transaction ID has not settled another payment.
5. The payment is still pending.

Never:

- accept both sen and rupiah scales
- settle on refund/partial refund/void/failed
- settle on an unknown status
- match by amount alone without a uniqueness guarantee
- poll the provider on every public status request

Reconciliation runs from a scheduler, not from buyer page refreshes.

---

## 7. Webhooks

Gateway → Next.js:

```text
POST /api/payments/webhook
X-Kalanidhi-Signature: sha256=<hmac>
X-Kalanidhi-Timestamp: <unix seconds>
X-Kalanidhi-Event-Id: <uuid>
```

Payload:

```json
{
  "event": "payment.settled",
  "eventId": "evt_...",
  "chargeId": "ch_...",
  "orderId": "KN-2026-000123",
  "providerTransactionId": "TRX-...",
  "amount": 1450037,
  "paidAt": "2026-11-11T16:02:11.000Z"
}
```

Rules:

- HMAC-SHA256 over `timestamp + "." + rawBody`.
- Reject timestamps older than 5 minutes.
- Store `eventId` for idempotency.
- Retry with exponential backoff; dead-letter after 8 attempts.
- Never include session tokens or QR payloads in webhooks.

Convex mutation:

```text
payments.markSettled({ eventId, orderId, providerTransactionId, amount })
```

It checks order status, payment status, amount, and idempotency before writing ledger rows.

---

## 8. Session and secrets

- GoPay session: access token, refresh token, device ID, merchant ID.
- Encrypt at rest with AES-256-GCM.
- Master key in Nodus secret env, never in the image.
- Session volume or SQLite table, persisted across restarts.
- OTP login is admin-only and audited.
- Token refresh callback persists the new session before use.
- Health endpoint reports `session: valid | expired | missing` without exposing tokens.
- If the session is lost, the gateway enters `manual` mode: QRIS can still be generated, but settlement requires admin confirmation.

---

## 9. Deployment on Nodus

```text
services/
  kalanidhi            Next.js
  kalanidhi-payments   payments gateway
  livekit              voice/video (later)
  redis                LiveKit + gateway coordination (later)
```

Rules:

- Gateway has no public Traefik route.
- Only the `router` network reaches it.
- Bind to the internal network or `127.0.0.1`.
- SQLite volume for charges, claims, and session.
- Health check and restart policy.
- Logs redact tokens, QR payloads, and OTPs.
- One gateway instance per merchant session. Do not scale horizontally without a shared store and a single poller/leader.

---

## 10. Admin surfaces

`/ruang/pesanan/pembayaran` shows:

- payment intents and status
- unique amount and base amount
- provider reference
- age and expiry
- last reconciliation
- unmatched transfers
- duplicate-amount warnings
- late payments after QR expiry
- gateway session health
- manual match with reason
- retry reconciliation

`/ruang/pesanan` shows:

- orders and payment state
- payout ledger 70/15/15
- refunds and disputes
- gateway fee absorbed by platform share

---

## 11. Failure modes

| Failure | Behavior |
|---|---|
| Session expired | Status `session_expired`; QR generation paused; admin reconnects OTP |
| Provider timeout | Charge stays pending; reconcile retries with backoff |
| Gateway down | Checkout can fall back to manual transfer; admin reconciles |
| Duplicate webhook | Idempotent by `eventId` |
| Late payment after expiry | Reconciliation queue, not automatic settlement |
| Same amount collision | Prevented by unique amount allocation |
| Restart | Claims and charges persist in SQLite |
| Refund | Manual refund or provider refund endpoint; ledger reversal only |
| Provider ban | Switch adapter to official provider; orders/ledger unchanged |

---

## 12. Migration to an official provider

Keep the internal API stable:

```ts
type PaymentProvider = {
  createCharge(input): Promise<Charge>
  getStatus(ref): Promise<ChargeStatus>
  refund?(ref, amount): Promise<void>
}
```

Adapters:

- `GopayUnofficialProvider`
- `MidtransProvider`
- `XenditProvider`

Next.js, Convex, `/ruang`, orders, payouts, and public pages do not change.

---

## 13. Testing

- Unit: amount allocator, matcher, currency normalization, status filtering, webhook signature.
- Integration: charge lifecycle, duplicate transaction, restart, expiry, refund reversal.
- Security: webhook signature, replay, SSRF, rate limits, secret redaction.
- Load: 100 concurrent charges, 10k pending payments, reconciliation window.
- Chaos: provider timeout, gateway restart, session expiry, duplicate webhook.

---

## 14. Open decisions

1. Merge `kalanidhi-hardening` after review, or keep a long-lived fork branch?
2. Session store: SQLite table or encrypted file on a volume?
3. Refund: manual first, or add provider refund endpoint?
4. Provider ban contingency: manual transfer fallback, or immediate official provider switch?
5. Gateway fee: absorb in platform 15%, or pass to buyer as a separate line?
