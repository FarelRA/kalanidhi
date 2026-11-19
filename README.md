# KalaNidhi Digital

Landing page untuk platform belajar praktik budaya Nusantara. Alurnya berurutan:
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
`npx convex run seed/run:run --prod` setelah `npx convex deploy`.

`CONVEX_URL` wajib diisi saat build dan runtime. Tidak ada fallback konten statis:
landing selalu membaca `content.getSite` dari Convex. Jika deployment belum di-seed,
build gagal dengan pesan yang jelas.

### Akun seed dan login

Seed membuat akun peserta, pengajar, pembuat karya, dan pengelola dengan Better Auth,
bukan lagi `authUserId` placeholder. Setiap alamat didaftarkan sekali lewat
`signUpEmail`, lalu baris aplikasi asli dihubungkan ke subjek Better Auth yang asli;
baris duplikat yang dibuat trigger dihapus bersama role, consent, session, dan auth log
miliknya. Pemetaan email → subjek disimpan di `seedAuthAccounts`, di luar tabel yang
dibersihkan saat reseed, sehingga menjalankan ulang seed tidak gagal dengan
`USER_ALREADY_EXISTS`.

Kata sandi seed-only untuk akun yang dibuat seed: **`KalaNidhi2026!`**. Admin yang sudah
ada sebelum seed memakai kata sandinya sendiri. Jangan pakai kata sandi seed untuk akun
nyata. Contoh login peserta:

```bash
curl -X POST https://kalanidhi.site/api/auth/sign-in/email \
  -H 'content-type: application/json' \
  -H 'origin: https://kalanidhi.site' \
  -d '{"email":"sari.wulandari95@gmail.com","password":"KalaNidhi2026!"}'
```

Langkah `auth` berjalan setelah `audit` dan sebelum `integrity`; jika komponen Better
Auth tidak tersedia (misalnya di `convex-test`), seed tetap selesai dengan
`auth.unavailable: true` dan placeholder dipertahankan untuk pemeriksaan lokal.

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
  seed/run.ts              Orkestrasi seed, kunci run, dan riwayat
  seed/content/            Sumber data konten dan identitas
  seed/domains/            Seed per domain: people, curriculum, commerce, ops, dst.
  seed/lib/                Clock, kode, builder, lookup, media, dan helper bersama
  seed/integrity.ts        Pemeriksaan invarian setelah seed
components/
  landing/                 Section landing: hero, alur, bahan, kelas, pengajar,
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
  convex/server.ts         getSiteData, persistLead, dan deteksi konfigurasi Convex
  forms/lead.ts            Tipe dan state awal form lead
  preferences.ts           Store preferensi hemat kuota
  structured-data.ts       JSON-LD dari konten Convex
  format.ts, search.ts     Helper
hooks/
  use-active-section.ts    Navigasi aktif via IntersectionObserver
  use-data-saver.ts        Preferensi hemat kuota
seed/images/               Sumber unggah gambar; runtime memakai URL Convex storage
reference/                 Dokumen konteks proposal (bukan bagian runtime)
```

## Konten dari Convex

Semua teks utama, navigasi, dialog, metadata, dan copy section disimpan di Convex.
Tabel `siteContent` hanya menyimpan copy editorial dan pilihan `featured` (node mana
yang tampil di landing). Data entitas tidak disalin ke dokumen itu; landing membacanya
langsung dari tabel masing-masing:

- `catalogFields`: bidang budaya dan status kesiapannya
- `paths`: kelas belajar
- `teachers`: pengajar dan praktisi
- `works`: karya dan jasa
- `testimonials`: catatan peserta dan mitra
- `faqs`: pertanyaan umum
- `leads`: pendaftaran, konsultasi, institusi, dan langganan kabar

`convex/content.ts` merakit copy dan entitas terpilih menjadi satu objek `SiteData`
yang dipakai `app/layout.tsx` dan `app/page.tsx`. Server Component mengambil data lewat
`getSiteData()` di `lib/convex/server.ts`, lalu meneruskannya sebagai props ke section.
Gambar selalu berupa URL Convex storage; tidak ada copy landing atau gambar statis yang
diimpor langsung dari file publik.

Halaman admin Konten hanya untuk copywriting. Pemilihan kelas, pengajar, karya,
testimoni, bidang katalog, FAQ, dan karya untuk Kartu Karya hero dilakukan di halaman
`/ruang/konten/unggulan`. Data entitas tidak pernah diketik di editor konten.

### Mengubah konten

1. Copy landing diedit di Konten; simpan draf lalu terbitkan. Riwayat revisi tetap
   tersedia untuk pembalikan.
2. Pilihan node landing disimpan lewat halaman `/ruang/konten/unggulan`.
3. Untuk menambah kelas, pengajar, karya, atau bidang, tambahkan entri di
   `convex/seed/content/data.ts` atau dashboard domain terkait. Urutan tampil memakai field
   `order`.
4. Jalankan `npm run convex:seed` hanya bila ingin mengisi ulang seluruh data domain;
   tabel `leads` tidak dihapus.

Gambar sumber berada di `seed/images/`. Jalankan `npm run images:upload` untuk
mengunggahnya ke Convex storage dan mendaftarkannya di `mediaAssets`; seed akan gagal
jika ada `imageFile` yang belum terdaftar.

Katalog seed berisi lima kelas: tiga terbuka dan dua sedang disiapkan. Kelas terbuka
adalah Batik Bambu (Krebet, Sendangsari, Pajangan, Bantul), Aksara Jawa, dan Seni
Pembawa Acara Tradisi Jawa. Kriya Gerabah Bantul dan Batik Tulis berstatus
`comingSoon`; Batik Tulis tidak memiliki modul atau pelajaran karena materi batik tulis
di atas kain belum tersedia sebagai kurikulum. Kurikulum Batik Bambu diadaptasi dari
materi Paguyuban Batik Tulis Giriloyo untuk kain, lalu disesuaikan dengan proses bambu
dari Fitinline dan profil Desa Wisata Krebet (Jadesta Kementerian Pariwisata). Krebet
dikenal sebagai desa batik kayu; sebagian pengrajinnya juga membatik bambu.

## Keputusan implementasi

- **Server-first**: hampir semua section adalah Server Component. Client island hanya
  untuk dialog, pencarian, preferensi, dan form.
- **Convex sebagai sumber data**: konten diambil di server dengan `fetchQuery`, bukan
  diimpor dari file. Form memakai `fetchMutation` dan menyimpan lead ke tabel `leads`.
- **Tanpa fallback entitas**: tanpa data Convex, build gagal dengan pesan yang jelas.
  Admin tidak mengetik data entitas; landing membacanya langsung dari tabel domain.
- **Satu momen gerak**: hanya foto hero dan tag Kartu Karya yang masuk dengan
  animasi. Tidak ada fade-up per section. Reduced motion dan mode hemat kuota
  dihormati.
- **Tipografi sebagai identitas**: Fraunces untuk headline dan kutipan, Karla untuk UI.
  Label section memakai stempel kapital, bukan eyebrow dekoratif.
- **Alur sebagai struktur**: lima langkah berurutan, dengan langkah terakhir
  sebagai kesempatan tambahan setelah lulus, bukan tujuan utama.
- **Konten tetap terbaca tanpa JS**: animasi memakai CSS dan tidak menyembunyikan konten.
- **Aksesibilitas**: skip link, landmark, label form eksplisit, fokus terlihat, target
  sentuh, `aria-live` pada hasil, kontras teks dijaga.
- **Kepercayaan dan etika**: Kartu Sumber Budaya untuk setiap sumber pengetahuan,
  rincian bagi hasil 70/15/15, penjelasan sertifikat platform, dan atribusi komunitas.
  Dokumen sumber dipegang pengelola platform dan izin publikasinya tercatat atas nama
  pengelola, dengan rujukan “Arsip dokumen pengelola platform”. Tanggal izin selalu
  jatuh setelah materi sumbernya.
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

Situs publik mencakup landing, katalog bidang, kelas, pengajar, karya dan jasa, etika,
verifikasi sertifikat, serta halaman pendaftaran dan pesanan. Ruang kerja `/ruang`
sudah memuat alur belajar, tugas, kredensial, commerce, pesan, panggilan, konten, dan
tata kelola sesuai peran. Isi halaman bergantung pada data Convex hasil seed; panggilan
live dan gateway pembayaran memerlukan layanan eksternal yang dijelaskan di
`docs/self-hosting.md` dan `docs/payments-gateway.md`.

Halaman kelas membuka pelajaran dalam tiga tingkat: `public` untuk semua pengunjung,
`enrolled` untuk peserta dengan pendaftaran aktif atau selesai di kelas itu, dan
`certified` untuk pemegang sertifikat terbit di kelas itu. Pelajaran terkunci hanya
menampilkan cuplikan singkat; isi dan medianya dimuat saat dibuka.
