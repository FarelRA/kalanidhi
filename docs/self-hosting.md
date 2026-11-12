# Self-Hosting Architecture

**Status:** target architecture, v1.0  
**Principle:** keep business data and application services on infrastructure we control. Use an external service only where self-hosting is not practical or materially unsafe.

---

## 1. Service map

| Service | Hosting | Notes |
|---|---|---|
| Next.js app | Nodus, self-hosted | `ghcr.io/farelra/kalanidhi` |
| Convex backend | Nodus, self-hosted | `ghcr.io/convex/convex-backend` |
| Convex dashboard | Nodus, self-hosted | protected by Traefik basic auth |
| Convex storage | Nodus volume | `data/kalanidhi/convex-data` |
| Payments gateway | Nodus, self-hosted | private repo `FarelRA/kalanidhi-payments` |
| LiveKit | Nodus, self-hosted | signaling, SFU, embedded TURN |
| Redis for LiveKit | Nodus, self-hosted | internal only |
| WhatsApp | Nodus, self-hosted Waha | existing service |
| Email | self-hosted SMTP relay if deliverability is managed | otherwise authenticated relay is the exception |
| Search | Convex search indexes | no external search service |
| Analytics | self-hosted Umami | no third-party tracking |
| Error tracking | self-hosted GlitchTip | optional, later |
| Backups | Nodus + self-hosted storage | restic or equivalent |
| DNS | external control plane | Cloudflare or equivalent; not a data service |
| TLS | Let's Encrypt via Traefik | automatic |
| CI/CD | GitHub Actions + GHCR | external build plane; can move to Forgejo/Drone later |

### External by nature

- **GoPay / GoBiz** — the payment provider and merchant account are external. The gateway that talks to it is self-hosted.
- **DNS and certificate authorities** — external control planes, not data processors for KalaNidhi content.
- **GitHub** — source hosting and CI. Code is public; secrets are not. A self-hosted Forgejo/Drone migration is possible later.

---

## 2. Domain plan

| Host | Target | Proxy |
|---|---|---|
| `kalanidhi.site` | Next.js app | Cloudflare allowed |
| `www.kalanidhi.site` | redirect to apex | Cloudflare allowed |
| `convex.kalanidhi.site` | Convex API, port 3210 | DNS-only recommended |
| `convex-site.kalanidhi.site` | Convex HTTP actions, port 3211 | DNS-only recommended |
| `convex-admin.kalanidhi.site` | Convex dashboard, port 6791 | protected by basic auth |
| `livekit.kalanidhi.site` | LiveKit signaling, port 7880 | DNS-only |
| `rtc.kalanidhi.site` | LiveKit TURN, UDP 3478 / TLS 5349 | DNS-only |

DNS-only means the Cloudflare orange-cloud proxy is off. Media and TURN need direct UDP/TCP paths; a reverse proxy cannot carry the media range.

---

## 3. Firewall

Open on the Nodus host:

```text
TCP 80, 443          Traefik, Let's Encrypt, app, Convex, LiveKit signaling
TCP 7881             LiveKit RTC over TCP
UDP 50000-50100      LiveKit media
UDP 3478             LiveKit TURN
TCP 5349             LiveKit TURN over TLS
```

Convex and the payments gateway do not need public ports beyond Traefik.

---

## 4. Convex self-hosted

### Origins

```sh
CONVEX_CLOUD_ORIGIN=https://convex.kalanidhi.site
CONVEX_SITE_ORIGIN=https://convex-site.kalanidhi.site
NEXT_PUBLIC_DEPLOYMENT_URL=https://convex.kalanidhi.site
```

### App env

```sh
CONVEX_URL=https://convex.kalanidhi.site
NEXT_PUBLIC_CONVEX_URL=https://convex.kalanidhi.site
NEXT_PUBLIC_CONVEX_SITE_URL=https://convex-site.kalanidhi.site
```

### Convex function env

```sh
npx convex env set BETTER_AUTH_SECRET <secret>
npx convex env set SITE_URL https://kalanidhi.site
npx convex env set PAYMENTS_INTERNAL_KEY <same as app>
```

`BETTER_AUTH_SECRET` and `PAYMENTS_INTERNAL_KEY` are server secrets. Never put them in `NEXT_PUBLIC_*`.

### Admin key

The backend generates the admin key inside the container:

```sh
podman exec services-convex-1 ./generate_admin_key.sh
```

Store it at `data/kalanidhi/convex-admin-key`, mode `600`. Use it for:

```sh
CONVEX_SELF_HOSTED_URL=https://convex.kalanidhi.site
CONVEX_SELF_HOSTED_ADMIN_KEY=<admin key>
npx convex deploy
npx convex run seedRunner:run --prod
```

### Data and backup

- Backend data: `data/kalanidhi/convex-data`
- Back up the whole directory, not individual files.
- Stop or quiesce writes before a cold backup; for hot backup, use the storage snapshot mechanism supported by the deployment.
- Test restore into a separate directory before relying on it.

---

## 5. LiveKit self-hosted

### Env

```sh
LIVEKIT_URL=http://livekit:7880
NEXT_PUBLIC_LIVEKIT_URL=wss://livekit.kalanidhi.site
LIVEKIT_API_KEY=<key>
LIVEKIT_API_SECRET=<secret>
```

`LIVEKIT_URL` is private server-to-server. `NEXT_PUBLIC_LIVEKIT_URL` is the browser WebSocket origin. The API secret never reaches the browser.

### Runtime

- Redis is internal only.
- LiveKit publishes 7881/tcp, 50000-50100/udp, 3478/udp, 5349/tcp.
- TURN domain `rtc.kalanidhi.site`.
- One LiveKit node in v1. Multi-node requires shared Redis and a load-balanced signaling endpoint.
- Recording egress is not part of v1. Consent metadata exists; no recording is produced until an egress service and storage policy are added.

### Client flow

1. User opens a conversation or scheduled call.
2. Next.js verifies session, capability, conversation membership, blocks, and messaging restrictions.
3. Next.js issues a short-lived LiveKit token.
4. Browser joins the room through `NEXT_PUBLIC_LIVEKIT_URL`.
5. Convex records call state, participants, and consent metadata.
6. Admin sees metadata only; media join is a participant action, not an admin action.

---

## 6. Payments gateway

Already self-hosted as a private service. It is not publicly routed. Next.js calls it over the internal network with `x-internal-key`. The GoPay merchant account remains external.

- Image: `ghcr.io/farelra/kalanidhi-payments:latest`
- Internal URL: `http://kalanidhi-payments:8080`
- Volume: `data/kalanidhi/payments-data:/var/lib/kalanidhi`
- Env: `data/kalanidhi/payments.env` (mode 600)
- Health: `/v1/health` with `x-internal-key`
- No Traefik route, no published port
- `PAYMENTS_INTERNAL_KEY` is shared by app, Convex, and gateway
- `PAYMENTS_WEBHOOK_SECRET` is shared by app and gateway
- `GOPAY_MERCHANT_ID` and `GOPAY_STATIC_QRIS` stay empty until the merchant config is ready

The gateway exits until GoPay credentials are filled. The app may start first because the dependency is `service_started`; payment creation remains unavailable until the gateway is healthy.

---

## 7. Email

Email is the one service where self-hosting can hurt deliverability. Two acceptable paths:

1. **Self-hosted mail server** (Mailcow or equivalent) on a separate host with a clean IP, SPF, DKIM, DMARC, and bounce handling.
2. **Authenticated SMTP relay** through a provider, used only as a transport. Message content and recipient data still originate from KalaNidhi; the provider is a delivery pipe.

Do not send transactional email directly from the Nodus app host without a relay or a properly configured MTA.

---

## 8. WhatsApp

Use the existing self-hosted Waha service. Keep the session volume private, restrict the API to the internal network, and log delivery metadata without message bodies.

---

## 9. Media and object storage

Start with Convex file storage on the backend volume. If media volume or delivery grows:

- self-host MinIO or RustFS on Nodus
- use signed URLs
- keep originals in cold storage
- store derivatives (thumbnails, audio previews) separately
- never make the bucket public

---

## 10. Analytics and error tracking

- **Analytics:** self-hosted Umami, cookieless where possible. No advertising pixels.
- **Errors:** self-hosted GlitchTip or Sentry. Scrub PII, tokens, OTPs, QRIS payloads, and chat content.
- **Logs:** structured JSON to the host, with retention. Do not ship secrets to a third party.

---

## 11. Secrets inventory

| Secret | Where |
|---|---|
| `BETTER_AUTH_SECRET` | Convex env |
| `SITE_URL` | Convex env |
| `PAYMENTS_INTERNAL_KEY` | Next env + Convex env |
| `PAYMENTS_WEBHOOK_SECRET` | Next env |
| `GOPAY_*` / session vault passphrase | payments gateway env + volume |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | LiveKit env + Next env |
| `LIVEKIT_CONFIG` | generated on host, mode 600 |
| Convex admin key | host file, mode 600 |
| SMTP credentials | host env, mode 600 |
| Waha session | Waha volume |

Rules:

- no secrets in git, images, build args, logs, or `NEXT_PUBLIC_*`
- rotate on suspected exposure
- admin key and payment keys are not the same value
- backup encryption keys are stored separately from backups

---

## 12. Deployment order

1. Create DNS records.
2. Open firewall ports.
3. Run Nodus `deploy/install.sh`.
4. Run `deploy/setup-convex.sh` pre-start.
5. Start Convex and dashboard.
6. Run `deploy/setup-convex.sh --post` to capture the admin key.
7. Deploy Convex functions and set function env.
8. Upload the source images from `seed/images` to Convex storage with
   `npm run images:upload` (idempotent), then run the seed. The seed fails loudly if
   any `imageFile` is missing from `mediaAssets`.
9. Start LiveKit and Redis.
10. Set app env and deploy the app.
11. Verify `/`, `/ruang`, `/masuk`, `/verifikasi`, and a test call.
12. Run one live GoPay transaction in a controlled amount.

---

## 13. Remaining external dependencies

- GoPay merchant account and provider API
- DNS and certificate authority
- GitHub source and CI
- SMTP relay if self-hosted mail is not chosen
- Cloudflare or equivalent DNS control plane

Everything else — app, Convex, dashboard, LiveKit, Redis, payments gateway, Waha, media — runs on Nodus.
