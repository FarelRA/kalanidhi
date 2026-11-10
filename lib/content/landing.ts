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

export type AuditNote = {
  label: string
  value: string
  note?: string
}

export type Stat = {
  icon: "award" | "book" | "trending" | "handshake"
  value: number
  prefix?: string
  suffix?: string
  label: string
  note: string
}

export type Step = {
  number: string
  icon: "package" | "pen" | "qr" | "store" | "cycle"
  title: string
  description: string
  footer: string
}

export type LearningPath = {
  slug: string
  title: string
  subtitle: string
  teacher: string
  teacherRole: string
  region: string
  level: string
  modules: number
  weeks: number
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
  image: heroImage,
  title: ["Belajar dari ahlinya.", "Berkarya dengan izin.", "Kembali membuka jalur."],
  description:
    "KalaNidhi Digital mempertemukan pelajar dengan pengajar berbagai praktik budaya Nusantara, dari batik dan tenun sampai karawitan, tari, pranatacara, jamu, dan keramik. Belajar lewat modul dan paket bahan, kirim tugas untuk dikoreksi pengajar, lalu bawa karya atau jasamu ke pembeli. Lulusan yang siap bisa kembali sebagai pengajar, penilai, atau pemasok, sehingga jalur baru lahir dari orang yang sudah menjalaninya. Basis awal kami di Yogyakarta dan Jawa Tengah, dan platform terbuka untuk praktisi dari berbagai daerah.",
  primaryCta: "Mulai belajar",
  secondaryCta: "Jelajahi karya",
  workCard: {
    title: "Kartu Karya",
    serial: "KN-8821",
    work: "Kain Batik Soga Anyaman",
    maker: "Anisa Rahmawati",
    teacher: "Bambang Hardjono",
  },
}

export const stats: Stat[] = [
  {
    icon: "book",
    value: 10,
    label: "Bidang budaya",
    note: "Dari batik sampai keramik, dipetakan bertahap",
  },
  {
    icon: "award",
    value: 14,
    label: "Pengajar & praktisi",
    note: "Yogyakarta, Surakarta, Lasem, dan Jepara",
  },
  {
    icon: "handshake",
    value: 24,
    label: "Peserta uji coba",
    note: "Kohort pertama, Juli-September 2026",
  },
  {
    icon: "trending",
    value: 36,
    label: "Tugas dinilai",
    note: "Koreksi langsung oleh pengajar",
  },
]

export const culturalFields = {
  label: "Bidang yang sedang dipetakan",
  note: "Sepuluh bidang ini adalah katalog yang tumbuh. Jalur baru dibuka bertahap bersama pengajar di bidangnya.",
  items: [
    "Batik",
    "Tenun",
    "Ukir",
    "Karawitan",
    "Tari",
    "Pranatacara",
    "Kuliner tradisi",
    "Jamu",
    "Wayang",
    "Keramik",
  ],
}

export const steps: Step[] = [
  {
    number: "01",
    icon: "package",
    title: "Materi & paket bahan",
    description:
      "Belajar per modul lewat video, bacaan, dan latihan. Paket bahan untuk jalur pilihan dikirim ke alamatmu.",
    footer: "Paket terkirim",
  },
  {
    number: "02",
    icon: "pen",
    title: "Bimbingan langsung dari pengajar",
    description:
      "Unggah foto atau rekaman proses. Pengajar memberi koreksi teknis lewat catatan, anotasi, dan voice note.",
    footer: "Dinilai langsung",
  },
  {
    number: "03",
    icon: "qr",
    title: "Sertifikat platform & Kartu Karya",
    description:
      "Selesaikan tugas praktik dan dapatkan sertifikat dengan kode verifikasi publik, sekaligus Kartu Karya untuk karya pertamamu. Sertifikat mencatat pengajar penilai dan kompetensi yang kamu capai.",
    footer: "Bisa diverifikasi",
  },
  {
    number: "04",
    icon: "store",
    title: "Karya, jasa, dan pesanan",
    description:
      "Tampilkan karya di etalase atau buka layanan. Pembeli melihat Kartu Karya dan rincian bagi hasil sebelum memesan.",
    footer: "Karya menemukan pembeli",
  },
  {
    number: "05",
    icon: "cycle",
    title: "Kembali mengajar",
    description:
      "Lulusan yang sudah siap bisa mengajar, menilai tugas, atau memasok bahan dan karya. Dari situ jalur baru dibuka untuk pelajar berikutnya, dan lingkaran berjalan lagi.",
    footer: "Lingkaran berlanjut",
  },
]

export const paths: LearningPath[] = [
  {
    slug: "batik-tulis-soga",
    title: "Batik Tulis Soga",
    subtitle: "Dari canting pertama sampai kain siap karya",
    teacher: "Bambang Hardjono",
    teacherRole: "Pengajar batik Giriloyo",
    region: "Giriloyo, Yogyakarta",
    level: "Pemula sampai menengah",
    modules: 8,
    weeks: 6,
    price: 1_450_000,
    image: pathBatik,
    tags: ["Dengan kit", "Bersertifikat"],
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
    title: "Seni Pembawa Acara Tradisi Jawa",
    subtitle: "Tata wicara, urutan acara, dan etiket panggung",
    teacher: "Widagdo Saputra",
    teacherRole: "Pembina pembawa acara adat",
    region: "Surakarta",
    level: "Terbuka umum",
    modules: 6,
    weeks: 4,
    price: 980_000,
    image: pathPranatacara,
    tags: ["Kelas live", "Bersertifikat"],
    outcome:
      "Rekaman praktik dengan susunan acara lengkap, catatan pengajar, dan sertifikat platform.",
    includes: [
      "6 modul video dan latihan tata wicara",
      "2 sesi live bersama pengajar",
      "Umpan balik rekaman praktik",
      "Sertifikat platform dan portofolio jasa",
    ],
  },
  {
    slug: "kriya-ukir-jepara",
    title: "Kriya Ukir Kayu Jepara",
    subtitle: "Prinsip ukir, alat, dan ornamen sulur",
    teacher: "Pengajar dari Jepara",
    teacherRole: "Kurikulum dalam penyusunan",
    region: "Jepara",
    level: "Pemula",
    modules: 0,
    weeks: 0,
    price: null,
    priceLabel: "Segera hadir",
    image: pathUkir,
    tags: ["Segera hadir"],
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
    title: "Pembawa Acara Siraman & Midodareni",
    category: "layanan",
    kind: "service",
    maker: "Rani Wikaningsih",
    makerRole: "Praktisi tersertifikasi platform",
    teacher: "Widagdo Saputra",
    region: "Yogyakarta & sekitarnya",
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

export const mangsa = {
  season: "Musim I",
  name: "Kasa",
  period: "22 Juni - 1 Agustus",
  eyebrow: "Pranata Mangsa",
  title: "Musim kering, waktu kain dijemur dan warna dimatangkan.",
  description:
    "Kasa membuka tahun Pranata Mangsa. Cuaca cenderung terang dan kering, angin stabil, dan kelembapan rendah. Di Giriloyo, bulan ini dipakai untuk menjemur kain setelah pelorodan dan mengeringkan lapisan lilin sebelum pewarnaan berikutnya.",
  metrics: [
    { label: "Suhu rata-rata", value: "27-30°C", icon: "sun" as const },
    { label: "Kelembapan", value: "60%", icon: "droplets" as const },
    { label: "Angin", value: "Tenggara, stabil", icon: "wind" as const },
  ],
  activities: ["Menjemur kain", "Fermentasi warna", "Menyiapkan motif"],
}

export const shareBreakdown = [
  {
    label: "Pengajar & pembuat karya",
    value: 70,
    note: "Imbalan bimbingan dan kompensasi langsung pembuat karya.",
  },
  {
    label: "Dana komunitas & sanggar",
    value: 15,
    note: "Konservasi bahan, perawatan alat, dan kegiatan sanggar.",
  },
  {
    label: "Operasional platform",
    value: 15,
    note: "Verifikasi, sertifikat, dan pengelolaan pengiriman paket.",
  },
]

export const attribution = {
  label: "Kartu sumber budaya",
  permission: "Izin berbagi pengetahuan tercatat 12 Maret 2026",
  access: "Publik",
  summary: "Sanggar Soga Giriloyo (batik) dan Sanggar Wicara Surakarta (pranatacara)",
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
      field: "Pranatacara dan tata upacara Jawa",
    },
  ],
  note: "Dua sumber ini menaungi jalur yang sudah terbuka. Bidang lain menyusul bersama pengajar dan komunitasnya.",
}

export const testimonials: Testimonial[] = [
  {
    quote:
      "Saya kira belajar dari video sudah cukup. Setelah pengajar menandai bagian canting yang tekanannya terlalu kuat, kain saya jadi lebih rata. Tiga bulan kemudian saya berani membuka pesanan kecil.",
    name: "Sari Wulandari",
    role: "Peserta uji coba, pelajar batik",
    city: "Jakarta",
    initials: "SW",
  },
  {
    quote:
      "Kami memakai jalur batik untuk muatan lokal. Laporan progres membantu saya melihat siswa mana yang perlu pendampingan, bukan hanya nilai akhir.",
    name: "Dwi Lestari",
    role: "Guru SD, mitra uji coba",
    city: "Sleman",
    initials: "DL",
  },
  {
    quote:
      "Saya butuh pembawa acara yang hafal urutan siraman dan bisa datang lebih awal. Portofolio video di halaman profil membuat saya bisa memilih tanpa menelepon satu per satu.",
    name: "Bayu Pratama",
    role: "Pemilik wedding organizer, pengguna uji coba",
    city: "Surabaya",
    initials: "BP",
  },
]

export const institution = {
  eyebrow: "Untuk institusi",
  title: "Belajar budaya untuk kelas, tim, dan tamu.",
  description:
    "Susun program muatan lokal, pelatihan tim, workshop satu hari, atau hadiah korporat bersama kurator dan pengajar. Peserta bisa melanjutkan ke jalur penuh sampai karya atau jasa.",
  segments: ["Sekolah", "EO & wedding organizer", "Desa wisata & hotel", "Korporat"],
  points: [
    "Kurikulum disesuaikan dengan jumlah peserta dan durasi",
    "Laporan progres dan rekap kehadiran setiap pekan",
    "Alokasi kursi, jadwal, dan penagihan institusi",
    "Pendampingan kurator untuk konteks budaya dan izin",
    "Lulusan lokal bisa bergabung sebagai pengajar atau pemasok",
  ],
  brief: [
    ["Format", "Kelas mandiri + sesi kurator"],
    ["Durasi", "4-6 pekan"],
    ["Laporan", "Progres & kehadiran"],
    ["Jalur terbuka", "2 dari 10 bidang"],
    ["Peserta", "Mulai 8 orang"],
  ],
  cta: "Minta penawaran",
  note: "Paket dan harga disusun setelah sesi pemetaan kebutuhan.",
}

export const faqs: Faq[] = [
  {
    question: "Bidang budaya apa saja yang bisa dipelajari?",
    answer:
      "Katalog kami mencakup sepuluh bidang: batik, tenun, ukir, karawitan, tari, pranatacara, kuliner tradisi, jamu, wayang, dan keramik. Batik dan pranatacara sudah terbuka; bidang lain dibuka bertahap bersama pengajar di bidangnya.",
  },
  {
    question: "Apakah saya perlu pengalaman seni sebelumnya?",
    answer:
      "Tidak. Jalur pemula dimulai dari hal dasar: posisi duduk, cara memegang alat, sampai latihan tata wicara. Kalau sudah punya pengalaman, kamu bisa memilih jalur menengah setelah konsultasi singkat.",
  },
  {
    question: "Bagaimana pengajar menilai tugas praktik saya?",
    answer:
      "Unggah foto jarak dekat atau rekaman suara dari aplikasi. Pengajar memberi catatan pada bagian tertentu, voice note, dan keputusan lanjut atau revisi. Umpan balik dikirim dalam 3 hari kerja.",
  },
  {
    question: "Apa saja isi paket bahan yang dikirim?",
    answer:
      "Isi paket berbeda per jalur. Jalur batik menerima canting tembaga, malam alami, kain primis, dan pewarna pilihan; jalur lain menyesuaikan alat dan bahan praktiknya. Kamu juga bisa memilih opsi membawa alat sendiri.",
  },
  {
    question: "Apakah sertifikat ini diakui pemerintah?",
    answer:
      "Tidak. Sertifikat KalaNidhi Digital adalah sertifikat platform, bukan sertifikasi pemerintah atau BNSP. Sertifikat mencatat kompetensi, pengajar penilai, dan kode verifikasi publik yang bisa dicek lewat halaman verifikasi.",
  },
  {
    question: "Bagaimana hak budaya dan bagi hasil dijaga?",
    answer:
      "Setiap jalur dan karya menampilkan Kartu Sumber Budaya: komunitas sumber, pemberi izin, tanggal persetujuan, dan tingkat akses. Setiap bidang budaya menampilkan sumbernya sendiri. Rincian bagi hasil ditampilkan sebelum transaksi, saat kamu masih bisa memutuskan.",
  },
  {
    question: "Bisakah lulusan kembali mengajar?",
    answer:
      "Bisa. Lulusan yang sudah punya portofolio dan lolos peninjauan bisa mengajar, menilai tugas, atau menjadi pemasok bahan dan karya. Setiap pengajar baru membuka jalur untuk pelajar berikutnya, dan bagi hasilnya tercatat seperti pengajar lain.",
  },
  {
    question: "Saya hanya ingin membeli karya. Apakah harus ikut kelas?",
    answer:
      "Tidak. Kamu bisa langsung menjelajahi etalase karya lulusan dan pengajar. Etalase ini adalah muara dari jalur belajar: setiap karya dibuat di kelas dan punya Kartu Karya yang menjelaskan pembuat, teknik, dan jejak prosesnya.",
  },
]

export const footer = {
  description:
    "Platform belajar berbagai praktik budaya Nusantara. Pelajar dibimbing pengajar, dinilai, mendapat sertifikat platform dan Kartu Karya, lalu berkarya atau berjualan. Lulusan yang siap kembali sebagai pengajar, penilai, atau pemasok, sehingga jalur baru terus terbuka.",
  columns: [
    {
      title: "Program",
      links: [
        { label: "Cara kerja", href: "#cara-kerja" },
        { label: "Jalur belajar", href: "#jalur" },
        { label: "Karya lulusan", href: "#karya" },
        { label: "Pengajar", href: "#pengajar" },
        { label: "Kalender mangsa", href: "#mangsa" },
      ],
    },
    {
      title: "Platform",
      links: [
        { label: "Etika & hak budaya", href: "#etika" },
        { label: "Untuk institusi", href: "#institusi" },
        { label: "Pertanyaan umum", href: "#faq" },
        { label: "Tentang KalaNidhi Digital", href: "#faq" },
      ],
    },
  ],
  secretariat: {
    label: "Sekretariat",
    value: "Yogyakarta & Surakarta, Indonesia",
  },
  copyright: "© 2026 KalaNidhi Digital. Dibuat di Yogyakarta.",
}
