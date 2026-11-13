import type { Doc, Id } from "./_generated/dataModel"
import { internalMutation, type MutationCtx } from "./_generated/server"

import {
  DAY,
  HOUR,
  SEED_ADMIN_PROFILE,
  SEED_NOW as NOW,
  SEED_START,
  SEED_USERS,
  seedAdmin,
  seedAgo as ago,
  seedAhead as ahead,
  seedEmail,
} from "./seedIdentities"

/** Realistic browser strings keep session and auth panels from reading like fixtures. */
const USER_AGENTS = [
  "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  "Mozilla/5.0 (Linux; Android 13; Redmi Note 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
]

const SEED_TEACHERS = [
  {
    key: "bambang",
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
    imageFile: "teacher-hardjono.jpg",
    pathIds: ["batik-tulis-soga"],
    status: "active" as const,
    verificationStatus: "verified" as const,
    published: true,
  },
  {
    key: "sri",
    slug: "sri-sriningsih",
    name: "Sri Sriningsih",
    initials: "SS",
    specialty: "Ahli pewarnaan alami",
    region: "Pleret, Bantul, D.I. Yogyakarta",
    experience: "32 tahun pewarnaan alami",
    quote:
      "Warna alami tidak bisa dipaksa. Kalau bahan dan musimnya tepat, hasilnya justru lebih tenang.",
    focus: "Pewarna alami dan ekstraksi nila",
    path: "Batik Tulis Soga",
    community: "Rumah Warna Pleret",
    imageFile: "teacher-sriningsih.jpg",
    pathIds: ["batik-tulis-soga"],
    status: "active" as const,
    verificationStatus: "verified" as const,
    published: true,
  },
  {
    key: "widagdo",
    slug: "widagdo-saputra",
    name: "Widagdo Saputra",
    initials: "WS",
    specialty: "Instruktur tata upacara",
    region: "Kota Yogyakarta, D.I. Yogyakarta",
    experience: "30 tahun tata upacara",
    quote:
      "Pembawa acara yang baik mengatur napas acara. Kalimatnya jelas, urutannya tidak membuat tamu menunggu.",
    focus: "Pembawa acara adat dan protokol",
    path: "Seni Pembawa Acara Tradisi Jawa",
    community: "Sanggar Wicara Ngayogyakarta",
    imageFile: "teacher-sudarsono.jpg",
    pathIds: ["pranatacara-jawa"],
    status: "active" as const,
    verificationStatus: "verified" as const,
    published: true,
  },
  {
    key: "joko",
    slug: "joko-santoso",
    name: "Joko Santoso",
    initials: "JS",
    specialty: "Pengrajin ukir kayu",
    region: "Sewon, Bantul, D.I. Yogyakarta",
    experience: "27 tahun mengukir",
    quote:
      "Ukiran yang baik lahir dari arah pahat yang sabar. Saya ajarkan urutan, bukan hanya bentuk akhir.",
    focus: "Ukir relief dan ornamen sulur",
    path: "Kriya Ukir Kayu Bantul",
    community: "Sanggar Ukir Bantul",
    imageFile: "teacher-joko.jpg",
    pathIds: ["kriya-ukir-bantul"],
    status: "review" as const,
    verificationStatus: "under_review" as const,
    published: false,
  },
]

type SeedModule = {
  title: string
  summary: string
  estimatedMinutes: number
  lessons: {
    title: string
    kind: "text" | "video" | "audio" | "file" | "practice"
    body: string
    estimatedMinutes: number
    accessLevel: "public" | "enrolled" | "certified"
  }[]
}

const MODULES: Record<string, SeedModule[]> = {
  "batik-tulis-soga": [
    {
      title: "Alat, bahan, dan ruang kerja",
      summary: "Mengenal canting, malam, kain, dan cara menata meja kerja.",
      estimatedMinutes: 90,
      lessons: [
        {
          title: "Canting: bagian, ukuran, dan perawatan",
          kind: "video",
          body: "Canting terdiri dari nyamplung, cucuk, dan pegangan. Pelajari ukuran cucuk dan cara membersihkannya setelah dipakai.",
          estimatedMinutes: 25,
          accessLevel: "public",
        },
        {
          title: "Malam dan suhu kerja",
          kind: "text",
          body: "Malam yang terlalu panas menembus kain, yang terlalu dingin tidak menempel. Latih suhu dengan tes di kain perca.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Menata meja dan keselamatan kerja",
          kind: "text",
          body: "Susun alat dalam jangkauan tangan, jauhkan sumber panas, dan siapkan kain lap bersih.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Menyiapkan kain primis",
      summary: "Mencuci, menjemur, dan menyetrika kain sebelum dibatik.",
      estimatedMinutes: 80,
      lessons: [
        {
          title: "Mencuci kain primis",
          kind: "text",
          body: "Buang kanji dengan air bersih, jangan memeras terlalu kuat, lalu jemur di tempat teduh.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
        {
          title: "Menyetrika dan menandai bidang",
          kind: "practice",
          body: "Setrika kain hingga rata, lalu tandai batas motif dengan pensil jahit yang mudah hilang.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Dasar canting dan malam",
      summary: "Garis lurus, lengkung, dan titik dengan tekanan yang stabil.",
      estimatedMinutes: 120,
      lessons: [
        {
          title: "Garis lurus tanpa putus",
          kind: "practice",
          body: "Latih garis lurus sepanjang 20 cm. Jaga tekanan dan kecepatan agar malam tidak menumpuk.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
        {
          title: "Lengkung dan titik",
          kind: "practice",
          body: "Buat lengkung sejajar dan titik rapat. Periksa jarak antar titik dengan kaca pembesar.",
          estimatedMinutes: 35,
          accessLevel: "enrolled",
        },
        {
          title: "Kesalahan umum dan koreksinya",
          kind: "video",
          body: "Malam menembus kain, garis bergelombang, dan cucuk tersumbat: kenali penyebab dan cara memperbaikinya.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Motif geometris Giriloyo",
      summary: "Menyusun ulang pola klasik menjadi motif geometris baru.",
      estimatedMinutes: 110,
      lessons: [
        {
          title: "Membaca pola klasik",
          kind: "text",
          body: "Pahami sumbu, pengulangan, dan batas bidang pada pola klasik Giriloyo.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
        {
          title: "Menyusun grid motif",
          kind: "practice",
          body: "Buat grid 4 x 4, lalu susun ulang elemen pola tanpa menyalin motif sakral.",
          estimatedMinutes: 45,
          accessLevel: "enrolled",
        },
        {
          title: "Menghitung kebutuhan malam",
          kind: "text",
          body: "Perkirakan kebutuhan malam dari panjang garis dan kerapatan titik.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Pewarnaan soga pertama",
      summary: "Menyiapkan larutan soga dan mewarnai bidang kain.",
      estimatedMinutes: 130,
      lessons: [
        {
          title: "Bahan pewarna soga",
          kind: "text",
          body: "Kenali tingi, jambal, dan bahan pembantu. Catat asal bahan dan takarannya.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
        {
          title: "Teknik celup dan kuas",
          kind: "video",
          body: "Bandingkan hasil celup dan kuas pada kain primis. Jaga suhu larutan tetap stabil.",
          estimatedMinutes: 40,
          accessLevel: "enrolled",
        },
        {
          title: "Membaca hasil warna",
          kind: "practice",
          body: "Keringkan potongan kain, lalu bandingkan intensitas warna dengan catatan takaran.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Fiksasi dan pelorodan",
      summary: "Mengunci warna dan melepas malam tanpa merusak serat kain.",
      estimatedMinutes: 90,
      lessons: [
        {
          title: "Fiksasi warna",
          kind: "text",
          body: "Gunakan larutan fiksasi sesuai jenis pewarna. Catat waktu dan suhu.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
        {
          title: "Pelorodan malam",
          kind: "practice",
          body: "Rebus kain dengan hati-hati, bilas bertahap, lalu keringkan di tempat teduh.",
          estimatedMinutes: 40,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Merawat kain dan alat",
      summary: "Menyimpan kain, merawat canting, dan menjaga kualitas warna.",
      estimatedMinutes: 60,
      lessons: [
        {
          title: "Menyimpan kain batik",
          kind: "text",
          body: "Lipat dengan kertas bebas asam, hindari sinar matahari langsung, dan beri silica gel.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Merawat canting dan wajan",
          kind: "text",
          body: "Bersihkan malam sisa, simpan canting dalam posisi tegak, dan periksa cucuk secara berkala.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Menyusun Kartu Karya",
      summary: "Mendokumentasikan proses, bahan, dan izin karya.",
      estimatedMinutes: 70,
      lessons: [
        {
          title: "Merekam proses",
          kind: "practice",
          body: "Ambil foto bertanggal pada setiap tahap: primis, canting, pewarnaan, dan hasil akhir.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
        {
          title: "Menulis provenance dan izin",
          kind: "text",
          body: "Catat asal motif, komunitas sumber, dan izin berbagi sebelum karya dipublikasikan.",
          estimatedMinutes: 25,
          accessLevel: "certified",
        },
      ],
    },
  ],
  "pranatacara-jawa": [
    {
      title: "Napas dan tata wicara",
      summary: "Mengatur napas, volume, dan kejelasan kalimat.",
      estimatedMinutes: 90,
      lessons: [
        {
          title: "Latihan napas dan jeda",
          kind: "practice",
          body: "Latih pernapasan diafragma dan jeda kalimat agar tidak terburu-buru.",
          estimatedMinutes: 30,
          accessLevel: "public",
        },
        {
          title: "Volume dan artikulasi",
          kind: "video",
          body: "Rekam suara, lalu periksa kejelasan konsonan dan volume di ruang terbuka.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
        {
          title: "Bahasa Jawa halus untuk acara",
          kind: "text",
          body: "Pilih tingkat bahasa yang tepat untuk tamu, keluarga, dan sesepuh.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Struktur acara Jawa",
      summary: "Urutan siraman, midodareni, dan resepsi.",
      estimatedMinutes: 100,
      lessons: [
        {
          title: "Urutan siraman",
          kind: "text",
          body: "Susun urutan prosesi, pembaca doa, dan pembagian tugas keluarga.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
        {
          title: "Midodareni dan resepsi",
          kind: "text",
          body: "Bedakan suasana dan urutan acara malam midodareni dengan resepsi siang.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
        {
          title: "Menyusun rundown",
          kind: "practice",
          body: "Buat rundown 60 menit dengan penanda waktu dan antisipasi keterlambatan.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Etiket panggung",
      summary: "Penampilan, kontak mata, dan kerja sama dengan tim.",
      estimatedMinutes: 70,
      lessons: [
        {
          title: "Penampilan dan busana",
          kind: "text",
          body: "Pilih busana yang sopan, nyaman, dan sesuai konteks acara.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Koordinasi dengan tim acara",
          kind: "practice",
          body: "Latih isyarat dengan pengarah acara, sound system, dan keluarga.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Siraman dan midodareni",
      summary: "Praktik langsung dengan skenario acara.",
      estimatedMinutes: 120,
      lessons: [
        {
          title: "Skenario siraman",
          kind: "practice",
          body: "Jalankan skenario lengkap dari pembukaan sampai penutup.",
          estimatedMinutes: 45,
          accessLevel: "enrolled",
        },
        {
          title: "Skenario midodareni",
          kind: "practice",
          body: "Latih transisi suasana dan sapaan kepada keluarga kedua pihak.",
          estimatedMinutes: 45,
          accessLevel: "enrolled",
        },
        {
          title: "Umpan balik pengajar",
          kind: "video",
          body: "Tonton rekaman koreksi dan catat tiga perbaikan untuk latihan berikutnya.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Latihan dengan pengajar",
      summary: "Sesi live dan rekaman praktik.",
      estimatedMinutes: 90,
      lessons: [
        {
          title: "Sesi live pertama",
          kind: "video",
          body: "Ikuti sesi live, tampil 5 menit, dan terima catatan pengajar.",
          estimatedMinutes: 45,
          accessLevel: "enrolled",
        },
        {
          title: "Rekaman praktik mandiri",
          kind: "practice",
          body: "Rekam praktik 10 menit, unggah, dan tandai bagian yang ingin diperbaiki.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Menyusun portofolio jasa",
      summary: "Menampilkan pengalaman dan paket layanan.",
      estimatedMinutes: 60,
      lessons: [
        {
          title: "Menulis profil praktisi",
          kind: "text",
          body: "Tulis pengalaman, wilayah layanan, dan jenis acara yang ditangani.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
        {
          title: "Menyiapkan paket layanan",
          kind: "text",
          body: "Susun paket, harga, dan cakupan layanan yang jelas.",
          estimatedMinutes: 25,
          accessLevel: "certified",
        },
      ],
    },
  ],
  "kriya-ukir-bantul": [
    {
      title: "Pengantar ukir Bantul",
      summary: "Alat, kayu, dan prinsip relief.",
      estimatedMinutes: 80,
      lessons: [
        {
          title: "Mengenal pahat dan kayu",
          kind: "text",
          body: "Kenali jenis pahat, arah serat kayu, dan keselamatan kerja.",
          estimatedMinutes: 30,
          accessLevel: "public",
        },
        {
          title: "Membaca relief sulur",
          kind: "text",
          body: "Pelajari susunan bidang dan kedalaman relief pada ornamen sulur.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
      ],
    },
  ],
}

const COHORTS = [
  {
    key: "bts-2026-01",
    code: "BTS-2026-01",
    pathSlug: "batik-tulis-soga",
    teacherKey: "bambang",
    title: "Batik Tulis Soga — Angkatan 1",
    start: ago(45),
    end: ahead(15),
    capacity: 12,
    status: "active" as const,
  },
  {
    key: "bts-2025-02",
    code: "BTS-2026-00",
    pathSlug: "batik-tulis-soga",
    teacherKey: "bambang",
    title: "Batik Tulis Soga — Angkatan Perintis",
    start: ago(400),
    end: ago(340),
    capacity: 12,
    status: "completed" as const,
  },
  {
    key: "pra-2026-01",
    code: "PRA-2026-01",
    pathSlug: "pranatacara-jawa",
    teacherKey: "widagdo",
    title: "Pranatacara Jawa — Angkatan 1",
    start: ago(30),
    end: ahead(30),
    capacity: 10,
    status: "active" as const,
  },
  {
    key: "pra-2026-02",
    code: "PRA-2026-02",
    pathSlug: "pranatacara-jawa",
    teacherKey: "widagdo",
    title: "Pranatacara Jawa — Angkatan 2",
    start: ahead(20),
    end: ahead(80),
    capacity: 10,
    status: "enrolling" as const,
  },
  {
    key: "bts-2026-03",
    code: "BTS-2026-03",
    pathSlug: "batik-tulis-soga",
    teacherKey: "sri",
    title: "Pewarnaan Alami — Kelas Pendamping",
    start: ahead(10),
    end: ahead(70),
    capacity: 8,
    status: "enrolling" as const,
  },
  {
    key: "pra-2025-01",
    code: "PRA-2026-00",
    pathSlug: "pranatacara-jawa",
    teacherKey: "widagdo",
    title: "Pranatacara Jawa — Angkatan Perintis",
    start: ago(380),
    end: ago(320),
    capacity: 10,
    status: "completed" as const,
  },
]

const ENROLLMENTS: {
  studentKey: string
  cohortKey: string
  status: "pending_payment" | "active" | "completed" | "withdrawn"
}[] = [
  ...["sari", "dwi", "bayu", "nanda", "ratih", "yusuf", "melati", "arif"].map(
    (studentKey) => ({
      studentKey,
      cohortKey: "bts-2026-01",
      status: "active" as const,
    }),
  ),
  ...["anisa", "dimas", "purnomo"].map((studentKey) => ({
    studentKey,
    cohortKey: "bts-2025-02",
    status: "completed" as const,
  })),
  ...["sari", "dwi", "bayu", "nanda", "dewi", "fajar"].map((studentKey) => ({
    studentKey,
    cohortKey: "pra-2026-01",
    status: "active" as const,
  })),
  ...["ratih", "yusuf"].map((studentKey) => ({
    studentKey,
    cohortKey: "pra-2026-02",
    status: "pending_payment" as const,
  })),
  {
    studentKey: "melati",
    cohortKey: "pra-2026-02",
    status: "withdrawn" as const,
  },
  ...["arif", "dewi"].map((studentKey) => ({
    studentKey,
    cohortKey: "bts-2026-03",
    status: "active" as const,
  })),
  { studentKey: "rani", cohortKey: "pra-2025-01", status: "completed" },
]

type SeedSubmission = {
  key: string
  studentKey: string
  cohortKey: string
  taskTitle: string
  status:
    | "draft"
    | "submitted"
    | "under_review"
    | "revision_requested"
    | "approved"
    | "rejected"
  score?: number
  feedback?: string
  submittedDaysAgo?: number
  assessedDaysAgo?: number
  revisionCount: number
  evidenceText: string
}

const SUBMISSIONS: SeedSubmission[] = [
  {
    key: "sari-bts-1",
    studentKey: "sari",
    cohortKey: "bts-2026-01",
    taskTitle: "Canting pertama: garis lurus dan lengkung",
    status: "approved",
    score: 88,
    feedback:
      "Tekanan canting sudah stabil. Perbaiki jarak antar titik pada bagian lengkung kanan.",
    submittedDaysAgo: 20,
    assessedDaysAgo: 18,
    revisionCount: 0,
    evidenceText:
      "Enam lembar latihan garis di kain perca, dengan catatan suhu malam 68 derajat.",
  },
  {
    key: "sari-bts-2",
    studentKey: "sari",
    cohortKey: "bts-2026-01",
    taskTitle: "Motif geometris: grid dan pengulangan",
    status: "submitted",
    submittedDaysAgo: 3,
    revisionCount: 0,
    evidenceText:
      "Grid 4 x 4 dengan pengulangan motif geometris, foto jarak dekat dan foto keseluruhan.",
  },
  {
    key: "dwi-bts-1",
    studentKey: "dwi",
    cohortKey: "bts-2026-01",
    taskTitle: "Canting pertama: garis lurus dan lengkung",
    status: "approved",
    score: 92,
    feedback:
      "Garis lengkung rapi. Pertahankan kecepatan tangan saat berpindah arah.",
    submittedDaysAgo: 22,
    assessedDaysAgo: 20,
    revisionCount: 0,
    evidenceText: "Delapan lembar latihan dengan variasi tekanan.",
  },
  {
    key: "dwi-bts-2",
    studentKey: "dwi",
    cohortKey: "bts-2026-01",
    taskTitle: "Pewarnaan soga pertama",
    status: "revision_requested",
    score: 70,
    feedback:
      "Warna belum merata di bagian tepi. Ulangi pencelupan dengan waktu yang sama dan catat suhu larutan.",
    submittedDaysAgo: 8,
    assessedDaysAgo: 6,
    revisionCount: 1,
    evidenceText: "Dua potong kain dengan takaran soga berbeda.",
  },
  {
    key: "bayu-bts-1",
    studentKey: "bayu",
    cohortKey: "bts-2026-01",
    taskTitle: "Canting pertama: garis lurus dan lengkung",
    status: "submitted",
    submittedDaysAgo: 2,
    revisionCount: 0,
    evidenceText: "Foto latihan garis dan catatan alat yang dipakai.",
  },
  {
    key: "nanda-bts-1",
    studentKey: "nanda",
    cohortKey: "bts-2026-01",
    taskTitle: "Menyiapkan kain primis",
    status: "under_review",
    submittedDaysAgo: 5,
    revisionCount: 0,
    evidenceText: "Foto sebelum dan sesudah pencucian kain primis.",
  },
  {
    key: "ratih-bts-1",
    studentKey: "ratih",
    cohortKey: "bts-2026-01",
    taskTitle: "Canting pertama: garis lurus dan lengkung",
    status: "approved",
    score: 85,
    feedback: "Garis sudah lurus. Kurangi malam yang menumpuk di titik awal.",
    submittedDaysAgo: 19,
    assessedDaysAgo: 17,
    revisionCount: 0,
    evidenceText: "Lima lembar latihan garis dengan catatan proses.",
  },
  {
    key: "yusuf-bts-1",
    studentKey: "yusuf",
    cohortKey: "bts-2026-01",
    taskTitle: "Menyiapkan kain primis",
    status: "submitted",
    submittedDaysAgo: 4,
    revisionCount: 0,
    evidenceText: "Foto kain yang sudah dicuci dan disetrika.",
  },
  {
    key: "melati-bts-1",
    studentKey: "melati",
    cohortKey: "bts-2026-01",
    taskTitle: "Canting pertama: garis lurus dan lengkung",
    status: "draft",
    revisionCount: 0,
    evidenceText: "Draf catatan latihan, belum diunggah.",
  },
  {
    key: "arif-bts-1",
    studentKey: "arif",
    cohortKey: "bts-2026-01",
    taskTitle: "Canting pertama: garis lurus dan lengkung",
    status: "approved",
    score: 90,
    feedback: "Kontrol tekanan baik. Lanjutkan ke latihan lengkung ganda.",
    submittedDaysAgo: 21,
    assessedDaysAgo: 19,
    revisionCount: 0,
    evidenceText: "Tujuh lembar latihan dengan variasi ketebalan garis.",
  },
  {
    key: "anisa-bts-final",
    studentKey: "anisa",
    cohortKey: "bts-2025-02",
    taskTitle: "Karya akhir: kain batik tulis soga",
    status: "approved",
    score: 92,
    feedback:
      "Kain selesai dengan warna rata dan dokumentasi proses lengkap. Layak diajukan untuk Kartu Karya.",
    submittedDaysAgo: 350,
    assessedDaysAgo: 345,
    revisionCount: 1,
    evidenceText:
      "Dua belas foto bertanggal dari primis sampai pelorodan, plus catatan bahan.",
  },
  {
    key: "dimas-bts-final",
    studentKey: "dimas",
    cohortKey: "bts-2025-02",
    taskTitle: "Karya akhir: selendang canting nitik",
    status: "approved",
    score: 89,
    feedback:
      "Titik canting rapat dan konsisten. Perbaiki finishing tepi kain pada karya berikutnya.",
    submittedDaysAgo: 348,
    assessedDaysAgo: 343,
    revisionCount: 0,
    evidenceText: "Foto detail titik dan foto keseluruhan selendang.",
  },
  {
    key: "purnomo-bts-final",
    studentKey: "purnomo",
    cohortKey: "bts-2025-02",
    taskTitle: "Karya akhir: batik tulis soga lereng",
    status: "approved",
    score: 95,
    feedback:
      "Empat belas tahap pewarnaan tercatat rapi. Motif lereng disusun ulang tanpa motif sakral.",
    submittedDaysAgo: 346,
    assessedDaysAgo: 341,
    revisionCount: 2,
    evidenceText: "Jurnal proses 14 tahap dan foto hasil akhir.",
  },
  {
    key: "rani-pra-final",
    studentKey: "rani",
    cohortKey: "pra-2025-01",
    taskTitle: "Praktik akhir: siraman dan midodareni",
    status: "approved",
    score: 90,
    feedback:
      "Urutan acara jelas dan artikulasi baik. Pertahankan kontak mata dengan keluarga.",
    submittedDaysAgo: 330,
    assessedDaysAgo: 325,
    revisionCount: 1,
    evidenceText: "Rekaman praktik 18 menit dan rundown acara.",
  },
  {
    key: "sari-pra-1",
    studentKey: "sari",
    cohortKey: "pra-2026-01",
    taskTitle: "Latihan napas dan tata wicara",
    status: "approved",
    score: 86,
    feedback: "Jeda kalimat sudah baik. Perjelas konsonan akhir.",
    submittedDaysAgo: 12,
    assessedDaysAgo: 10,
    revisionCount: 0,
    evidenceText: "Rekaman suara 5 menit.",
  },
  {
    key: "dwi-pra-1",
    studentKey: "dwi",
    cohortKey: "pra-2026-01",
    taskTitle: "Menyusun rundown siraman",
    status: "submitted",
    submittedDaysAgo: 2,
    revisionCount: 0,
    evidenceText: "Rundown 60 menit dengan penanda waktu.",
  },
  {
    key: "bayu-pra-1",
    studentKey: "bayu",
    cohortKey: "pra-2026-01",
    taskTitle: "Latihan napas dan tata wicara",
    status: "under_review",
    submittedDaysAgo: 4,
    revisionCount: 0,
    evidenceText: "Rekaman suara 6 menit.",
  },
  {
    key: "nanda-pra-1",
    studentKey: "nanda",
    cohortKey: "pra-2026-01",
    taskTitle: "Etiket panggung",
    status: "submitted",
    submittedDaysAgo: 1,
    revisionCount: 0,
    evidenceText: "Catatan koordinasi dengan tim acara.",
  },
  {
    key: "dewi-pra-1",
    studentKey: "dewi",
    cohortKey: "pra-2026-01",
    taskTitle: "Latihan napas dan tata wicara",
    status: "approved",
    score: 84,
    feedback: "Volume cukup. Latih pernapasan sebelum kalimat panjang.",
    submittedDaysAgo: 11,
    assessedDaysAgo: 9,
    revisionCount: 0,
    evidenceText: "Rekaman suara 4 menit.",
  },
  {
    key: "fajar-pra-1",
    studentKey: "fajar",
    cohortKey: "pra-2026-01",
    taskTitle: "Menyusun rundown siraman",
    status: "submitted",
    submittedDaysAgo: 3,
    revisionCount: 0,
    evidenceText: "Rundown dan daftar tugas keluarga.",
  },
  {
    key: "arif-bts-3",
    studentKey: "arif",
    cohortKey: "bts-2026-03",
    taskTitle: "Ekstraksi warna alami",
    status: "submitted",
    submittedDaysAgo: 1,
    revisionCount: 0,
    evidenceText: "Foto bahan dan catatan takaran.",
  },
  {
    key: "dewi-bts-3",
    studentKey: "dewi",
    cohortKey: "bts-2026-03",
    taskTitle: "Ekstraksi warna alami",
    status: "draft",
    revisionCount: 0,
    evidenceText: "Draf catatan bahan.",
  },
]

const WORKS = [
  {
    slug: "batik-soga-anyaman",
    makerKey: "anisa",
    pathSlug: "batik-tulis-soga",
    certificateKey: "anisa",
    title: "Kain Batik Soga Anyaman",
    category: "batik" as const,
    kind: "product" as const,
    maker: "Anisa Rahmawati",
    makerRole: "Lulusan jalur Batik Tulis",
    teacher: "Bambang Hardjono",
    region: "Giriloyo, Bantul",
    price: 1_450_000,
    unit: "Kain panjang, 2,5 x 1,05 m",
    technique: "Tulis",
    techniqueNote: "Canting tangan",
    workCard: "KN-8821",
    description:
      "Pewarna soga dari kulit tingi dan jambal, dengan motif geometris yang disusun ulang dari pola klasik Giriloyo. Proses pembuatan tercatat dalam 12 foto bertanggal.",
    imageFile: "work-soga.jpg",
    permission: "Izin berbagi motif tercatat 3 Februari 2026",
  },
  {
    slug: "selendang-canting-nitik",
    makerKey: "dimas",
    pathSlug: "batik-tulis-soga",
    certificateKey: "dimas",
    title: "Selendang Canting Nitik",
    category: "batik" as const,
    kind: "product" as const,
    maker: "Dimas Yoga Pratama",
    makerRole: "Lulusan jalur Batik Tulis",
    teacher: "Sri Sriningsih",
    region: "Kasihan, Bantul",
    price: 850_000,
    unit: "Selendang primis, 2 x 0,55 m",
    technique: "Tulis",
    techniqueNote: "Titik canting halus",
    workCard: "KN-9014",
    description:
      "Selendang primis dengan titik canting rapat. Panduan perawatan dan kartu bahan disertakan.",
    imageFile: "work-nitik.jpg",
    permission: "Izin berbagi motif tercatat 24 Maret 2026",
  },
  {
    slug: "batik-soga-lereng",
    makerKey: "purnomo",
    pathSlug: "batik-tulis-soga",
    certificateKey: "purnomo",
    title: "Batik Tulis Soga Lereng",
    category: "batik" as const,
    kind: "product" as const,
    maker: "Bambang Purnomo",
    makerRole: "Lulusan jalur lanjutan",
    teacher: "Bambang Hardjono",
    region: "Mlati, Sleman",
    price: 2_900_000,
    unit: "Kain halus, sutra ATBM",
    technique: "Tulis",
    techniqueNote: "14 tahap pewarnaan",
    workCard: "KN-9147",
    description:
      "Karya lanjutan dengan 14 tahap pewarnaan soga. Motif lereng klasik, bukan motif sakral.",
    imageFile: "work-sutra.jpg",
    permission: "Izin berbagi motif tercatat 26 Mei 2026",
  },
  {
    slug: "pranatacara-siraman",
    makerKey: "rani",
    pathSlug: "pranatacara-jawa",
    certificateKey: "rani",
    title: "Pembawa Acara Siraman dan Midodareni",
    category: "layanan" as const,
    kind: "service" as const,
    maker: "Rani Wikaningsih",
    makerRole: "Praktisi tersertifikasi platform",
    teacher: "Widagdo Saputra",
    region: "Kota Yogyakarta dan sekitarnya",
    price: 2_500_000,
    priceLabel: "Mulai dari",
    unit: "Layanan acara, 1 hari",
    technique: "Layanan",
    techniqueNote: "Pembawa acara adat",
    workCard: "KN-JS-014",
    description:
      "Permintaan booking untuk rangkaian siraman dan midodareni. Susunan acara dikonfirmasi bersama praktisi.",
    imageFile: "work-pranatacara.jpg",
    permission: "Izin tampil dan publikasi portofolio tercatat 28 Mei 2026",
  },
]

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

async function userByEmail(
  ctx: MutationCtx,
  email: string,
): Promise<Doc<"users">> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique()
  if (!user) throw new Error(`Seed user missing: ${email}`)
  return user
}

async function pathBySlug(
  ctx: MutationCtx,
  slug: string,
): Promise<Doc<"paths">> {
  const path = await ctx.db
    .query("paths")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique()
  if (!path) throw new Error(`Seed path missing: ${slug}`)
  return path
}


async function workBySlug(
  ctx: MutationCtx,
  slug: string,
): Promise<Doc<"works">> {
  const work = await ctx.db
    .query("works")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique()
  if (!work) throw new Error(`Seed work missing: ${slug}`)
  return work
}



async function evidenceStorageId(
  ctx: MutationCtx,
): Promise<Id<"_storage">> {
  const assets = await ctx.db.query("mediaAssets").collect()
  const image = assets.find(
    (asset) => asset.kind === "image" && asset.storageId,
  )
  if (image?.storageId) return image.storageId
  return await ctx.storage.store(
    new Blob(["KalaNidhi seed evidence"], { type: "image/jpeg" }),
  )
}

/** Stable four-digit tail so seeded payout accounts look like real ones. */
function accountSuffix(name: string): string {
  let hash = 7
  for (const char of name) hash = (hash * 33 + char.charCodeAt(0)) % 8999
  return String(1000 + hash)
}

export const seedPeople = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("users").collect()
    let admin = existing.find(
      (user) => user.roles.includes("admin") && user.status === "active",
    )
    if (!admin) {
      const adminId = await ctx.db.insert("users", {
        authUserId: "seed-admin",
        name: SEED_ADMIN_PROFILE.name,
        email: SEED_ADMIN_PROFILE.email,
        emailVerified: true,
        phone: SEED_ADMIN_PROFILE.phone,
        province: SEED_ADMIN_PROFILE.province,
        whatsappVerified: true,
        whatsappVerifiedAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo - 1),
        initials: SEED_ADMIN_PROFILE.initials,
        region: SEED_ADMIN_PROFILE.region,
        roles: ["admin"],
        status: "active",
        createdAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
        updatedAt: NOW,
      })
      admin = (await ctx.db.get(adminId)) as Doc<"users">
    } else if (
      admin.province !== SEED_ADMIN_PROFILE.province ||
      admin.region !== SEED_ADMIN_PROFILE.region
    ) {
      // The operator mailbox belongs to Better Auth and stays untouched; only
      // the public profile location is normalized for the demo workspace.
      await ctx.db.patch(admin._id, {
        province: SEED_ADMIN_PROFILE.province,
        region: SEED_ADMIN_PROFILE.region,
        updatedAt: NOW,
      })
    }

    const byKey = new Map<string, Doc<"users">>()
    byKey.set("admin", admin)

    // The admin account is preserved across reseeds, but its projections are
    // rebuilt so the workspace never shows an empty role/consent/session panel.
    await ctx.db.insert("roleAssignments", {
      userId: admin._id,
      role: "admin",
      action: "grant",
      actorId: "system",
      reason: "Admin bootstrap preserved across seed",
      createdAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
    })
    await ctx.db.insert("consents", {
      userId: admin._id,
      kind: "privacy",
      granted: true,
      version: "2026-11",
      source: "bootstrap",
      grantedAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
      createdAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
    })
    await ctx.db.insert("consents", {
      userId: admin._id,
      kind: "recording",
      granted: true,
      version: "2026-11",
      source: "bootstrap",
      grantedAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
      createdAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
    })
    await ctx.db.insert("whatsappVerifications", {
      userId: admin._id,
      phone: admin.phone,
      tokenHash: await sha256("seed-verification-admin"),
      status: "verified",
      expiresAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo - 1),
      createdAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
      verifiedAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo - 1) + 2 * HOUR,
      messageId: "seed-wa-admin",
    })
    await ctx.db.insert("authLogs", {
      userId: admin._id,
      authUserId: admin.authUserId,
      kind: "sign_in",
      ipHash: "seed-ip-admin",
      userAgent: USER_AGENTS[1],
      createdAt: ago(1),
    })
    const adminSessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", admin._id))
      .collect()
    if (adminSessions.length === 0) {
      await ctx.db.insert("sessions", {
        userId: admin._id,
        authSessionId: "seed-session-admin",
        deviceName: "Peramban",
        userAgent: USER_AGENTS[1],
        createdAt: ago(1),
        lastSeenAt: ago(0),
        expiresAt: ahead(30),
      })
    }

    for (const [index, seed] of SEED_USERS.entries()) {
      const userId = await ctx.db.insert("users", {
        authUserId: `seed-${seed.key}`,
        name: seed.name,
        email: seed.email,
        emailVerified: true,
        phone: seed.phone,
        province: seed.province,
        whatsappVerified: true,
        whatsappVerifiedAt: ago(seed.joinedDaysAgo - 1),
        initials: seed.initials,
        region: seed.region,
        roles: seed.roles,
        status: "active",
        lastActiveAt: ago(seed.lastActiveDaysAgo),
        createdAt: ago(seed.joinedDaysAgo),
        updatedAt: NOW,
      })
      const user = (await ctx.db.get(userId)) as Doc<"users">
      byKey.set(seed.key, user)

      for (const role of seed.roles) {
        await ctx.db.insert("roleAssignments", {
          userId,
          role,
          action: "grant",
          actorId: admin._id,
          reason: "Seed account provisioning",
          createdAt: ago(seed.joinedDaysAgo),
        })
      }

      await ctx.db.insert("sessions", {
        userId,
        authSessionId: `seed-session-${seed.key}`,
        deviceName:
          index % 3 === 0 ? "Android" : index % 3 === 1 ? "Windows" : "iPhone",
        userAgent: USER_AGENTS[index % USER_AGENTS.length],
        createdAt: ago(Math.max(1, seed.lastActiveDaysAgo + 1)),
        lastSeenAt: ago(seed.lastActiveDaysAgo),
        expiresAt: ahead(30),
      })

      await ctx.db.insert("consents", {
        userId,
        kind: "privacy",
        granted: true,
        version: "2026-11",
        source: "signup",
        grantedAt: ago(seed.joinedDaysAgo),
        createdAt: ago(seed.joinedDaysAgo),
      })
      await ctx.db.insert("consents", {
        userId,
        kind: "marketing",
        granted: index % 3 !== 0,
        version: "2026-11",
        source: "signup",
        grantedAt: index % 3 !== 0 ? ago(seed.joinedDaysAgo) : undefined,
        revokedAt:
          index % 3 === 0 ? ago(Math.max(1, seed.joinedDaysAgo - 45)) : undefined,
        createdAt: ago(seed.joinedDaysAgo),
      })
      await ctx.db.insert("consents", {
        userId,
        kind: "recording",
        granted: true,
        version: "2026-11",
        source: "workspace",
        grantedAt: ago(60),
        createdAt: ago(60),
      })

      await ctx.db.insert("whatsappVerifications", {
        userId,
        phone: seed.phone,
        tokenHash: await sha256(`seed-verification-${seed.key}`),
        status: "verified",
        expiresAt: ago(seed.joinedDaysAgo) + HOUR,
        createdAt: ago(seed.joinedDaysAgo),
        verifiedAt: ago(seed.joinedDaysAgo) + 3 * 60_000,
        messageId: `seed-wa-${seed.key}`,
      })

      await ctx.db.insert("authLogs", {
        userId,
        authUserId: `seed-${seed.key}`,
        kind: "sign_in",
        ipHash: `seed-ip-${index}`,
        userAgent: USER_AGENTS[index % USER_AGENTS.length],
        createdAt: ago(Math.max(1, seed.lastActiveDaysAgo + 1)),
      })
    }

    for (const [teacherIndex, seed] of SEED_TEACHERS.entries()) {
      const user = byKey.get(seed.key)
      if (!user) continue
      await ctx.db.insert("sellerProfiles", {
        userId: user._id,
        displayName: seed.name,
        status: seed.status === "active" ? "active" : "pending",
        onboardingChecklist: {
          payoutAccount: seed.status === "active",
          consent: true,
          firstWorkCard: seed.status === "active",
          taxDetails: seed.status === "active",
        },
        activatedAt:
          seed.status === "active" ? ago(120 - teacherIndex * 9) : undefined,
        createdAt: ago(126 - teacherIndex * 9),
        updatedAt: NOW,
      })
      if (seed.status === "active") {
        await ctx.db.insert("payoutAccounts", {
          userId: user._id,
          provider: "bank",
          bankCode: seed.key === "sri" ? "BRI" : "BCA",
          accountName: seed.name,
          accountNumberMasked: `****${accountSuffix(seed.name)}`,
          accountRef: `vault:seed:${seed.key}`,
          status: "verified",
          verifiedBy: admin._id,
          verifiedAt: ago(122 - teacherIndex * 9),
          createdAt: ago(124 - teacherIndex * 9),
          updatedAt: NOW,
        })
      }
    }

    for (const key of ["anisa", "dimas", "purnomo", "rani"]) {
      const user = byKey.get(key)
      if (!user) continue
      await ctx.db.insert("sellerProfiles", {
        userId: user._id,
        displayName: user.name,
        status: "active",
        onboardingChecklist: {
          payoutAccount: true,
          consent: true,
          firstWorkCard: true,
          taxDetails: true,
        },
        activatedAt: ago(300 + (key === "rani" ? 18 : 0)),
        createdAt: ago(320 + (key === "rani" ? 18 : 0)),
        updatedAt: NOW,
      })
      await ctx.db.insert("payoutAccounts", {
        userId: user._id,
        provider: "bank",
        bankCode: key === "rani" ? "BRI" : "BCA",
        accountName: user.name,
        accountNumberMasked: `****${accountSuffix(user.name)}`,
        accountRef: `vault:seed:${key}`,
        status: "verified",
        verifiedBy: admin._id,
        verifiedAt: ago(310 + (key === "rani" ? 18 : 0)),
        createdAt: ago(315 + (key === "rani" ? 18 : 0)),
        updatedAt: NOW,
      })
    }

    await ctx.db.insert("invites", {
      email: "rahayu.puspita86@gmail.com",
      name: "Rahayu Puspita",
      roles: ["teacher"],
      tokenHash: await sha256("seed-invite-rahayu"),
      status: "pending",
      invitedBy: admin._id,
      reason: "Pengajar tenun Gunungkidul",
      expiresAt: ahead(7),
      createdAt: ago(2),
    })
    await ctx.db.insert("invites", {
      email: seedEmail("bambang"),
      name: "Bambang Hardjono",
      roles: ["teacher"],
      tokenHash: await sha256("seed-invite-bambang"),
      status: "accepted",
      invitedBy: admin._id,
      acceptedBy: byKey.get("bambang")?._id,
      reason: "Pengajar batik Giriloyo",
      expiresAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo - 8),
      createdAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
      acceptedAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo) + DAY,
    })
    await ctx.db.insert("invites", {
      email: "sigit.pramono70@gmail.com",
      name: "Sigit Pramono",
      roles: ["teacher"],
      tokenHash: await sha256("seed-invite-revoked"),
      status: "revoked",
      invitedBy: admin._id,
      reason: "Jadwal mengajar bentrok; undangan dibatalkan atas permintaan calon pengajar.",
      expiresAt: ago(20),
      createdAt: ago(30),
    })

    return { users: byKey.size }
  },
})

/** Turns a task title into the kind of filename a participant would upload. */
function evidenceFilename(seed: SeedSubmission, index: number): string {
  const slug = seed.taskTitle
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return `${slug}-${seed.studentKey}-${String(index + 1).padStart(2, "0")}.jpg`
}

export const seedCurriculum = internalMutation({
  args: {},
  handler: async (ctx) => {
    const assets = await ctx.db.query("mediaAssets").collect()
    const audio = assets.find(
      (asset) => asset.filename === "lesson-soga-audio.mp3",
    )
    const video = assets.find(
      (asset) => asset.filename === "lesson-pranatacara-video.mp4",
    )
    let moduleCount = 0
    let lessonCount = 0

    const pathOrder = Object.keys(MODULES)
    for (const [pathSlug, modules] of Object.entries(MODULES)) {
      const path = await pathBySlug(ctx, pathSlug)
      const isDraft = pathSlug === "kriya-ukir-bantul"
      const curriculumOrder = pathOrder.indexOf(pathSlug)
      let publishedModules = 0
      for (const [moduleIndex, module] of modules.entries()) {
        const moduleCreatedAt = ago(
          372 - curriculumOrder * 68 - moduleIndex * 9,
        )
        const moduleId = await ctx.db.insert("pathModules", {
          order: moduleIndex + 1,
          pathId: path.slug,
          title: module.title,
          summary: module.summary,
          estimatedMinutes: module.estimatedMinutes,
          status: isDraft ? "draft" : "published",
          createdAt: moduleCreatedAt,
        })
        moduleCount += 1
        if (!isDraft) publishedModules += 1
        for (const [lessonIndex, lesson] of module.lessons.entries()) {
          const mediaAssetIds: Id<"mediaAssets">[] = []
          if (pathSlug === "batik-tulis-soga" && moduleIndex === 0 && lessonIndex === 0 && audio) {
            mediaAssetIds.push(audio._id)
          }
          if (pathSlug === "pranatacara-jawa" && moduleIndex === 0 && lessonIndex === 0 && video) {
            mediaAssetIds.push(video._id)
          }
          await ctx.db.insert("lessons", {
            order: lessonIndex + 1,
            moduleId,
            pathId: path.slug,
            title: lesson.title,
            kind: lesson.kind,
            body: lesson.body,
            mediaAssetIds,
            estimatedMinutes: lesson.estimatedMinutes,
            accessLevel: lesson.accessLevel,
            status: isDraft ? "draft" : "published",
            createdAt: moduleCreatedAt - (lessonIndex + 1) * 2 * DAY,
          })
          lessonCount += 1
        }
      }
      // `paths.modules` mirrors published curriculum, never seed copy.
      await ctx.db.patch(path._id, { modules: publishedModules })
    }

    return { modules: moduleCount, lessons: lessonCount }
  },
})

export const seedLearning = internalMutation({
  args: {},
  handler: async (ctx) => {
    const admin = await seedAdmin(ctx)
    const cohortIds = new Map<string, Id<"cohorts">>()
    for (const seed of COHORTS) {
      const path = await pathBySlug(ctx, seed.pathSlug)
      const teacher = await userByEmail(ctx, seedEmail(seed.teacherKey))
      const cohortId = await ctx.db.insert("cohorts", {
        code: seed.code,
        pathId: path.slug,
        teacherId: teacher._id,
        title: seed.title,
        startDate: seed.start,
        endDate: seed.end,
        capacity: seed.capacity,
        timezone: "Asia/Jakarta",
        status: seed.status,
        createdAt: Math.min(
          NOW - DAY,
          Math.max(SEED_START, seed.start - 45 * DAY),
        ),
        updatedAt: NOW,
      })
      cohortIds.set(seed.key, cohortId)

      const sessionCount = seed.status === "completed" ? 4 : 3
      for (let index = 0; index < sessionCount; index += 1) {
        const startsAt =
          seed.status === "completed"
            ? seed.start + index * 7 * DAY
            : index === 0
              ? ago(14)
              : index === 1
                ? ago(2)
                : ahead(5 + index)
        await ctx.db.insert("cohortSessions", {
          cohortId,
          title:
            index === sessionCount - 1
              ? "Penilaian akhir dan umpan balik"
              : `Sesi ${index + 1}: praktik terbimbing`,
          kind: index === sessionCount - 1 ? "assessment" : "session",
          startsAt,
          endsAt: startsAt + 2 * HOUR,
          timezone: "Asia/Jakarta",
          roomId: `kalanidhi-${seed.code.toLowerCase()}-${index + 1}`,
          status:
            startsAt < NOW
              ? "ended"
              : startsAt - NOW < 2 * HOUR
                ? "live"
                : "scheduled",
          createdAt: Math.min(
            NOW - HOUR,
            Math.max(SEED_START, startsAt - 14 * DAY),
          ),
        })
      }
    }

    const enrollmentIds = new Map<string, Id<"enrollments">>()
    for (const seed of ENROLLMENTS) {
      const student = await userByEmail(ctx, seedEmail(seed.studentKey))
      const cohortId = cohortIds.get(seed.cohortKey)
      if (!cohortId) continue
      const cohort = await ctx.db.get(cohortId)
      if (!cohort) continue
      const enrolledAt =
        seed.status === "pending_payment"
          ? ago(3)
          : Math.max(SEED_START, cohort.startDate - 10 * DAY)
      const enrollmentId = await ctx.db.insert("enrollments", {
        studentId: student._id,
        pathId: cohort.pathId,
        cohortId,
        status: seed.status,
        enrolledAt,
        completedAt:
          seed.status === "completed" ? cohort.endDate : undefined,
        withdrawnAt:
          seed.status === "withdrawn"
            ? Math.min(NOW, cohort.startDate + 21 * DAY)
            : undefined,
        withdrawReason:
          seed.status === "withdrawn"
            ? "Jadwal kerja berubah; peserta menunda ke angkatan berikutnya."
            : undefined,
        lastActivityAt: ago(1),
        deadlineAt: cohort.endDate,
        createdAt: enrolledAt,
        updatedAt: NOW,
      })
      enrollmentIds.set(`${seed.studentKey}:${seed.cohortKey}`, enrollmentId)

      if (seed.status === "pending_payment") continue

      const modules = await ctx.db
        .query("pathModules")
        .withIndex("by_path_order", (q) => q.eq("pathId", cohort.pathId))
        .collect()
      const publishedModules = modules.filter(
        (module) => module.status === "published",
      )
      const lessons = (
        await Promise.all(
          publishedModules.map((module) =>
            ctx.db
              .query("lessons")
              .withIndex("by_module_order", (q) =>
                q.eq("moduleId", module._id),
              )
              .collect(),
          ),
        )
      ).flat()
      const ordered = lessons.sort((a, b) => a.order - b.order)
      const completedCount =
        seed.status === "completed"
          ? ordered.length
          : Math.max(1, Math.floor(ordered.length * 0.45))
      // Distribute lesson completion across the real cohort window instead of
      // stacking every lesson on the same afternoon.
      const windowStart = Math.max(SEED_START, cohort.startDate)
      const windowSpan = Math.max(DAY, NOW - windowStart)
      for (const [index, lesson] of ordered.entries()) {
        const completedAt =
          index < completedCount
            ? Math.min(
                NOW - HOUR,
                windowStart +
                  Math.round((windowSpan * (index + 1)) / (completedCount + 2)),
              )
            : undefined
        await ctx.db.insert("lessonProgress", {
          userId: student._id,
          enrollmentId,
          lessonId: lesson._id,
          state:
            index < completedCount
              ? "completed"
              : index === completedCount
                ? "in_progress"
                : "not_started",
          attendance:
            index <= completedCount ? "present" : undefined,
          completedAt,
          updatedAt: completedAt ?? ago(1),
        })
      }
    }

    const storageId = await evidenceStorageId(ctx)
    const assessmentIds = new Map<string, Id<"assessments">>()
    const submissionIds = new Map<string, Id<"submissions">>()

    for (const [submissionIndex, seed] of SUBMISSIONS.entries()) {
      const student = await userByEmail(ctx, seedEmail(seed.studentKey))
      const cohortId = cohortIds.get(seed.cohortKey)
      if (!cohortId) continue
      const cohort = await ctx.db.get(cohortId)
      if (!cohort) continue
      const enrollmentId = enrollmentIds.get(
        `${seed.studentKey}:${seed.cohortKey}`,
      )
      if (!enrollmentId) continue
      const submittedAt =
        seed.submittedDaysAgo !== undefined
          ? ago(seed.submittedDaysAgo)
          : undefined
      const submissionId = await ctx.db.insert("submissions", {
        code: `TUG-${seed.key.toUpperCase()}`,
        studentId: student._id,
        enrollmentId,
        cohortId,
        pathId: cohort.pathId,
        taskTitle: seed.taskTitle,
        status: seed.status,
        submittedAt,
        dueAt: submittedAt ? submittedAt + DAY : ahead(6),
        evidenceText: seed.evidenceText,
        assetIds: [],
        revisionCount: seed.revisionCount,
        createdAt: submittedAt ?? ago(6),
        updatedAt: NOW,
      })
      submissionIds.set(seed.key, submissionId)

      if (seed.status !== "draft") {
        const assetId = await ctx.db.insert("submissionAssets", {
          submissionId,
          storageId,
          kind: "image",
          filename: evidenceFilename(seed, submissionIndex),
          mimeType: "image/jpeg",
          size: 48_000,
          createdAt: submittedAt ?? ago(6),
        })
        await ctx.db.patch(submissionId, { assetIds: [assetId] })
      }

      if (seed.key === "bayu-bts-1") {
        await ctx.db.patch(submissionId, {
          escalatedAt: ago(1),
          escalatedBy: admin._id,
          escalationReason:
            "Melewati SLA penilaian 3 hari kerja; dinaikkan ke pengajar senior.",
        })
      }

      if (seed.status === "draft") continue

      const assessor = await userByEmail(
        ctx,
        seedEmail(seed.cohortKey.startsWith("pra") ? "widagdo" : "bambang"),
      )
      const assessedAt =
        seed.assessedDaysAgo !== undefined
          ? ago(seed.assessedDaysAgo)
          : undefined
      const assessmentStatus =
        seed.status === "approved" || seed.status === "revision_requested"
          ? "completed"
          : seed.status === "under_review"
            ? "in_review"
            : "queued"
      const assessmentId = await ctx.db.insert("assessments", {
        submissionId,
        assessorId: assessor._id,
        status: assessmentStatus,
        rubric: [
          {
            criterion: "Teknik",
            weight: 40,
            score: seed.score,
            comment:
              seed.feedback ??
              "Menunggu penilaian pengajar pada aspek teknik.",
          },
          {
            criterion: "Konsistensi",
            weight: 30,
            score: seed.score,
            comment:
              seed.status === "revision_requested"
                ? "Hasil belum konsisten di bagian tepi; ulangi dengan takaran yang sama."
                : seed.feedback
                  ? "Hasil antar-lembar cukup konsisten."
                  : "Menunggu penilaian pengajar pada aspek konsistensi.",
          },
          {
            criterion: "Dokumentasi",
            weight: 30,
            score: seed.score,
            comment: seed.feedback
              ? "Dokumentasi proses lengkap, foto bertanggal dan takaran tercatat."
              : "Menunggu penilaian pengajar pada aspek dokumentasi.",
          },
        ],
        score: seed.score,
        feedback: seed.feedback,
        assessedAt,
        createdAt: submittedAt ?? ago(6),
        updatedAt: NOW,
      })
      assessmentIds.set(seed.key, assessmentId)
      if (seed.key === "dwi-bts-1") {
        await ctx.db.patch(assessmentId, {
          overrideReason:
            "Skor disesuaikan setelah peninjauan kedua atas dokumentasi proses.",
          secondReviewerId: admin._id,
        })
      }

      await ctx.db.insert("assessmentEvents", {
        assessmentId,
        submissionId,
        kind: "assign",
        actorId: assessor._id,
        reason: "Penugasan penilaian",
        createdAt: submittedAt ?? ago(6),
      })
      if (assessmentStatus === "completed") {
        await ctx.db.insert("assessmentEvents", {
          assessmentId,
          submissionId,
          kind: seed.status === "revision_requested" ? "revision" : "grade",
          actorId: assessor._id,
          reason: seed.feedback,
          previousState: "submitted",
          nextState: seed.status,
          scoreBefore: 0,
          scoreAfter: seed.score,
          createdAt: assessedAt ?? NOW,
        })
      }
    }

    const disputeAssessment = assessmentIds.get("dwi-bts-2")
    if (disputeAssessment) {
      const dwi = await userByEmail(ctx, seedEmail("dwi"))
      const admin = await seedAdmin(ctx)
      await ctx.db.insert("disputes", {
        subjectType: "assessment",
        subjectId: disputeAssessment,
        openedBy: dwi._id,
        status: "reviewing",
        reason:
          "Saya sudah mengulang pencelupan dengan waktu yang sama. Mohon tinjau ulang catatan pada bagian tepi.",
        assignedTo: admin._id,
        createdAt: ago(4),
        updatedAt: NOW,
      })
    }

    return {
      cohorts: cohortIds.size,
      enrollments: enrollmentIds.size,
      submissions: submissionIds.size,
      assessments: assessmentIds.size,
    }
  },
})

export const seedCredentials = internalMutation({
  args: {},
  handler: async (ctx) => {
    const admin = await seedAdmin(ctx)
    const certificateIds = new Map<string, Id<"certificates">>()

    const finals = [
      {
        key: "anisa",
        submissionKey: "anisa-bts-final",
        pathSlug: "batik-tulis-soga",
        teacherEmail: seedEmail("bambang"),
        score: 92,
      },
      {
        key: "dimas",
        submissionKey: "dimas-bts-final",
        pathSlug: "batik-tulis-soga",
        teacherEmail: seedEmail("sri"),
        score: 89,
      },
      {
        key: "purnomo",
        submissionKey: "purnomo-bts-final",
        pathSlug: "batik-tulis-soga",
        teacherEmail: seedEmail("bambang"),
        score: 95,
      },
      {
        key: "rani",
        submissionKey: "rani-pra-final",
        pathSlug: "pranatacara-jawa",
        teacherEmail: seedEmail("widagdo"),
        score: 90,
      },
    ]

    for (const [index, final] of finals.entries()) {
      const student = await userByEmail(ctx, seedEmail(final.key))
      const teacher = await userByEmail(ctx, final.teacherEmail)
      const path = await pathBySlug(ctx, final.pathSlug)
      const submission = await ctx.db
        .query("submissions")
        .withIndex("by_code", (q) =>
          q.eq("code", `TUG-${final.submissionKey.toUpperCase()}`),
        )
        .unique()
      if (!submission) continue
      const assessment = await ctx.db
        .query("assessments")
        .withIndex("by_submissionId", (q) =>
          q.eq("submissionId", submission._id),
        )
        .unique()
      if (!assessment) continue

      const issuedAt = ago(330 - index * 2)
      const certificateId = await ctx.db.insert("certificates", {
        serial: `KN-2026-${String(index + 1).padStart(4, "0")}`,
        publicCode: `KN-${final.key.toUpperCase()}-2026`,
        studentId: student._id,
        pathId: path.slug,
        teacherId: teacher._id,
        assessmentId: assessment._id,
        status: "issued",
        issuedAt,
        snapshot: {
          studentName: student.name,
          pathTitle: path.title,
          teacherName: teacher.name,
          assessmentScore: final.score,
          issuedAt,
        },
        createdAt: issuedAt,
        updatedAt: issuedAt,
      })
      certificateIds.set(final.key, certificateId)

      await ctx.db.insert("certificateEvents", {
        certificateId,
        kind: "issue",
        actorId: teacher._id,
        reason: "Penilaian akhir disetujui",
        createdAt: issuedAt,
      })

      const enrollment = await ctx.db
        .query("enrollments")
        .withIndex("by_studentId", (q) => q.eq("studentId", student._id))
        .collect()
      const completed = enrollment.find(
        (item) => item.pathId === path.slug && item.status === "completed",
      )
      if (completed) {
        await ctx.db.patch(completed._id, { certificateId })
      }
    }

    // A revoked certificate exercises the revocation history in the
    // certificate drawer without leaving a dangling work card.
    const dwi = await userByEmail(ctx, seedEmail("dwi"))
    const dwiSubmission = await ctx.db
      .query("submissions")
      .withIndex("by_code", (q) => q.eq("code", "TUG-DWI-BTS-1"))
      .unique()
    if (dwiSubmission) {
      const dwiAssessment = await ctx.db
        .query("assessments")
        .withIndex("by_submissionId", (q) =>
          q.eq("submissionId", dwiSubmission._id),
        )
        .unique()
      if (dwiAssessment) {
        const path = await pathBySlug(ctx, "batik-tulis-soga")
        const teacher = await userByEmail(
          ctx,
          seedEmail("bambang"),
        )
        const issuedAt = ago(15)
        const revokedAt = ago(5)
        const certificateId = await ctx.db.insert("certificates", {
          serial: "KN-2026-0005",
          publicCode: "KN-DWI-2026",
          studentId: dwi._id,
          pathId: path.slug,
          teacherId: teacher._id,
          assessmentId: dwiAssessment._id,
          status: "revoked",
          issuedAt,
          revokedAt,
          revokeReason:
            "Sertifikat uji alur verifikasi dicabut setelah koreksi ejaan nama; sertifikat pengganti diterbitkan terpisah.",
          revokedBy: admin._id,
          snapshot: {
            studentName: dwi.name,
            pathTitle: path.title,
            teacherName: teacher.name,
            assessmentScore: 88,
            issuedAt,
          },
          createdAt: issuedAt,
          updatedAt: revokedAt,
        })
        await ctx.db.insert("certificateEvents", {
          certificateId,
          kind: "issue",
          actorId: teacher._id,
          reason: "Penerbitan sertifikat angkatan perintis.",
          createdAt: issuedAt,
        })
        await ctx.db.insert("certificateEvents", {
          certificateId,
          kind: "revoke",
          actorId: admin._id,
          reason:
            "Koreksi nama dan penilaian ulang; sertifikat pengganti diterbitkan terpisah.",
          createdAt: revokedAt,
        })
      }
    }

    for (const [index, work] of WORKS.entries()) {
      const workDoc = await workBySlug(ctx, work.slug)
      const maker = await userByEmail(ctx, seedEmail(work.makerKey))
      const certificateId = certificateIds.get(work.certificateKey)
      if (!certificateId) continue
      await ctx.db.patch(workDoc._id, {
        certificateId,
        makerId: maker._id,
        pathId: work.pathSlug,
        status: "published",
        permission: work.permission,
        createdAt: ago(325 - index * 55),
      })
      await ctx.db.insert("workCards", {
        workId: workDoc._id,
        certificateId,
        makerId: maker._id,
        serial: work.workCard,
        title: work.title,
        technique: work.technique,
        materials:
          work.category === "batik"
            ? "Kain primis, malam, pewarna soga alami"
            : "Busana adat, perlengkapan acara",
        provenance: work.region,
        permission: work.permission,
        accessLevel: "public",
        status: "published",
        createdAt: ago(325 - index * 55),
        updatedAt: NOW,
      })
    }

    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      actorRole: "Pengelola",
      action: "certificates.issue",
      entityType: "certificates",
      entityId: certificateIds.get("anisa"),
      reason: "Penerbitan sertifikat angkatan perintis",
      severity: "info",
      createdAt: ago(330),
    })

    return { certificates: certificateIds.size }
  },
})

export const seedCommerce = internalMutation({
  args: {},
  handler: async (ctx) => {
    const admin = await seedAdmin(ctx)
    const orders = [
      {
        key: "order-1",
        code: "KN-2026-000108",
        buyerKey: "sari",
        sellerKey: "anisa",
        workSlug: "batik-soga-anyaman",
        baseAmount: 1_450_000,
        uniqueAmount: 1_450_037,
        status: "completed" as const,
        paidDaysAgo: 24,
        completedDaysAgo: 18,
        paymentStatus: "paid" as const,
        payoutStatus: "approved" as const,
        gatewayFee: 14_500,
      },
      {
        key: "order-2",
        code: "KN-2026-000109",
        buyerKey: "dwi",
        sellerKey: "dimas",
        workSlug: "selendang-canting-nitik",
        baseAmount: 850_000,
        uniqueAmount: 850_014,
        status: "delivered" as const,
        paidDaysAgo: 16,
        completedDaysAgo: undefined,
        paymentStatus: "paid" as const,
        payoutStatus: "paid" as const,
        gatewayFee: 8_500,
      },
      {
        key: "order-3",
        code: "KN-2026-000111",
        buyerKey: "bayu",
        sellerKey: "purnomo",
        workSlug: "batik-soga-lereng",
        baseAmount: 2_900_000,
        uniqueAmount: 2_900_021,
        status: "paid" as const,
        paidDaysAgo: 6,
        completedDaysAgo: undefined,
        paymentStatus: "paid" as const,
        payoutStatus: "held" as const,
        gatewayFee: 29_000,
      },
      {
        key: "order-4",
        code: "KN-2026-000112",
        buyerKey: "nanda",
        sellerKey: "rani",
        workSlug: "pranatacara-siraman",
        baseAmount: 2_500_000,
        uniqueAmount: 2_500_009,
        status: "awaiting_payment" as const,
        paidDaysAgo: undefined,
        completedDaysAgo: undefined,
        paymentStatus: "pending" as const,
        payoutStatus: undefined,
        gatewayFee: undefined,
      },
      {
        key: "order-5",
        code: "KN-2026-000107",
        buyerKey: "ratih",
        sellerKey: "anisa",
        workSlug: "batik-soga-anyaman",
        baseAmount: 1_450_000,
        uniqueAmount: 1_450_042,
        status: "refunded" as const,
        paidDaysAgo: 40,
        completedDaysAgo: undefined,
        paymentStatus: "refunded" as const,
        payoutStatus: "reversed" as const,
        gatewayFee: 14_500,
      },
      {
        key: "order-6",
        code: "KN-2026-000110",
        buyerKey: "yusuf",
        sellerKey: "dimas",
        workSlug: "selendang-canting-nitik",
        baseAmount: 850_000,
        uniqueAmount: 850_033,
        status: "disputed" as const,
        paidDaysAgo: 9,
        completedDaysAgo: undefined,
        paymentStatus: "paid" as const,
        payoutStatus: "held" as const,
        gatewayFee: 8_500,
      },
      {
        key: "order-7",
        code: "KN-2026-000101",
        buyerKey: "dewi",
        sellerKey: "anisa",
        workSlug: "batik-soga-anyaman",
        baseAmount: 1_450_000,
        uniqueAmount: 1_450_058,
        status: "completed" as const,
        paidDaysAgo: 358,
        completedDaysAgo: 348,
        paymentStatus: "paid" as const,
        payoutStatus: "paid" as const,
        gatewayFee: 14_500,
      },
      {
        key: "order-8",
        code: "KN-2026-000102",
        buyerKey: "arif",
        sellerKey: "purnomo",
        workSlug: "batik-soga-lereng",
        baseAmount: 2_900_000,
        uniqueAmount: 2_900_046,
        status: "completed" as const,
        paidDaysAgo: 296,
        completedDaysAgo: 286,
        paymentStatus: "paid" as const,
        payoutStatus: "paid" as const,
        gatewayFee: 29_000,
      },
      {
        key: "order-9",
        code: "KN-2026-000103",
        buyerKey: "melati",
        sellerKey: "rani",
        workSlug: "pranatacara-siraman",
        baseAmount: 2_500_000,
        uniqueAmount: 2_500_072,
        status: "completed" as const,
        paidDaysAgo: 236,
        completedDaysAgo: 228,
        paymentStatus: "paid" as const,
        payoutStatus: "approved" as const,
        gatewayFee: 25_000,
      },
      {
        key: "order-10",
        code: "KN-2026-000104",
        buyerKey: "fajar",
        sellerKey: "dimas",
        workSlug: "selendang-canting-nitik",
        baseAmount: 850_000,
        uniqueAmount: 850_061,
        status: "completed" as const,
        paidDaysAgo: 168,
        completedDaysAgo: 158,
        paymentStatus: "paid" as const,
        payoutStatus: "paid" as const,
        gatewayFee: 8_500,
      },
      {
        key: "order-11",
        code: "KN-2026-000105",
        buyerKey: "ratih",
        sellerKey: "anisa",
        workSlug: "batik-soga-anyaman",
        baseAmount: 1_450_000,
        uniqueAmount: 1_450_083,
        status: "completed" as const,
        paidDaysAgo: 112,
        completedDaysAgo: 102,
        paymentStatus: "paid" as const,
        payoutStatus: "approved" as const,
        gatewayFee: 14_500,
      },
      {
        key: "order-12",
        code: "KN-2026-000106",
        buyerKey: "nanda",
        sellerKey: "dimas",
        workSlug: "selendang-canting-nitik",
        baseAmount: 850_000,
        uniqueAmount: 850_094,
        status: "completed" as const,
        paidDaysAgo: 58,
        completedDaysAgo: 48,
        paymentStatus: "paid" as const,
        payoutStatus: "approved" as const,
        gatewayFee: 8_500,
      },
    ]

    const orderNotes: Record<string, string> = {
      "order-1":
        "Mohon dibungkus kertas bebas asam, kirim ke Mergangsan, Kota Yogyakarta.",
      "order-2":
        "Untuk hadiah pernikahan, mohon sertakan kartu perawatan kain.",
      "order-3":
        "Kirim ke alamat kantor di Mlati, terima Senin–Jumat pukul 09.00–16.00.",
      "order-4":
        "Booking untuk akad 12 Desember 2026, prosesi pagi di Banguntapan.",
      "order-7": "Pesanan pertama, mohon dipotret proses pewarnaan terakhir.",
      "order-8": "Kain untuk dipajang di galeri, mohon sertakan Kartu Karya.",
      "order-9": "Acara keluarga di Kotagede, butuh gladi resik sehari sebelumnya.",
      "order-10": "Hadiah untuk ibu, mohon dibungkus rapi.",
      "order-11": "Pesanan ulang setelah kain pertama dipakai untuk pameran.",
      "order-12": "Warna diminta sedikit lebih terang dari contoh foto.",
    }

    const orderIds = new Map<string, Id<"orders">>()
    const paymentIds = new Map<string, Id<"payments">>()
    const payoutIds = new Map<string, Id<"payouts">>()
    const saleLedgerIds = new Map<string, Id<"ledgerEntries">>()

    for (const seed of orders) {
      const buyer = await userByEmail(ctx, seedEmail(seed.buyerKey))
      const seller = await userByEmail(ctx, seedEmail(seed.sellerKey))
      const work = await workBySlug(ctx, seed.workSlug)
      const createdAt = ago(seed.paidDaysAgo ?? 2)
      const paidAt =
        seed.paidDaysAgo !== undefined ? ago(seed.paidDaysAgo) : undefined
      const orderId = await ctx.db.insert("orders", {
        code: seed.code,
        buyerUserId: buyer._id,
        buyerName: buyer.name,
        buyerEmail: buyer.email,
        buyerWhatsapp: buyer.phone,
        sellerId: seller._id,
        workId: work._id,
        pathId: work.pathId,
        baseAmount: seed.baseAmount,
        uniqueAmount: seed.uniqueAmount,
        status: seed.status,
        channel: "web",
        note:
          orderNotes[seed.key] ??
          (seed.status === "disputed"
            ? "Pembeli meminta peninjauan kondisi kain."
            : undefined),
        tokenHash: await sha256(`seed-order-token-${seed.key}`),
        idempotencyKey: `seed-idem-${seed.key}`,
        consentVersion: "2026-11-transactional",
        consentAt: createdAt,
        claimedAt: createdAt,
        paidAt,
        deliveredAt:
          seed.status === "delivered" || seed.status === "completed"
            ? ago((seed.paidDaysAgo ?? 0) - 3)
            : undefined,
        completedAt:
          seed.completedDaysAgo !== undefined
            ? ago(seed.completedDaysAgo)
            : undefined,
        cancelledAt: seed.status === "refunded" ? ago(35) : undefined,
        cancelReason:
          seed.status === "refunded"
            ? "Pembeli membatalkan setelah kain tidak sesuai ukuran."
            : undefined,
        createdAt,
        updatedAt: NOW,
      })
      orderIds.set(seed.key, orderId)

      await ctx.db.insert("orderItems", {
        orderId,
        kind: work.kind === "service" ? "service" : "work",
        refId: work._id,
        pathId: work.pathId,
        title: work.title,
        quantity: 1,
        unitAmount: seed.baseAmount,
        totalAmount: seed.baseAmount,
      })

      const paymentId = await ctx.db.insert("payments", {
        orderId,
        provider: "gopay_qris",
        providerChargeId: `seed-charge-${seed.key}`,
        providerReference: `QRIS-${seed.code}`,
        providerTransactionId:
          seed.paymentStatus === "paid" || seed.paymentStatus === "refunded"
            ? `seed-trx-${seed.key}`
            : undefined,
        baseAmount: seed.baseAmount,
        uniqueAmount: seed.uniqueAmount,
        status: seed.paymentStatus,
        expiresAt: createdAt + 15 * 60_000,
        paidAt,
        lastReconciledAt: paidAt,
        gatewayFee: seed.gatewayFee,
        qrString: `00020101021226${seed.code}5802ID`,
        qrImageUrl: undefined,
        reconciliationState: "none",
        settledEventId: paidAt ? `seed-event-settled-${seed.key}` : undefined,
        idempotencyKey: `seed-payment-idem-${seed.key}`,
        createdAt,
        updatedAt: NOW,
      })
      paymentIds.set(seed.key, paymentId)

      await ctx.db.insert("paymentEvents", {
        eventId: `seed-event-created-${seed.key}`,
        paymentId,
        orderId,
        kind: "created",
        amount: seed.uniqueAmount,
        providerReference: `QRIS-${seed.code}`,
        payload: { provider: "gopay_qris", stage: "created" },
        createdAt,
      })
      if (paidAt) {
        await ctx.db.insert("paymentEvents", {
          eventId: `seed-event-settled-${seed.key}`,
          paymentId,
          orderId,
          kind: "settled",
          amount: seed.uniqueAmount,
          providerReference: `QRIS-${seed.code}`,
          payload: { provider: "gopay_qris", stage: "settled" },
          createdAt: paidAt,
        })
      }
      if (seed.status === "refunded") {
        await ctx.db.insert("paymentEvents", {
          eventId: `seed-event-refunded-${seed.key}`,
          paymentId,
          orderId,
          kind: "refunded",
          amount: seed.uniqueAmount,
          providerReference: `QRIS-${seed.code}`,
          payload: { provider: "gopay_qris", stage: "refunded" },
          createdAt: ago(35),
        })
      }

      if (seed.payoutStatus) {
        const teacherShare = Math.round(seed.baseAmount * 0.7)
        const platformShare = Math.round(seed.baseAmount * 0.15)
        const communityShare =
          seed.baseAmount - teacherShare - platformShare
        const payoutId = await ctx.db.insert("payouts", {
          teacherId: seller._id,
          periodStart: createdAt,
          periodEnd: createdAt + 7 * DAY,
          gross: seed.baseAmount,
          teacherShare,
          platformShare,
          communityShare,
          status: seed.payoutStatus,
          approvedBy:
            seed.payoutStatus === "approved" || seed.payoutStatus === "paid"
              ? admin._id
              : undefined,
          paidAt: seed.payoutStatus === "paid" ? ago(10) : undefined,
          reason:
            seed.payoutStatus === "held"
              ? "Ditahan sampai pesanan selesai atau sengketa ditutup."
              : undefined,
          orderId,
          paymentId,
          dueAt: createdAt + 7 * DAY,
          kind: "sale",
          holdReason:
            seed.payoutStatus === "held"
              ? "Menunggu penyelesaian pesanan."
              : undefined,
          paidAmount:
            seed.payoutStatus === "paid" ? teacherShare : undefined,
          reference: `PAYOUT-${seed.code}`,
          createdAt: createdAt + DAY,
          updatedAt: NOW,
        })
        payoutIds.set(seed.key, payoutId)

        const teacherEntryId = await ctx.db.insert("ledgerEntries", {
          orderId,
          paymentId,
          payoutId,
          teacherId: seller._id,
          account: "teacher",
          direction: "credit",
          amount: teacherShare,
          currency: "IDR",
          entryType: "sale",
          reason: "Bagi hasil pengajar dan pembuat karya 70%",
          createdAt: paidAt ?? createdAt,
        })
        saleLedgerIds.set(seed.key, teacherEntryId)
        await ctx.db.insert("ledgerEntries", {
          orderId,
          paymentId,
          payoutId,
          account: "platform",
          direction: "credit",
          amount: platformShare,
          currency: "IDR",
          entryType: "sale",
          reason: "Operasional platform 15%",
          createdAt: paidAt ?? createdAt,
        })
        await ctx.db.insert("ledgerEntries", {
          orderId,
          paymentId,
          payoutId,
          account: "community",
          direction: "credit",
          amount: communityShare,
          currency: "IDR",
          entryType: "sale",
          reason: "Dana komunitas dan sanggar 15%",
          createdAt: paidAt ?? createdAt,
        })
        if (seed.gatewayFee) {
          await ctx.db.insert("ledgerEntries", {
            orderId,
            paymentId,
            payoutId,
            account: "gateway_fee",
            direction: "debit",
            amount: seed.gatewayFee,
            currency: "IDR",
            entryType: "sale",
            reason: "Biaya gerbang pembayaran",
            createdAt: paidAt ?? createdAt,
          })
        }
        if (seed.payoutStatus === "paid") {
          await ctx.db.insert("ledgerEntries", {
            orderId,
            paymentId,
            payoutId,
            teacherId: seller._id,
            account: "teacher",
            direction: "debit",
            amount: teacherShare,
            currency: "IDR",
            entryType: "payout",
            reason: "Payout dibayarkan ke rekening pengajar",
            createdAt: ago(10),
          })
        }
      }
    }

    const refundOrder = orderIds.get("order-5")
    const refundPayment = paymentIds.get("order-5")
    if (refundOrder && refundPayment) {
      const ratih = await userByEmail(ctx, seedEmail("ratih"))
      const refundId = await ctx.db.insert("refunds", {
        orderId: refundOrder,
        paymentId: refundPayment,
        requestedBy: ratih._id,
        amount: 1_450_042,
        reason: "Ukuran kain tidak sesuai deskripsi.",
        status: "paid",
        decidedBy: admin._id,
        decisionReason: "Bukti foto mendukung permintaan pembeli.",
        evidence: "Foto ukuran kain dan percakapan dengan penjual.",
        reviewedAt: ago(36),
        paidAt: ago(35),
        createdAt: ago(38),
        updatedAt: NOW,
      })
      const originalPayout = payoutIds.get("order-5")
      if (originalPayout) {
        const reversalId = await ctx.db.insert("payouts", {
          teacherId: (await userByEmail(ctx, seedEmail("anisa")))._id,
          periodStart: ago(40),
          periodEnd: ago(33),
          gross: -1_450_000,
          teacherShare: -1_015_000,
          platformShare: -217_500,
          communityShare: -217_500,
          status: "paid",
          orderId: refundOrder,
          paymentId: refundPayment,
          kind: "reversal",
          reversalOf: originalPayout,
          reason: "Pembalikan payout setelah refund.",
          createdAt: ago(35),
          updatedAt: NOW,
        })
        await ctx.db.insert("ledgerEntries", {
          orderId: refundOrder,
          paymentId: refundPayment,
          payoutId: reversalId,
          refundId,
          account: "teacher",
          direction: "debit",
          amount: 1_015_000,
          currency: "IDR",
          entryType: "reversal",
          reversalOf: saleLedgerIds.get("order-5"),
          reason: "Pembalikan bagi hasil setelah refund",
          createdAt: ago(35),
        })
        await ctx.db.insert("ledgerEntries", {
          orderId: refundOrder,
          paymentId: refundPayment,
          payoutId: reversalId,
          refundId,
          account: "platform",
          direction: "debit",
          amount: 217_500,
          currency: "IDR",
          entryType: "reversal",
          reason: "Pembalikan bagian platform setelah refund",
          createdAt: ago(35),
        })
        await ctx.db.insert("ledgerEntries", {
          orderId: refundOrder,
          paymentId: refundPayment,
          payoutId: reversalId,
          refundId,
          account: "community",
          direction: "debit",
          amount: 217_500,
          currency: "IDR",
          entryType: "reversal",
          reason: "Pembalikan dana komunitas setelah refund",
          createdAt: ago(35),
        })
      }
    }

    const disputeOrder = orderIds.get("order-6")
    if (disputeOrder) {
      const yusuf = await userByEmail(ctx, seedEmail("yusuf"))
      await ctx.db.insert("disputes", {
        subjectType: "order",
        subjectId: disputeOrder,
        openedBy: yusuf._id,
        status: "open",
        reason:
          "Warna kain lebih gelap dari foto. Saya minta peninjauan sebelum pesanan diselesaikan.",
        createdAt: ago(2),
        updatedAt: NOW,
      })
    }

    return {
      orders: orderIds.size,
      payments: paymentIds.size,
      payouts: payoutIds.size,
    }
  },
})
