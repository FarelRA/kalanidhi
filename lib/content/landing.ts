import type { StaticImageData } from "next/image"

import heroImage from "@/public/images/hero-canting.jpg"
import pathBatik from "@/public/images/path-batik.jpg"
import pathPranatacara from "@/public/images/path-pranatacara.jpg"
import pathUkir from "@/public/images/path-ukir.jpg"
import teacherHardjono from "@/public/images/teacher-hardjono.jpg"
import teacherSriningsih from "@/public/images/teacher-sriningsih.jpg"
import teacherSudarsono from "@/public/images/teacher-sudarsono.jpg"
import workSoga from "@/public/images/work-soga.jpg"
import workNitik from "@/public/images/work-nitik.jpg"
import workSutra from "@/public/images/work-sutra.jpg"
import workPranatacara from "@/public/images/work-pranatacara.jpg"

export type Metric = {
  value: string
  label: string
}

export type LoopStage = {
  code: string
  title: string
  description: string
}

export type CatalogField = {
  name: string
  region: string
  status: "Terbuka" | "Sedang dipetakan" | "Direncanakan"
  note: string
}

export type LearningPath = {
  slug: string
  code: string
  title: string
  subtitle: string
  teacher: string
  teacherRole: string
  region: string
  level: string
  modules: number
  weeks: number
  tasks: number
  price: number | null
  priceLabel?: string
  image: StaticImageData
  tags: string[]
  outcome: string
  includes: string[]
  comingSoon?: boolean
}

export type Teacher = {
  slug: string
  name: string
  initials: string
  specialty: string
  region: string
  experience: string
  quote: string
  focus: string
  path: string
  community: string
  image: StaticImageData
  verified: true
}

export type Work = {
  slug: string
  title: string
  category: "batik" | "layanan"
  kind: "product" | "service"
  maker: string
  makerRole: string
  teacher: string
  region: string
  price: number
  priceLabel?: string
  unit: string
  technique: string
  techniqueNote: string
  workCard: string
  description: string
  image: StaticImageData
}

export type Faq = {
  question: string
  answer: string
}

export type Testimonial = {
  quote: string
  name: string
  role: string
  city: string
  initials: string
}

export const hero = {
  title: ["Duduk di bangku ini.", "Nanti kamu yang mengajari."],
  description:
    "KalaNidhi Digital mempertemukan pelajar dengan pengajar batik, tenun, ukir, karawitan, tari, pranatacara, dan praktik hidup lain di Nusantara. Kerjakan tugas dengan tangan, kirim hasilnya, terima koreksi pengajar, lalu bawa karya atau jasamu ke pembeli. Lulusan yang siap kembali mengajar dan membuka jalur untuk pelajar berikutnya.",
  primaryCta: "Pilih jalur yang terbuka",
  secondaryCta: "Lihat lingkarannya",
  plate: {
    image: heroImage,
    alt: "Tangan membatik dengan canting di atas kain",
    caption: "Proses canting, Giriloyo",
    note: "Difoto bersama pengajar, 2026",
  },
  workCard: {
    title: "Kartu Karya",
    serial: "KN-8821",
    work: "Kain Batik Soga Anyaman",
    maker: "Anisa Rahmawati",
    teacher: "Bambang Hardjono",
  },
}

export const traction = {
  label: "Capaian 2026",
  note: "Angka capaian di Yogyakarta dan Jawa Tengah, bukan proyeksi nasional.",
  figures: [
    { value: "10", label: "bidang budaya dipetakan" },
    { value: "14", label: "pengajar dan praktisi" },
    { value: "24", label: "peserta" },
    { value: "36", label: "tugas dinilai" },
    { value: "12", label: "karya dan jasa" },
  ] satisfies Metric[],
}

export const loop = {
  label: "Cara kerja",
  title: "Satu bangku, lima langkah, lalu kembali ke awal.",
  description:
    "Belajar, dinilai, tersertifikasi, berkarya. Empat langkah inti itu berputar di bangku yang sama. Langkah kelima membuka jalur kembali: lulusan bisa menjadi pengajar pendamping, penilai, atau pemasok. Dari situ jalur baru dibuka, dan pelajar baru masuk.",
  returnLabel: "jalur kembali",
  returnNote:
    "Karya yang selesai dibawa kembali ke bangku pertama. Lulusan yang mengajar menaruh alatnya di rak, dan pelajar berikutnya duduk.",
  stages: [
    {
      code: "01",
      title: "Belajar",
      description:
        "Modul, bacaan, dan latihan dari pengajar yang masih mengerjakan praktiknya.",
    },
    {
      code: "02",
      title: "Dinilai",
      description:
        "Kirim foto atau rekaman proses. Pengajar memberi catatan, anotasi, dan keputusan lanjut atau revisi.",
    },
    {
      code: "03",
      title: "Tersertifikat",
      description:
        "Sertifikat platform dengan kode verifikasi publik, ditambah Kartu Karya yang mencatat proses.",
    },
    {
      code: "04",
      title: "Berkarya",
      description:
        "Karya atau jasa tampil dengan Kartu Karya. Pembeli melihat pembuat, teknik, dan bagi hasil.",
    },
    {
      code: "05",
      title: "Kembali mengajar",
      description:
        "Lulusan dapat mengajukan diri sebagai pengajar pendamping, penilai, atau pemasok. Pasokan dan jalur baru tumbuh dari sini.",
    },
  ] satisfies LoopStage[],
}

export const catalog = {
  label: "Rak bahan",
  title: "Rak ini tumbuh satu per satu, bersama pengajarnya.",
  description:
    "Katalog tumbuh dari pengajar yang masuk. Rak di bawah menunjukkan mana yang sudah bisa dikerjakan sekarang, mana yang sedang disiapkan, dan mana yang masih menunggu pengajar.",
  note: "Praktisi dari daerah lain bisa mengajukan jalur. Basis layanan saat ini Yogyakarta dan Jawa Tengah; pembukaan jalur mengikuti kesiapan kurikulum dan izin komunitas.",
  fields: [
    {
      name: "Batik tulis",
      region: "Giriloyo, Yogyakarta",
      status: "Terbuka",
      note: "Jalur aktif",
    },
    {
      name: "Pranatacara",
      region: "Surakarta",
      status: "Terbuka",
      note: "Jalur aktif",
    },
    {
      name: "Kriya ukir kayu",
      region: "Jepara",
      status: "Sedang dipetakan",
      note: "Kurikulum disusun",
    },
    {
      name: "Tenun",
      region: "Troso, Jepara",
      status: "Sedang dipetakan",
      note: "Pengajar dijajaki",
    },
    {
      name: "Karawitan",
      region: "Surakarta",
      status: "Sedang dipetakan",
      note: "Pengajar dijajaki",
    },
    {
      name: "Tari tradisi",
      region: "Yogyakarta",
      status: "Direncanakan",
      note: "Belum ada pengajar",
    },
    {
      name: "Keramik",
      region: "Jawa Tengah",
      status: "Direncanakan",
      note: "Belum ada pengajar",
    },
    {
      name: "Kuliner tradisi",
      region: "Yogyakarta",
      status: "Direncanakan",
      note: "Belum ada pengajar",
    },
    {
      name: "Jamu",
      region: "Surakarta",
      status: "Direncanakan",
      note: "Belum ada pengajar",
    },
    {
      name: "Wayang",
      region: "Surakarta",
      status: "Direncanakan",
      note: "Belum ada pengajar",
    },
  ] satisfies CatalogField[],
}

export const paths: LearningPath[] = [
  {
    slug: "batik-tulis-soga",
    code: "Jalur 01",
    title: "Batik Tulis Soga",
    subtitle: "Dari canting pertama sampai kain siap karya",
    teacher: "Bambang Hardjono",
    teacherRole: "Pengajar batik Giriloyo",
    region: "Giriloyo, Yogyakarta",
    level: "Pemula sampai menengah",
    modules: 8,
    weeks: 6,
    tasks: 3,
    price: 1_450_000,
    image: pathBatik,
    tags: ["Dengan paket bahan", "Sertifikat platform"],
    outcome:
      "Sepotong kain batik tulis dengan motif geometris, lengkap dengan catatan proses untuk Kartu Karya.",
    includes: [
      "8 modul video dan bacaan terstruktur",
      "Paket canting, malam, dan kain primis",
      "3 tugas praktik dinilai pengajar",
      "Sertifikat platform dan Kartu Karya",
    ],
  },
  {
    slug: "pranatacara-jawa",
    code: "Jalur 02",
    title: "Seni Pembawa Acara Tradisi Jawa",
    subtitle: "Tata wicara, urutan acara, dan etiket panggung",
    teacher: "Widagdo Saputra",
    teacherRole: "Pembina pembawa acara adat",
    region: "Surakarta",
    level: "Terbuka umum",
    modules: 6,
    weeks: 4,
    tasks: 3,
    price: 980_000,
    image: pathPranatacara,
    tags: ["Kelas live", "Sertifikat platform"],
    outcome:
      "Rekaman praktik dengan susunan acara lengkap, catatan pengajar, dan sertifikat platform.",
    includes: [
      "6 modul video dan latihan tata wicara",
      "2 sesi live bersama pengajar",
      "3 rekaman praktik yang dinilai",
      "Sertifikat platform dan portofolio jasa",
    ],
  },
  {
    slug: "kriya-ukir-jepara",
    code: "Jalur 03",
    title: "Kriya Ukir Kayu Jepara",
    subtitle: "Prinsip ukir, alat, dan ornamen sulur",
    teacher: "Pengajar dari Jepara",
    teacherRole: "Kurikulum dalam penyusunan",
    region: "Jepara",
    level: "Pemula",
    modules: 0,
    weeks: 0,
    tasks: 0,
    price: null,
    priceLabel: "Sedang disusun",
    image: pathUkir,
    tags: ["Sedang disusun"],
    outcome:
      "Pengantar prinsip ukir kayu, perawatan alat, dan perancangan ornamen sulur. Kurikulum sedang disusun bersama pengrajin Jepara.",
    includes: [
      "Kurikulum dalam penyusunan",
      "Daftar tunggu dibuka",
      "Materi menyusul",
    ],
    comingSoon: true,
  },
]

export const teachers: Teacher[] = [
  {
    slug: "bambang-hardjono",
    name: "Bambang Hardjono",
    initials: "BH",
    specialty: "Pengajar batik halus",
    region: "Giriloyo, D.I. Yogyakarta",
    experience: "38 tahun membatik",
    quote:
      "Canting yang stabil lebih penting daripada motif yang rumit. Saya minta murid berhenti sebentar sebelum meneteskan lilin.",
    focus: "Batik tulis dan pewarnaan soga",
    path: "Batik Tulis Soga",
    community: "Sanggar Soga Giriloyo",
    image: teacherHardjono,
    verified: true,
  },
  {
    slug: "sri-sriningsih",
    name: "Sri Sriningsih",
    initials: "SS",
    specialty: "Ahli pewarnaan alami",
    region: "Lasem, Jawa Tengah",
    experience: "32 tahun pewarnaan alami",
    quote:
      "Warna alami tidak bisa dipaksa. Kalau bahan dan musimnya tepat, hasilnya justru lebih tenang.",
    focus: "Pewarna alami dan ekstraksi nila",
    path: "Batik Tulis Soga",
    community: "Rumah Warna Lasem",
    image: teacherSriningsih,
    verified: true,
  },
  {
    slug: "widagdo-saputra",
    name: "Widagdo Saputra",
    initials: "WS",
    specialty: "Instruktur tata upacara",
    region: "Surakarta",
    experience: "30 tahun tata upacara",
    quote:
      "Pembawa acara yang baik mengatur napas acara. Kalimatnya jelas, urutannya tidak membuat tamu menunggu.",
    focus: "Pembawa acara adat dan protokol",
    path: "Seni Pembawa Acara Tradisi Jawa",
    community: "Sanggar Wicara Surakarta",
    image: teacherSudarsono,
    verified: true,
  },
]

export const works: Work[] = [
  {
    slug: "batik-soga-anyaman",
    title: "Kain Batik Soga Anyaman",
    category: "batik",
    kind: "product",
    maker: "Anisa Rahmawati",
    makerRole: "Lulusan jalur Batik Tulis",
    teacher: "Bambang Hardjono",
    region: "Yogyakarta",
    price: 1_450_000,
    unit: "Kain panjang, 2,5 x 1,05 m",
    technique: "Tulis",
    techniqueNote: "Canting tangan",
    workCard: "KN-8821",
    description:
      "Pewarna soga dari kulit tingi dan jambal, dengan motif geometris yang disusun ulang dari pola klasik Giriloyo. Proses pembuatan tercatat dalam 12 foto bertanggal.",
    image: workSoga,
  },
  {
    slug: "selendang-canting-nitik",
    title: "Selendang Canting Nitik",
    category: "batik",
    kind: "product",
    maker: "Dimas Yoga Pratama",
    makerRole: "Lulusan jalur Batik Tulis",
    teacher: "Sri Sriningsih",
    region: "Surakarta",
    price: 850_000,
    unit: "Selendang primis, 2 x 0,55 m",
    technique: "Tulis",
    techniqueNote: "Titik canting halus",
    workCard: "KN-9014",
    description:
      "Selendang primis dengan titik canting rapat. Panduan perawatan dan kartu bahan disertakan.",
    image: workNitik,
  },
  {
    slug: "batik-soga-lereng",
    title: "Batik Tulis Soga Lereng",
    category: "batik",
    kind: "product",
    maker: "Bambang Purnomo",
    makerRole: "Lulusan jalur lanjutan",
    teacher: "Bambang Hardjono",
    region: "Yogyakarta",
    price: 2_900_000,
    unit: "Kain halus, sutra ATBM",
    technique: "Tulis",
    techniqueNote: "14 tahap pewarnaan",
    workCard: "KN-9147",
    description:
      "Karya lanjutan dengan 14 tahap pewarnaan soga. Motif lereng klasik, bukan motif sakral.",
    image: workSutra,
  },
  {
    slug: "pranatacara-siraman",
    title: "Pembawa Acara Siraman dan Midodareni",
    category: "layanan",
    kind: "service",
    maker: "Rani Wikaningsih",
    makerRole: "Praktisi tersertifikasi platform",
    teacher: "Widagdo Saputra",
    region: "Yogyakarta dan sekitarnya",
    price: 2_500_000,
    priceLabel: "Mulai dari",
    unit: "Layanan acara, 1 hari",
    technique: "Layanan",
    techniqueNote: "Pembawa acara adat",
    workCard: "KN-JS-014",
    description:
      "Permintaan booking untuk rangkaian siraman dan midodareni. Susunan acara dikonfirmasi bersama praktisi.",
    image: workPranatacara,
  },
]

export const worksNote =
  "Sepanjang 2026 tercatat 12 karya dan jasa. Empat ditampilkan di halaman ini."

export const mangsa = {
  label: "Musim di bangku",
  season: "Musim I",
  name: "Kasa",
  period: "22 Juni - 1 Agustus",
  eyebrow: "Pranata mangsa",
  title: "Musim kering, waktu kain dijemur dan warna dimatangkan.",
  description:
    "Kasa membuka penanggalan Pranata Mangsa. Cuaca cenderung terang dan kering, angin stabil, dan kelembapan rendah. Di Giriloyo, bulan ini dipakai untuk menjemur kain setelah pelorodan dan mengeringkan lapisan lilin sebelum pewarnaan berikutnya.",
  activities: ["Menjemur kain", "Fermentasi warna", "Menyiapkan motif"],
  note: "Penanggalan dan ciri musim berbeda antar daerah. Catatan ini disusun dari wawancara pengajar Giriloyo, bukan prakiraan cuaca.",
}

export const ethics = {
  label: "Aturan bengkel",
  title: "Setiap pengetahuan membawa nama, izin, dan pembagian.",
  description:
    "Kartu Sumber Budaya tampil di jalur, karya, dan pustaka. Isinya mencatat komunitas sumber, pemberi izin, tanggal persetujuan, tingkat akses, dan aliran nilai ekonomi. Kami menuliskannya sebelum kamu memutuskan.",
  principles: [
    {
      title: "Sumber yang bisa dilacak",
      description:
        "Komunitas, pengajar, dan rujukan tercatat di setiap jalur dan karya. Tidak ada pengetahuan tanpa asal.",
    },
    {
      title: "Izin dan tingkat akses",
      description:
        "Pengetahuan bisa publik, berbayar, atau terbatas komunitas. Materi terbatas tidak dibuka tanpa persetujuan.",
    },
    {
      title: "Bagi hasil sebelum transaksi",
      description:
        "Rincian pembagian ditampilkan saat kamu masih bisa memutuskan, bukan setelah uang berpindah.",
    },
  ],
  accessLevels: [
    { label: "Publik", note: "Terbuka untuk semua pengunjung." },
    { label: "Berbayar", note: "Terbuka untuk pelajar yang terdaftar." },
    {
      label: "Terbatas komunitas",
      note: "Dibagikan hanya dengan izin pemilik pengetahuan.",
    },
  ],
  share: [
    {
      label: "Pengajar dan pembuat karya",
      value: 70,
      note: "Imbalan bimbingan dan kompensasi langsung pembuat karya.",
    },
    {
      label: "Dana komunitas dan sanggar",
      value: 15,
      note: "Konservasi bahan, perawatan alat, dan kegiatan sanggar.",
    },
    {
      label: "Operasional platform",
      value: 15,
      note: "Verifikasi, sertifikat, dan pengelolaan pengiriman paket.",
    },
  ],
  attribution: {
    permission: "Izin berbagi pengetahuan tercatat 12 Maret 2026",
    access: "Publik",
    reference: "Rujukan: arsip sanggar dan wawancara pengajar, 2026",
    sources: [
      {
        initials: "SG",
        name: "Sanggar Soga Giriloyo",
        field: "Batik tulis dan pewarnaan soga",
      },
      {
        initials: "SW",
        name: "Sanggar Wicara Surakarta",
        field: "Pranatacara dan tata upacara",
      },
    ],
  },
}

export const testimonials: Testimonial[] = [
  {
    quote:
      "Saya kira belajar dari video sudah cukup. Setelah pengajar menandai bagian canting yang tekanannya terlalu kuat, kain saya jadi lebih rata. Tiga bulan kemudian saya berani membuka pesanan kecil.",
    name: "Sari Wulandari",
    role: "Karyawan kreatif, pelajar batik",
    city: "Yogyakarta",
    initials: "SW",
  },
  {
    quote:
      "Kami memakai jalur batik untuk muatan lokal. Laporan progres membantu saya melihat siswa mana yang perlu pendampingan, bukan hanya nilai akhir.",
    name: "Dwi Lestari",
    role: "Guru SD, mitra institusi",
    city: "Sleman",
    initials: "DL",
  },
  {
    quote:
      "Saya butuh pembawa acara yang hafal urutan siraman dan bisa datang lebih awal. Portofolio video di halaman profil membuat saya bisa memilih tanpa menelepon satu per satu.",
    name: "Bayu Pratama",
    role: "Pemilik wedding organizer",
    city: "Surakarta",
    initials: "BP",
  },
]

export const institution = {
  label: "Untuk institusi",
  title: "Bawa kelasmu ke bangku.",
  description:
    "Program institusi disusun setelah sesi pemetaan kebutuhan. Belum ada paket siap pakai; kurikulum, jumlah peserta, dan izin dibicarakan lebih dulu.",
  segments: ["Sekolah", "EO dan wedding organizer", "Desa wisata dan hotel", "Korporat"],
  points: [
    "Kurikulum disesuaikan dengan jumlah peserta dan durasi",
    "Laporan progres dan rekap kehadiran setiap pekan",
    "Alokasi kursi, jadwal, dan penagihan institusi",
    "Pendampingan kurator untuk konteks budaya dan izin",
  ],
  brief: [
    ["Format", "Kelas mandiri dan sesi kurator"],
    ["Durasi", "4-6 pekan"],
    ["Laporan", "Progres dan kehadiran"],
    ["Kursi minimum", "12 peserta"],
  ],
  cta: "Minta penawaran",
  note: "Paket dan harga disusun setelah sesi pemetaan kebutuhan.",
}

export const faqs: Faq[] = [
  {
    question: "Apa yang membuat KalaNidhi Digital berbeda dari kursus video?",
    answer:
      "Kamu mengirim proses kerja, bukan hanya menonton. Pengajar memeriksa foto atau rekaman, memberi catatan pada bagian tertentu, dan memutuskan lanjut atau revisi. Penilaian manusia itu yang menghubungkan belajar dengan sertifikat dan karya.",
  },
  {
    question: "Bagaimana lulusan bisa kembali sebagai pengajar?",
    answer:
      "Setelah menyelesaikan jalur lanjutan dan dinilai, lulusan bisa mengajukan diri sebagai pengajar pendamping, penilai tugas, atau pemasok bahan dan karya. Pengajuan ditinjau bersama pengajar senior dan kurator. Jalur baru dibuka bila pengajar, kurikulum, dan izinnya sudah siap.",
  },
  {
    question: "Bidang apa saja yang bisa dipelajari?",
    answer:
      "Sepuluh bidang sudah dipetakan, dari batik tulis dan pranatacara sampai tenun, karawitan, tari, keramik, kuliner tradisi, jamu, dan wayang. Dua jalur sudah terbuka. Jalur lain dibuka bertahap setelah kurikulum dan izin komunitas selesai.",
  },
  {
    question: "Bagaimana pengajar menilai tugas praktik saya?",
    answer:
      "Unggah foto jarak dekat atau rekaman suara dari aplikasi. Pengajar memberi catatan pada bagian tertentu, voice note, dan keputusan lanjut atau revisi. Umpan balik dikirim dalam 3 hari kerja.",
  },
  {
    question: "Apakah sertifikat ini diakui pemerintah?",
    answer:
      "Tidak. Sertifikat KalaNidhi Digital adalah sertifikat platform, bukan sertifikasi pemerintah atau BNSP. Sertifikat mencatat kompetensi, pengajar penilai, dan kode verifikasi publik yang bisa dicek lewat halaman verifikasi.",
  },
  {
    question: "Bagaimana hak budaya dan bagi hasil dijaga?",
    answer:
      "Setiap jalur dan karya menampilkan Kartu Sumber Budaya: komunitas sumber, pemberi izin, tanggal persetujuan, dan tingkat akses. Rincian bagi hasil ditampilkan sebelum transaksi, saat kamu masih bisa memutuskan.",
  },
  {
    question: "Saya hanya ingin membeli karya. Apakah harus ikut kelas?",
    answer:
      "Tidak. Kamu bisa langsung menjelajahi etalase karya lulusan dan pengajar. Setiap karya punya Kartu Karya yang menjelaskan pembuat, teknik, dan jejak prosesnya.",
  },
]

export const footer = {
  description:
    "Platform belajar praktik budaya Nusantara. Dinilai pengajar, tersertifikasi platform, lalu tersambung ke karya dan jasa. Lulusan dapat kembali sebagai pengajar, penilai, atau pemasok.",
  columns: [
    {
      title: "Isi bangku",
      links: [
        { label: "Lingkaran", href: "#lingkaran" },
        { label: "Rak bahan", href: "#indeks" },
        { label: "Jalur belajar", href: "#jalur" },
        { label: "Pengajar", href: "#pengajar" },
        { label: "Karya dan jasa", href: "#karya" },
      ],
    },
    {
      title: "Platform",
      links: [
        { label: "Etika dan hak budaya", href: "#etika" },
        { label: "Untuk institusi", href: "#institusi" },
        { label: "Pertanyaan umum", href: "#faq" },
        { label: "Tentang KalaNidhi Digital", href: "#faq" },
      ],
    },
  ],
  secretariat: {
    label: "Sekretariat",
    value: "Yogyakarta dan Surakarta, Indonesia",
  },
  edition: "Edisi 2026",
  copyright: "© 2026 KalaNidhi Digital. Dibuat di Yogyakarta.",
}
