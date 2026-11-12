# Phase 3 — Commerce and Payments

This document records the Phase 3 implementation. The plan in
`docs/workspace-plan.md` and the contracts in `docs/payments-gateway.md` remain
the source of truth.

## What exists

- `convex/commerce.ts` — works and work cards, seller scope, teacher
  confirmation, admin moderation, guest checkout, order lifecycle, buyer claim,
  order reads by buyer/seller/admin, and order disputes.
- `convex/payments.ts` — payment intents mirrored from the private gateway,
  verified webhook settlement, idempotency by event ID, late/unmatched/expired
  reconciliation, manual match, gateway health records, and reconciliation
  projections.
- `convex/payouts.ts` — append-only 70/15/15 ledger, payout states, release,
  hold, reverse, verified payout accounts, seller statements, refunds, and
  negative carry after a released payout.
- `convex/commerce-shared.ts` — shared viewer resolution, seller-scope checks,
  token hashing, audit writes, reasons, and internal-key verification.
- `lib/commerce/money.ts` — one split function used by settlement, refunds,
  statements, and previews. Teacher and platform round down; residue goes to the
  community fund; the three shares always sum to the base amount.
- `lib/commerce/gateway.ts` — private gateway client (`x-internal-key`, injected
  `fetch`, no provider protocol, no gateway repo import).
- `lib/commerce/webhook.ts` — HMAC-SHA256 verification over
  `timestamp + "." + rawBody`, five-minute window, timing-safe comparison.
- `lib/commerce/server.ts` — server-only Convex calls used by Next.js routes and
  public pages.
- `app/api/payments/create/route.ts` — creates the guest order and intent, calls
  the gateway, attaches the charge, and returns the QR/charge details.
- `app/api/payments/webhook/route.ts` — verifies the signature, enforces event
  idempotency, and calls the settlement mutation.
- `app/api/payments/health/route.ts` — admin-only gateway probe recorded in
  `integrationHealth`.
- Public routes: `/karya/[slug]`, `/pesan/[slug]`, `/pesanan/[token]`.
- Live workspace surfaces: `/ruang/karya`, `/ruang/pesanan`,
  `/ruang/pesanan/pembayaran`, `/ruang/pesanan/payout`. Preview mode keeps the
  approved local prototype; live sessions render Convex records only.

## Environment

Next.js runtime (`.env.local`):

```sh
PAYMENTS_GATEWAY_URL=http://127.0.0.1:4020
PAYMENTS_INTERNAL_KEY=<shared internal key>
PAYMENTS_WEBHOOK_SECRET=<webhook HMAC secret>
# Optional; defaults to 8000 ms.
PAYMENTS_GATEWAY_TIMEOUT_MS=8000
```

Convex deployment:

```sh
npx convex env set PAYMENTS_INTERNAL_KEY <shared internal key>
```

The internal key must match the Next.js value. `PAYMENTS_WEBHOOK_SECRET` is used
only by the Next.js webhook route. The gateway is never reachable from the
browser; no secret is prefixed with `NEXT_PUBLIC_`.

## Settlement rules

- A payment settles only when the amount equals `uniqueAmount` exactly, the
  payment is pending, the provider transaction has not settled another payment,
  and `paidAt` is inside `createdAt - skew` to `expiresAt + skew`.
- The ledger split uses `order.baseAmount`. The unique offset is reconciliation
  cover and is never revenue.
- A gateway fee is written as a separate `gateway_fee` debit and is absorbed by
  the platform share. Teacher and community shares never change.
- Late payments, payments after cancellation, and payments for unknown or
  already-paid charges are queued for reconciliation; they are never settled
  automatically.
- An admin manual match requires a reason and an actor, and is audited. It can
  resolve a late/expired intent after the transfer is verified.

## Refund runbook

Refunds are manual until a provider refund endpoint exists. Do not add a typed
provider call without the gateway contract.

1. Buyer requests a refund from `/ruang/pesanan`, with amount and evidence.
2. Admin reviews in **Refund & sengketa** and approves or rejects with a
   reason. Approval holds any unreleased payout.
3. Admin transfers the refund out of band (bank/GoPay), then marks the refund
   **paid**.
4. Paying a refund appends reversal entries for teacher, platform, and
   community. It never edits the original ledger rows, and the payment remains
   `paid`.
5. If the payout was already released, a `negative_balance` entry and a
   compensating negative payout row are created. The next release nets the
   negative balance; the paid payout row is untouched.
6. Partial refunds hold the payout for adjustment. Release computes the net
   teacher balance from the ledger before paying.

## Tests

Phase 3 tests live in `tests/phase-3/`:

| File | Covers |
|---|---|
| `money.test.ts` | P3-PAY-01..08, 20, 60, 61; checkout rate limit |
| `gateway.test.ts` | Gateway contract, charge idempotency/conflict, webhook signature/replay window |
| `commerce.test.ts` | P3-WRK, P3-ORD, order scope/IDOR, lifecycle, disputes |
| `payments.test.ts` | P3-PAY-06, 10, 25, 26, 40..55, 70, 83; accounting |
| `payouts.test.ts` | P3-PYT, P3-PAY-62..69, P3-RFD, self-refund |
| `static.test.ts` | No mock data in live surfaces, no ledger edits, no share arguments, no provider refund calls |

## Known limitations

- No QR encoder dependency was added. The checkout shows the QRIS payload with
  copy support and renders `qrImageUrl` when a future gateway adapter returns
  one. A QR image renderer or gateway-provided image is still needed for a fully
  scan-first checkout.
- The route-level rate limiter is in-process. A shared store or edge limiter is
  required before horizontal scaling; direct Convex calls bypass it.
- The app uses the server clock and one 60-second skew setting. There is no
  injected clock or NTP assertion in this phase.
- Certificate revocation is owned by Phase 2. Ordering re-checks seller scope and
  auto-pauses a listing that lost scope; Phase 2 revoke should also call
  `commerce.bulkPauseWorks` for an immediate takedown.
- Gateway success rate and other stats are not exposed as a Phase 3 metric
  query; they belong to the Phase 1/6 stats layer.
- No live GoPay transaction was performed. All gateway tests use the contract
  fake and fixtures.
