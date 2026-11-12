# KalaNidhi Digital

Landing page untuk platform belajar praktik budaya Nusantara. Alurnya satu lingkaran:
**belajar, dinilai pengajar, mendapat sertifikat platform dan Kartu Karya, berkarya atau
berjualan, lalu kembali sebagai pengajar, penilai, atau pemasok.**

Sertifikat yang ditampilkan adalah sertifikat platform dengan kode verifikasi publik,
bukan sertifikasi pemerintah atau BNSP.

**Live:** [https://kalanidhi.site](https://kalanidhi.site)

Arah visual, token warna, dan aturan gerak dijelaskan di [DESIGN.md](./DESIGN.md).

Dokumen produk:

- [Rencana workspace lengkap](./docs/workspace-plan.md) — semua peran, konten, statistik, log, chat, dan panggilan.
- [Arsitektur pembayaran](./docs/payments-gateway.md) — gateway QRIS GoPay dan integrasi Convex.
- [Arsitektur self-host](./docs/self-hosting.md) — Convex, LiveKit, Redis, gateway, dan batas layanan eksternal.

## Stack

- **Next.js 16.4**: App Router, React Server Components, Server Actions, Turbopack
- **React 19.3** dan **TypeScript 6**
- **Convex 1.49**: database, query/mutation, seed, dan penyimpanan lead
- **Tailwind CSS 4.3**: token desain di `app/globals.css`
- **shadcn/ui (Radix)**: primitif aksesibel untuk dialog, sheet, accordion, tooltip
- **Fraunces + Karla**: display editorial dan body
- **cmdk**: command search (`⌘K` / `Ctrl+K`)
- **Sonner**: toast
- **Zod**: validasi form di Server Action
- **Lucide**: ikon
- **next/image** dan `sharp`: optimasi gambar lokal

## Menjalankan

```bash
npm install
cp .env.example .env.local
npx convex dev
```

`npx convex dev` membuat project Convex, menulis `NEXT_PUBLIC_CONVEX_URL` dan
`CONVEX_DEPLOYMENT` ke `.env.local`, lalu menjalankan backend lokal.

Untuk ruang kerja, isi juga `NEXT_PUBLIC_CONVEX_SITE_URL` dan `NEXT_PUBLIC_SITE_URL`
(lihat `.env.example`), lalu set secret Better Auth pada deployment Convex:

```bash
npx convex env set BETTER_AUTH_SECRET=$(openssl rand -base64 32)
npx convex env set SITE_URL http://localhost:3000
```

Admin pertama dibuat lewat internal mutation, bukan pendaftaran publik. Daftar
dulu di `/masuk`, lalu jalankan:

```bash
npx convex run users:bootstrapAdmin '{"email":"admin@example.com","name":"Nama Admin"}'
```

Detail kontrak, matriks kemampuan, dan handoff ada di
[docs/phase-0-foundation.md](./docs/phase-0-foundation.md).

### Convex self-hosted

Produksi memakai Convex self-hosted di Nodus. Untuk menghubungkan repo ke
deployment itu:

```bash
export CONVEX_SELF_HOSTED_URL=https://convex.kalanidhi.site
export CONVEX_SELF_HOSTED_ADMIN_KEY="$(cat /home/podman/services/data/kalanidhi/convex-admin-key)"
npx convex deploy
```

App memakai:

```sh
CONVEX_URL=https://convex.kalanidhi.site
NEXT_PUBLIC_CONVEX_URL=https://convex.kalanidhi.site
NEXT_PUBLIC_CONVEX_SITE_URL=https://convex-site.kalanidhi.site
```

Secret fungsi diset pada deployment self-hosted:

```bash
npx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
npx convex env set SITE_URL https://kalanidhi.site
npx convex env set PAYMENTS_INTERNAL_KEY "<same as app>"
```

Langkah lengkap, DNS, firewall, LiveKit, dan payment gateway ada di
[docs/self-hosting.md](./docs/self-hosting.md).

Di terminal lain, isi database dengan konten awal:

```bash
npm run convex:seed
```

Lalu jalankan aplikasi:

```bash
npm run dev
```

Perintah lain:

```bash
npm run build
npm start
npm run lint
npm run typecheck
npm test
npm run test:watch
npm run test:coverage
npm run convex:deploy
npm run convex:codegen
npm run convex:seed
npm run convex:seed:if-empty
```

Untuk mengisi deployment produksi, jalankan
`npx convex run seed:run --prod` setelah `npx convex deploy`.

Tanpa `NEXT_PUBLIC_CONVEX_URL`, aplikasi tetap bisa dibangun dan dijalankan memakai
fallback dari `lib/content/fallback.ts`. Fallback itu membaca `convex/seedData.ts`,
sehingga tampilan tidak kosong saat backend belum tersambung.

## Struktur

```
app/
  actions/lead.ts          Server Action + validasi Zod, menyimpan lead ke Convex
  globals.css              Token warna, tipografi, tekstur kayu, reduced-motion, data saver
  layout.tsx               Font, metadata, header, footer, overlay provider, toaster
  page.tsx                 Komposisi landing page + JSON-LD
  not-found.tsx            Halaman 404
  robots.ts, sitemap.ts    SEO
convex/
  schema.ts                Skema tabel: siteContent, catalogFields, paths, teachers,
                           works, testimonials, faqs, leads
  content.ts               Query getSite untuk merakit seluruh konten landing
  leads.ts                 Mutation create untuk formulir minat
  seed.ts                  Mutation internal untuk mengisi dan mengosongkan konten
  seedData.ts              Sumber data awal untuk seed dan fallback
components/
  landing/                 Section landing: bangku, lingkaran, rak bahan, jalur, pengajar,
                           karya, etika, musim, institusi, catatan peserta, FAQ, penutup
  layout/                  Header, footer, preferensi hemat kuota dan bahasa
  overlays/                Provider dialog, lead dialog, info dialog, tombol overlay
  forms/                   Form lead dan newsletter dengan useActionState
  providers/               Convex client provider untuk fitur real-time berikutnya
  search/                  Command palette
  ui/                      Primitif shadcn/ui yang disesuaikan
  brand/                   Logo bench ring dan wordmark
lib/
  content/types.ts         Tipe konten yang dipakai app dan Convex
  content/fallback.ts      Data fallback saat Convex belum dikonfigurasi
  convex/server.ts         getSiteData, persistLead, dan deteksi konfigurasi Convex
  forms/lead.ts            Tipe dan state awal form lead
  preferences.ts           Store preferensi hemat kuota
  structured-data.ts       JSON-LD dari konten Convex
  format.ts, search.ts     Helper
hooks/
  use-active-section.ts    Navigasi aktif via IntersectionObserver
  use-data-saver.ts        Preferensi hemat kuota
public/images/             Aset visual landing page, dirujuk sebagai path string
reference/                 Dokumen konteks proposal (bukan bagian runtime)
```

## Konten dari Convex

Semua teks utama, nama, harga, jadwal, atribusi, navigasi, dialog, metadata, dan copy
section disimpan di Convex. Tabel `siteContent` menyimpan satu dokumen `site` berisi
konten tunggal; tabel lain menyimpan entitas yang bisa berubah sendiri-sendiri:

- `catalogFields`: bidang budaya dan status kesiapannya
- `paths`: jalur belajar
- `teachers`: pengajar dan praktisi
- `works`: karya dan jasa
- `testimonials`: catatan peserta dan mitra
- `faqs`: pertanyaan umum
- `leads`: pendaftaran, konsultasi, institusi, dan langganan kabar

`convex/content.ts` merakit semuanya menjadi satu objek `SiteData` yang dipakai
`app/layout.tsx` dan `app/page.tsx`. Server Component mengambil data lewat
`getSiteData()` di `lib/convex/server.ts`, lalu meneruskannya sebagai props ke section.
Dengan begitu tidak ada copy landing yang diimpor langsung dari file statis.

### Mengubah konten

1. Setelah `npx convex dev` berjalan, buka dashboard Convex untuk mengedit dokumen.
2. Atau ubah data awal di `convex/seedData.ts`, lalu jalankan
   `npm run convex:seed`. Seed mengosongkan tabel konten dan mengisinya ulang; tabel
   `leads` tidak dihapus.
3. Untuk menambah jalur, pengajar, karya, atau bidang, tambahkan entri di
   `convex/seedData.ts` atau dashboard. Urutan tampil memakai field `order`.

Gambar berada di `public/images/` dan disimpan sebagai path string di konten. Ganti
path, nama, harga, dan atribusi di Convex; komponen akan mengikuti.

## Keputusan implementasi

- **Server-first**: hampir semua section adalah Server Component. Client island hanya
  untuk dialog, pencarian, preferensi, dan form.
- **Convex sebagai sumber data**: konten diambil di server dengan `fetchQuery`, bukan
  diimpor dari file. Form memakai `fetchMutation` dan menyimpan lead ke tabel `leads`.
- **Fallback aman**: tanpa URL Convex, app memakai seed yang sama agar build, preview,
  dan pengembangan UI tetap berjalan.
- **Satu momen gerak**: hanya foto hero dan tag Kartu Karya yang masuk dengan
  animasi. Tidak ada fade-up per section. Reduced motion dan mode hemat kuota
  dihormati.
- **Tipografi sebagai identitas**: Fraunces untuk headline dan kutipan, Karla untuk UI.
  Label section memakai stempel kapital, bukan eyebrow dekoratif.
- **Lingkaran sebagai struktur**: lima stasiun di bangku melingkar, jalur kembali putus-
  putus, dan kain selesai yang berjalan balik ke stasiun 01.
- **Konten tetap terbaca tanpa JS**: animasi memakai CSS dan tidak menyembunyikan konten.
- **Aksesibilitas**: skip link, landmark, label form eksplisit, fokus terlihat, target
  sentuh, `aria-live` pada hasil, kontras teks dijaga.
- **Kepercayaan dan etika**: Kartu Sumber Budaya untuk dua sumber pengetahuan, rincian
  bagi hasil 70/15/15, penjelasan sertifikat platform, dan atribusi komunitas.
- **Gambar**: path string dari konten, dirender dengan `next/image` dan `fill`.
- **TypeScript 7 belum dipakai**: `typescript-eslint` di `eslint-config-next` belum
  mendukung TS 7. Proyek memakai TS 6.0 terbaru agar lint tetap berjalan.

## Verifikasi

- `npm run lint`, `npm run typecheck`, dan `npm run build` lulus.
- **axe-core 4.11**: 0 pelanggaran pada landing desktop, mobile, dialog form, pencarian,
  dan menu mobile.
- Tidak ada horizontal overflow pada 360, 390, 768, 1024, dan 1440.
- Semua route dirender statis saat `next build`.

## Deployment

- Repo: [FarelRA/kalanidhi](https://github.com/FarelRA/kalanidhi)
- Image: `ghcr.io/farelra/kalanidhi:latest` (ARM64)
- CI/CD: `.github/workflows/docker-release.yml` menjalankan lint, typecheck,
  build image, lalu push `latest` dan tag commit SHA ke GHCR.
- Infra: service `kalanidhi` di repo `FarelRA/nodus-infra`, route Traefik untuk
  `kalanidhi.site` dan `www.kalanidhi.site`.
- Deploy di server: `sudo -iu podman deploy kalanidhi`.
- Runtime env: `/home/podman/services/data/kalanidhi/.env`. Isi `CONVEX_URL`
  setelah deployment Convex tersedia, lalu jalankan deploy ulang.

## Batasan saat ini

Landing page ini adalah etalase produk dan alur pendaftaran. Autentikasi, katalog jalur
penuh, ruang belajar, verifikasi sertifikat, toko, dan dashboard peran masih berupa
dialog atau halaman rintisan. Form sudah menyimpan lead ke Convex bila
`NEXT_PUBLIC_CONVEX_URL` tersedia; tanpa itu, pengiriman hanya dicatat di server log.
