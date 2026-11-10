# KalaNidhi Digital

Landing page untuk platform belajar seni dan kriya tradisi Nusantara.
Alurnya: **belajar, dinilai pengajar, tersertifikasi platform, berkarya dan berpenghasilan**.

Sertifikat yang ditampilkan adalah sertifikat platform dengan kode verifikasi publik,
bukan sertifikasi pemerintah atau BNSP.

Arah visual dan token desain dijelaskan di [DESIGN.md](./DESIGN.md).

## Stack

- **Next.js 16.4**: App Router, React Server Components, Server Actions, Turbopack
- **React 19.3** dan **TypeScript 6**
- **Tailwind CSS 4.3**: token desain di `app/globals.css`
- **shadcn/ui (Radix)**: primitif aksesibel untuk dialog, sheet, accordion, tooltip
- **Fraunces + Plus Jakarta Sans**: display editorial dan body
- **Embla Carousel**: filmstrip pengajar
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
  globals.css              Token warna, tipografi, utility, reduced-motion, data saver
  layout.tsx               Font, metadata, header, footer, overlay provider, toaster
  page.tsx                 Komposisi landing page + JSON-LD
  not-found.tsx            Halaman 404
  robots.ts, sitemap.ts    SEO
components/
  landing/                 Section landing dan komponen khas (Kartu Karya, Mangsa, Bagi Hasil)
  layout/                  Header, footer, preferensi hemat kuota dan bahasa
  overlays/                Provider dialog, lead dialog, info dialog, tombol overlay
  forms/                   Form lead dan newsletter dengan useActionState
  search/                  Command palette
  shared/                  SectionHeading
  ui/                      Primitif shadcn/ui yang disesuaikan
  brand/                   Logo wax drop dan wordmark
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
```

## Mengganti konten

Semua teks utama, nama, harga, jadwal, dan atribusi berada di:

- `lib/content/landing.ts` untuk hero, statistik, jalur, pengajar, karya, mangsa, etika, institusi, testimoni, FAQ, dan footer.
- `lib/content/overlays.ts` untuk dialog kebijakan, login, verifikasi, tentang, privasi, dan ketentuan.
- `lib/content/navigation.ts` untuk menu utama.

Gambar berada di `public/images/` dan diimpor sebagai static import di `lib/content/landing.ts`.
Ganti nama, harga, dan atribusi langsung di file tersebut; komponen akan mengikuti.

## Keputusan implementasi

- **Server-first**: hampir semua section adalah Server Component. Client island hanya untuk dialog, carousel, filter karya, pencarian, preferensi, dan form.
- **Satu momen gerak**: hanya hero plate dan Kartu Karya yang masuk dengan animasi. Tidak ada fade-up per section. Reduced motion dan mode hemat kuota dihormati.
- **Tipografi sebagai identitas**: Fraunces untuk headline dan pertanyaan, Plus Jakarta Sans untuk UI. Label section memakai italic serif, bukan eyebrow kapital.
- **Konten tetap terbaca tanpa JS**: animasi memakai CSS dan tidak menyembunyikan konten.
- **Aksesibilitas**: skip link, landmark, label form eksplisit, fokus terlihat, target sentuh, `aria-live` pada hasil, kontras teks dijaga.
- **Kepercayaan dan etika**: Kartu Sumber Budaya, rincian bagi hasil, penjelasan sertifikat platform, dan atribusi komunitas.
- **Gambar**: static import agar width, height, dan blur placeholder otomatis.
- **TypeScript 7 belum dipakai**: `typescript-eslint` di `eslint-config-next` belum mendukung TS 7. Proyek memakai TS 6.0 terbaru agar lint tetap berjalan.

## Verifikasi

- `npm run lint`, `npm run typecheck`, dan `npm run build` lulus.
- **axe-core 4.11**: 0 pelanggaran pada landing desktop, mobile, dialog form, dan command search.
- **Lighthouse (mobile, simulasi lokal)**: Accessibility 100, Best Practices 100, SEO 100. Performance berada di kisaran 70 sampai 80 karena hidrasi komponen interaktif masih dimuat di landing.
- Semua route dirender statis saat `next build`.

## Halaman lanjutan

Landing page sudah lengkap. Autentikasi, katalog jalur, ruang belajar, Kartu Karya,
verifikasi sertifikat, toko, dan dashboard peran masih berupa dialog atau halaman rintisan.
Form mendemonstrasikan validasi dan status sukses. Untuk menyimpan data, sambungkan
`app/actions/lead.ts` ke CRM atau basis data.
