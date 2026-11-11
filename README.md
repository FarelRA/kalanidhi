# KalaNidhi Digital

Landing page untuk platform belajar praktik budaya Nusantara. Alurnya satu lingkaran:
**belajar, dinilai pengajar, mendapat sertifikat platform dan Kartu Karya, berkarya atau
berjualan, lalu kembali sebagai pengajar, penilai, atau pemasok.**

Sertifikat yang ditampilkan adalah sertifikat platform dengan kode verifikasi publik,
bukan sertifikasi pemerintah atau BNSP.

Arah visual, token warna, dan aturan gerak dijelaskan di [DESIGN.md](./DESIGN.md).

## Stack

- **Next.js 16.4**: App Router, React Server Components, Server Actions, Turbopack
- **React 19.3** dan **TypeScript 6**
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
npm run dev
npm run build
npm start
npm run lint
npm run typecheck
```

## Struktur

```
app/
  actions/lead.ts          Server Action + validasi Zod untuk formulir minat
  globals.css              Token warna, tipografi, tekstur kayu, reduced-motion, data saver
  layout.tsx               Font, metadata, header, footer, overlay provider, toaster
  page.tsx                 Komposisi landing page + JSON-LD
  not-found.tsx            Halaman 404
  robots.ts, sitemap.ts    SEO
components/
  landing/                 Section landing: bangku, lingkaran, rak bahan, jalur, pengajar,
                           karya, etika, musim, institusi, catatan peserta, FAQ, penutup
  layout/                  Header, footer, preferensi hemat kuota dan bahasa
  overlays/                Provider dialog, lead dialog, info dialog, tombol overlay
  forms/                   Form lead dan newsletter dengan useActionState
  search/                  Command palette
  ui/                      Primitif shadcn/ui yang disesuaikan
  brand/                   Logo bench ring dan wordmark
lib/
  content/                 Sumber konten landing, navigasi, dan konten overlay
  forms/lead.ts            Tipe dan state awal form lead
  preferences.ts           Store preferensi hemat kuota
  structured-data.ts       JSON-LD
  format.ts, search.ts     Helper
hooks/
  use-active-section.ts    Navigasi aktif via IntersectionObserver
  use-data-saver.ts        Preferensi hemat kuota
public/images/             Aset visual landing page
reference/                 Dokumen konteks proposal (bukan bagian runtime)
```

## Mengganti konten

Semua teks utama, nama, harga, jadwal, dan atribusi berada di:

- `lib/content/landing.ts` untuk hero, capaian, lingkaran, rak bahan, jalur,
  pengajar, karya, musim, etika, institusi, catatan peserta, FAQ, dan footer.
- `lib/content/overlays.ts` untuk dialog kebijakan, login, verifikasi, tentang, privasi,
  dan ketentuan.
- `lib/content/navigation.ts` untuk menu utama.

Gambar berada di `public/images/` dan diimpor sebagai static import di
`lib/content/landing.ts`. Ganti nama, harga, dan atribusi langsung di file tersebut;
komponen akan mengikuti.

## Keputusan implementasi

- **Server-first**: hampir semua section adalah Server Component. Client island hanya
  untuk dialog, pencarian, preferensi, dan form.
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
- **Gambar**: static import agar width, height, dan blur placeholder otomatis.
- **TypeScript 7 belum dipakai**: `typescript-eslint` di `eslint-config-next` belum
  mendukung TS 7. Proyek memakai TS 6.0 terbaru agar lint tetap berjalan.

## Verifikasi

- `npm run lint`, `npm run typecheck`, dan `npm run build` lulus.
- **axe-core 4.11**: 0 pelanggaran pada landing desktop, mobile, dialog form, pencarian,
  dan menu mobile.
- Tidak ada horizontal overflow pada 360, 390, 768, 1024, dan 1440.
- Semua route dirender statis saat `next build`.

## Batasan saat ini

Landing page ini adalah etalase produk dan alur pendaftaran. Autentikasi, katalog jalur
penuh, ruang belajar, verifikasi sertifikat, toko, dan dashboard peran masih berupa
dialog atau halaman rintisan. Form mendemonstrasikan validasi dan status sukses. Untuk
menyimpan data, sambungkan `app/actions/lead.ts` ke CRM atau basis data.
