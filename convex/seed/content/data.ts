import { SPLIT_PERCENTAGES } from "../../../lib/commerce/money"
import {
  ABOUT_LOOP_HREF,
  PUBLIC_ROUTES,
} from "../../../lib/content/routes"
import type {
  CatalogField,
  Faq,
  LearningPath,
  SiteCopy,
  Teacher,
  Testimonial,
  Work,
} from "../../../lib/content/types"

/**
 * Seed data never stores static image paths. Each image carries a bare
 * filename that the seed mutation resolves against the `mediaAssets` registry
 * (files live in `seed/images` only as the upload source for Convex storage).
 */
type WithImageFile<T> = Omit<T, "image"> & { imageFile: string }

/** `modules` is derived from `pathModules`, never stored as seed copy. */
export type SeedLearningPath = WithImageFile<Omit<LearningPath, "modules">>
export type SeedTeacher = WithImageFile<Teacher> & {
  /** Stable identity key shared with the workspace seed. */
  key: string
  pathIds: string[]
  status: "active" | "review"
  verificationStatus: "verified" | "under_review"
  published: boolean
}
export type SeedWork = WithImageFile<Work> & {
  /** Stable identity keys shared with the workspace seed. */
  makerKey: string
  pathSlug: string
  certificateKey: string
  permission: string
}

export type SeedSiteCopy = Omit<SiteCopy, "hero" | "metadata"> & {
  hero: Omit<SiteCopy["hero"], "plate"> & {
    plate: WithImageFile<SiteCopy["hero"]["plate"]>
  }
  metadata: Omit<SiteCopy["metadata"], "image"> & {
    image: Omit<SiteCopy["metadata"]["image"], "url"> & { imageFile: string }
  }
}

export const siteSeed: SeedSiteCopy = {
  metadata: {
    siteName: "KalaNidhi Digital",
    siteUrl: "https://kalanidhi.site",
    areaServed: "Daerah Istimewa Yogyakarta",
    title: "KalaNidhi Digital: belajar sampai bisa, bisa sampai mengajari",
    description:
      "Platform belajar praktik budaya Nusantara. Tugas dinilai pengajar, sertifikat platform bisa diverifikasi, karya punya Kartu Karya. Lulusan dapat kembali sebagai pengajar, penilai, atau pemasok.",
    ogTitle: "KalaNidhi Digital: belajar sampai bisa, bisa sampai mengajari",
    ogDescription:
      "Bidang budaya dipetakan, jalur belajar dibuka bertahap. Belajar langsung dari pengajar, dinilai manusia, lalu berkarya dengan Kartu Karya.",
    twitterTitle:
      "KalaNidhi Digital: belajar sampai bisa, bisa sampai mengajari",
    twitterDescription:
      "Jalur belajar praktik budaya Nusantara dengan penilaian pengajar dan sertifikat platform.",
    keywords: [
      "batik bambu",
      "batik tulis",
      "batik tulis giriloyo",
      "aksara jawa",
      "hanacaraka",
      "pranatacara",
      "gerabah",
      "karawitan",
      "tari tradisi",
      "keramik",
      "jamu",
      "wayang",
      "kriya tradisi",
      "kursus budaya",
      "sertifikat platform",
      "KalaNidhi",
    ],
    category: "education",
    image: {
      imageFile: "og-kalanidhi.jpg",
      width: 1200,
      height: 630,
      alt: "Plat KalaNidhi Digital: belajar praktik budaya Nusantara",
    },
  },
  header: {
    brandAria: "KalaNidhi Digital: kembali ke atas",
    mainNavAria: "Navigasi utama",
    mobileNavAria: "Navigasi mobile",
    searchAria: "Cari jalur, pengajar, bidang, atau karya",
    searchLabel: "Cari",
    menuAria: "Buka menu navigasi",
    loginCta: "Masuk",
    registerCta: "Daftar",
    mobileSearch: "Cari jalur, pengajar, atau karya",
    mobileRegisterCta: "Daftar minat",
    sheetTitle: "Menu navigasi",
    sheetDescription:
      "Navigasi utama, pencarian, dan pendaftaran KalaNidhi Digital.",
    region: "Daerah Istimewa Yogyakarta",
    homeLabel: "Beranda",
  },
  hero: {
    title: ["Duduk di bangku ini.", "Nanti kamu yang mengajari."],
    description:
      "KalaNidhi Digital mempertemukan pelajar dengan pengajar batik bambu, aksara Jawa, pranatacara, gerabah, karawitan, tari, dan praktik hidup lain di Yogyakarta. Kerjakan tugas dengan tangan atau suara, kirim hasilnya, terima koreksi pengajar, lalu bawa karya atau jasamu ke pembeli. Lulusan yang siap kembali mengajar dan membuka jalur untuk pelajar berikutnya.",
    primaryCta: "Pilih jalur yang terbuka",
    secondaryCta: "Lihat lingkarannya",
    plate: {
      imageFile: "hero-canting.jpg",
      alt: "Tangan membatik dengan canting di atas kain",
      caption: "Ilustrasi proses canting di atas kain",
      note: "Arsip platform",
    },
    workCard: {
      title: "Kartu Karya",
    },
  },
  traction: {
    label: "Capaian 2026",
    note: "Angka dihitung dari catatan platform: bidang, pengajar terbit, peserta aktif, tugas yang dinilai, dan karya terbit.",
    figures: [
      { metric: "fields", label: "bidang budaya dipetakan" },
      { metric: "teachers", label: "pengajar dan praktisi" },
      { metric: "participants", label: "peserta" },
      { metric: "submissions", label: "tugas dinilai" },
      { metric: "works", label: "karya dan jasa" },
    ],
  },
  loop: {
    label: "Cara kerja",
    title: "Satu bangku, lima langkah, lalu kembali ke awal.",
    description:
      "Belajar, dinilai, tersertifikasi, berkarya. Empat langkah inti itu berputar di bangku yang sama. Langkah kelima membuka jalur kembali: lulusan bisa menjadi pengajar pendamping, penilai, atau pemasok. Dari situ jalur baru dibuka, dan pelajar baru masuk.",
    returnLabel: "jalur kembali",
    returnNote:
      "Karya yang selesai dibawa kembali ke bangku pertama. Lulusan yang mengajar menaruh alatnya di rak, dan pelajar berikutnya duduk.",
    returnCaveat:
      "Jalur kembali tidak menjanjikan semua lulusan mengajar. Pintu ini disiapkan untuk pengajar pendamping, penilai tugas, atau pemasok bahan. Setiap pintu yang terisi membuka jalur baru.",
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
    ],
  },
  catalog: {
    label: "Peta bidang",
    title: "Bidang ini tumbuh satu per satu, bersama pengajarnya.",
    description:
      "Katalog tumbuh dari pengajar yang masuk. Peta di bawah menunjukkan mana yang sudah bisa dikerjakan sekarang, mana yang sedang disiapkan, dan mana yang masih menunggu pengajar.",
    cta: "Lihat jalur yang terbuka",
    groups: [
      {
        status: "Terbuka",
        title: "Sudah di bangku",
        blurb:
          "Bisa dimulai sekarang, dengan pengajar dan kurikulum yang siap.",
      },
      {
        status: "Sedang dipetakan",
        title: "Sedang disiapkan",
        blurb:
          "Kurikulum dan pengajar sedang ditata. Belum dibuka untuk pendaftaran.",
      },
      {
        status: "Direncanakan",
        title: "Menunggu pengajar",
        blurb:
          "Bidangnya ada. Pengajar yang mau membuka jalur belum bergabung.",
      },
    ],
  },
  sections: {
    paths: {
      label: "Jalur belajar",
      title: "Jalur yang sudah terbuka, satu per satu.",
      description:
        "Setiap jalur punya pengajar, modul, dan tugas praktik yang dinilai manusia. Pilih yang paling dekat dengan tanganmu sekarang.",
      detailCta: "Buka rincian",
      openCta: "Daftar minat",
      plannedCta: "Catat minat",
      priceLabel: "Biaya jalur",
      statusLabel: "Status",
      contentLabel: "Isi",
      includesLabel: "Yang termasuk",
      curriculumPending: "Kurikulum disusun",
      teacherLabel: "Pengajar",
      regionLabel: "Daerah",
      levelLabel: "Level",
      emptyState:
        "Belum ada jalur terbit di Convex. Jalur akan muncul di sini setelah kurikulum, pengajar, dan angkatan pertama tersedia.",
    },
    teachers: {
      label: "Pengajar",
      title: "Tangan yang mengajari.",
      description:
        "Mereka masih mengerjakan praktiknya. Itu sebabnya koreksinya spesifik: tekanan canting, arah jarum, napas kalimat.",
      profileCta: "Baca profil",
      dialogLabel: "Profil pengajar",
      askCta: "Tanya lewat formulir",
      emptyState:
        "Belum ada pengajar terbit di Convex. Profil akan muncul di sini setelah pengajar menyelesaikan verifikasi dan publikasi.",
    },
    works: {
      label: "Karya dan jasa",
      title: "Dari bangku ke pembeli.",
      description:
        "Karya di bawah ini lahir dari tugas yang dinilai. Setiap karya membawa Kartu Karya: pembuat, teknik, pengajar, dan jejak prosesnya.",
      featuredLabel: "Karya pilihan",
      serviceLabel: "Jasa pilihan",
      priceLabel: "Harga karya",
      askCta: "Tanya karya ini",
      openCta: "Buka karya",
      cardLabel: "Kartu Karya",
      makerLabel: "Pembuat",
      teacherLabel: "Pengajar",
      techniqueLabel: "Teknik",
      regionLabel: "Daerah",
      emptyState:
        "Belum ada karya terbit di Convex. Karya akan muncul di sini setelah Kartu Karya dan sertifikat platformnya terbit.",
    },
    notes: {
      label: "Catatan peserta",
      title: "Catatan dari peserta.",
      description:
        "Catatan dari peserta dan mitra tentang pengalaman belajar, koreksi pengajar, dan karya yang mereka buat.",
      emptyState: "Belum ada catatan peserta yang terbit di Convex.",
    },
    faq: {
      label: "Pertanyaan",
      title: "Tanya dulu sebelum duduk.",
      description:
        "Jawaban singkat untuk hal yang paling sering ditanyakan sebelum orang mengirim tugas pertama.",
      policyCta: "Baca aturan bengkel",
      askCta: "Tanya lewat formulir",
      askInterest: "Pertanyaan umum",
      emptyState: "Belum ada pertanyaan umum yang terbit di Convex.",
    },
    closing: {
      label: "Mulai dari sini",
      title: "Bangku berikutnya kosong.",
      description:
        "Pilih jalur, kerjakan tugas pertama, dan kirim untuk dikoreksi. Kalau sudah siap, kamu bisa kembali mengajar dan membuka jalur untuk orang berikutnya.",
      primaryCta: "Daftar minat",
      secondaryCta: "Lihat jalur",
      noteSuffix:
        "Praktisi dari kabupaten dan kota di DIY dapat mengajukan jalur baru.",
    },
  },
  mangsa: {
    label: "Musim tanam",
    season: "Musim VII",
    name: "Kapitu",
    period: "23 Desember - 3 Februari",
    eyebrow: "Pranata mangsa",
    title: "Musim hujan, waktu bibit padi pindah ke sawah.",
    description:
      "Kapitu adalah mangsa ketujuh dalam penanggalan Pranata Mangsa versi Kasunanan Surakarta. Hujan turun lebat dan sungai berpotensi meluap. Petani memindahkan bibit padi dari pembenihan ke sawah, sambil menjaga saluran air agar tanaman tidak terendam.",
    activities: [
      "Memindahkan bibit padi",
      "Mengatur aliran air",
      "Merawat pematang sawah",
    ],
    activityLabel: "Yang dikerjakan",
    provenance:
      "Rujukan: Pranata Mangsa versi Kasunanan Surakarta (Daldjoeni, 1984); berlaku lokal di wilayah Merapi-Lawu. Penanggalan dapat bergeser mengikuti cuaca.",
  },
  ethics: {
    label: "Aturan bengkel",
    title: "Setiap pengetahuan membawa nama, sumber, dan pembagian.",
    description:
      "Kartu Sumber Budaya tampil di jalur, karya, dan pustaka. Isinya mencatat sumber materi, rujukan, tanggal pencatatan, tingkat akses, dan aliran nilai ekonomi. Kami menuliskannya sebelum kamu memutuskan.",
    principles: [
      {
        title: "Sumber yang bisa dilacak",
        description:
          "Materi kurikulum berasal dari arsip pengelola platform dan rujukan publik. Sumber, pengajar, dan rujukan tercatat di setiap jalur dan karya.",
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
        value: SPLIT_PERCENTAGES.teacher,
        note: "Imbalan bimbingan dan kompensasi langsung pembuat karya.",
      },
      {
        label: "Dana komunitas dan sanggar",
        value: SPLIT_PERCENTAGES.community,
        note: "Konservasi bahan, perawatan alat, dan kegiatan sanggar.",
      },
      {
        label: "Operasional platform",
        value: SPLIT_PERCENTAGES.platform,
        note: "Verifikasi, sertifikat, dan pengelolaan pengiriman paket.",
      },
    ],
    shareTitle: "Bagi hasil",
    shareNote: "Ditampilkan sebelum transaksi",
    shareAriaLabel: `Bagi hasil ${SPLIT_PERCENTAGES.teacher} persen untuk pengajar dan pembuat karya, ${SPLIT_PERCENTAGES.community} persen untuk dana komunitas dan sanggar, ${SPLIT_PERCENTAGES.platform} persen untuk operasional platform`,
    card: {
      sourceTitle: "Kartu Sumber Budaya",
      permissionLabel: "Sumber",
      referenceLabel: "Rujukan",
      emptyState:
        "Belum ada catatan sumber budaya yang terbit di Convex. Izin dan atribusi akan tampil di sini setelah dicatat.",
    },
  },
  institution: {
    label: "Untuk institusi",
    title: "Bawa kelasmu ke bangku.",
    description:
      "Program institusi disusun setelah sesi pemetaan kebutuhan. Belum ada paket siap pakai; kurikulum, jumlah peserta, dan izin dibicarakan lebih dulu.",
    segments: [
      "Sekolah",
      "EO dan wedding organizer",
      "Desa wisata dan hotel",
      "Korporat",
    ],
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
    summaryLabel: "Ringkasan program",
    summaryTitle: "Kerangka awal",
    year: "2026",
  },
  footer: {
    description:
      "Platform belajar praktik budaya Nusantara. Dinilai pengajar, tersertifikasi platform, lalu tersambung ke karya dan jasa. Lulusan dapat kembali sebagai pengajar, penilai, atau pemasok.",
    columns: [
      {
        title: "Isi bangku",
        links: [
          { label: "Lingkaran", href: ABOUT_LOOP_HREF },
          { label: "Bidang", href: PUBLIC_ROUTES.fields },
          { label: "Jalur belajar", href: PUBLIC_ROUTES.paths },
          { label: "Pengajar", href: PUBLIC_ROUTES.teachers },
          { label: "Karya dan jasa", href: PUBLIC_ROUTES.works },
        ],
      },
      {
        title: "Platform",
        links: [
          { label: "Etika dan hak budaya", href: PUBLIC_ROUTES.ethics },
          { label: "Untuk institusi", href: PUBLIC_ROUTES.institution },
          { label: "Pertanyaan umum", href: PUBLIC_ROUTES.faq },
          { label: "Tentang KalaNidhi Digital", href: PUBLIC_ROUTES.about },
        ],
      },
    ],
    secretariat: {
      label: "Sekretariat",
      value: "Trimurti, Srandakan, Bantul, Yogyakarta, Indonesia",
    },
    edition: "Edisi 2026",
    copyright: "© 2026 KalaNidhi Digital. Dibuat di Yogyakarta.",
    sourceLabel: "Catatan sumber",
    sourceDescription:
      "Pengetahuan pada halaman ini disertai catatan sumber. Setiap karya mencantumkan pembuat, pengajar pendamping, dan sumber pengetahuan.",
    sourcesLabel: "Sumber",
    cultureLabel: "Hak budaya",
    culturePolicyCta: "Baca prinsip etika",
    certificateNote:
      "Sertifikat menandai kompetensi di platform KalaNidhi Digital. Sertifikasi pemerintah dan BNSP memiliki jalur terpisah.",
    preferencesLabel: "Preferensi",
    languageLabel: "Bahasa",
    dataSaverLabel: "Hemat kuota",
    privacyLabel: "Kebijakan privasi",
    termsLabel: "Ketentuan layanan",
    backToTopLabel: "Kembali ke atas",
    newsletter: {
      label: "Kabar jalur dan karya baru",
      placeholder: "Email untuk kabar jalur baru",
      cta: "Ikuti kabar",
      pending: "Mengirim",
      note: "Kami hanya mengirim kabar jalur dan karya baru. Berhenti kapan saja.",
      errorNote: "Periksa alamat emailmu.",
      interest: "Kabar jalur dan karya baru",
      source: "footer",
    },
  },
  navigation: [
    { label: "Lingkaran", href: ABOUT_LOOP_HREF },
    { label: "Bidang", href: PUBLIC_ROUTES.fields },
    { label: "Jalur", href: PUBLIC_ROUTES.paths },
    { label: "Pengajar", href: PUBLIC_ROUTES.teachers },
    { label: "Karya", href: PUBLIC_ROUTES.works },
    { label: "Etika", href: PUBLIC_ROUTES.ethics },
  ],
  overlays: {
    policy: {
      icon: "policy",
      title: "Etika dan hak budaya",
      description:
        "Prinsip yang kami pakai sebelum sebuah pengetahuan atau karya ditampilkan.",
      bullets: [
        "Sumber materi, pengajar, dan rujukan tampil di setiap jalur dan karya.",
        "Status sumber dan tanggal pencatatan ditampilkan bersama tingkat aksesnya.",
        "Rincian bagi hasil dapat dilihat sebelum transaksi, saat kamu masih bisa memutuskan.",
        "Pengetahuan terbatas dihormati. Tidak semua materi dibuka untuk publik.",
        "Motif sakral atau larangan tidak dipakai sebagai dekorasi antarmuka.",
      ],
      footnote:
        "Kebijakan lengkap tersedia untuk pengajar, sanggar, dan mitra institusi. Untuk pertanyaan lain, hubungi tim kurator.",
      action: {
        label: "Tanyakan kebijakan",
        lead: { variant: "consultation", interest: "Etika dan hak budaya" },
      },
    },
    login: {
      icon: "login",
      title: "Masuk ke KalaNidhi Digital",
      description:
        "Dasbor pelajar, pengajar, dan mitra menyimpan alur belajar, tugas, dan sertifikat dalam satu tempat.",
      bullets: [
        "Pelajar bisa membuka modul, mengirim tugas, dan mengunduh sertifikat.",
        "Pengajar bisa meninjau tugas dan mengelola jadwal sesi.",
        "Mitra institusi bisa memantau progres peserta dan rekap kehadiran.",
      ],
      footnote:
        "Gunakan email yang sama saat mendaftar. Akun pengajar dan mitra dibuat bersama tim KalaNidhi Digital.",
      action: {
        label: "Daftar minat",
        lead: { variant: "student" },
      },
    },
    mangsa: {
      icon: "calendar",
      title: "Kalender Pranata Mangsa",
      description:
        "Kalender 12 mangsa dengan catatan tanam dan rujukan yang bisa dilacak.",
      bullets: [
        "Roda 12 mangsa, linimasa, dan tampilan daftar.",
        "Setiap entri menampilkan sumber serta catatan kurator.",
        "Pengingat musim dan tautan ke entri Pustaka terkait.",
      ],
      footnote:
        "Entri disusun dari Pranata Mangsa versi Kasunanan Surakarta dan rujukan pertanian. Untuk keputusan tanam, tetap cek prakiraan cuaca resmi.",
      action: {
        label: "Beri tahu saya",
        lead: { variant: "notify", interest: "Pustaka dan kalender mangsa" },
      },
    },
    verify: {
      icon: "verify",
      title: "Verifikasi sertifikat dan Kartu Karya",
      description:
        "Masukkan kode sertifikat atau kode Kartu Karya dari label QR untuk melihat statusnya.",
      bullets: [
        "Status valid, dicabut, atau tidak ditemukan ditampilkan dengan jelas.",
        "Data pemegang dapat disamarkan sesuai pengaturan privasi.",
        "Sertifikat menegaskan kompetensi platform, bukan sertifikasi pemerintah.",
      ],
      footnote:
        "Pemindai QR tersedia di aplikasi mobile. Di web, masukkan kode di halaman verifikasi.",
      action: {
        label: "Beri tahu saya",
        lead: { variant: "notify", interest: "Verifikasi sertifikat" },
      },
    },
    about: {
      icon: "about",
      title: "Tentang KalaNidhi Digital",
      description:
        "KalaNidhi Digital adalah ruang belajar praktik budaya Nusantara yang dibangun bersama pengajar dan sanggar. Bidang budaya dipetakan dan jalur belajar dibuka bertahap.",
      bullets: [
        "Jalur belajar disusun bersama pengajar, kurator, dan praktisi sanggar.",
        "Setiap karya membawa Kartu Karya yang mencatat pembuat, teknik, dan proses.",
        "Sertifikat KalaNidhi Digital adalah sertifikat platform dengan kode verifikasi publik.",
        "Lulusan dapat mengajukan diri sebagai pengajar pendamping, penilai, atau pemasok.",
        "Layanan berjalan di Daerah Istimewa Yogyakarta. Setiap kabupaten dan kota membuka jalur bersama pengajarnya sendiri.",
      ],
      footnote:
        "Sekretariat kami berada di Trimurti, Srandakan, Bantul, Yogyakarta. Untuk kerja sama, gunakan formulir institusi.",
      action: {
        label: "Hubungi kami",
        lead: { variant: "consultation", interest: "Tentang KalaNidhi Digital" },
      },
    },
    privacy: {
      icon: "privacy",
      title: "Kebijakan privasi",
      description:
        "Kami memproses data yang kamu kirim melalui formulir untuk menindaklanjuti pendaftaran dan pertanyaan.",
      bullets: [
        "Data yang dikirim tidak dijual atau dibagikan untuk iklan.",
        "Kami menyimpan data selama proses pendaftaran dan komunikasi berlangsung.",
        "Kamu bisa meminta akses, koreksi, atau penghapusan data kapan saja.",
      ],
      footnote:
        "Untuk permintaan terkait data pribadi, hubungi privasi@kalanidhi.site.",
    },
    terms: {
      icon: "terms",
      title: "Ketentuan layanan",
      description:
        "Dengan menggunakan KalaNidhi Digital, kamu setuju pada ketentuan yang berlaku untuk kelas, karya, dan layanan.",
      bullets: [
        "Harga, ketersediaan, dan jadwal dapat berubah sebelum transaksi dikonfirmasi.",
        "Sertifikat dan Kartu Karya diterbitkan oleh KalaNidhi Digital sebagai platform.",
        "Pembayaran, pengiriman, dan pembatalan mengikuti ketentuan yang tampil di halaman transaksi.",
      ],
      footnote:
        "Versi lengkap ketentuan tersedia sebelum kamu menyelesaikan pembayaran.",
    },
  },
  search: {
    title: "Cari di KalaNidhi Digital",
    description: "Cari jalur belajar, pengajar, karya, atau halaman.",
    placeholder: "Cari jalur, pengajar, karya…",
    emptyPrefix: "Belum ada yang cocok untuk “",
    emptySuffix: "”. Coba kata kunci lain.",
    footerLabel: "Cari di seluruh halaman",
    escLabel: "untuk menutup",
    closeLabel: "Tutup",
    groups: {
      paths: "Jalur belajar",
      teachers: "Pengajar",
      works: "Karya dan jasa",
      fields: "Bidang budaya",
      pages: "Halaman",
    },
    pathComingSoon: "Sedang disusun, daftar tunggu dibuka",
    pages: [
      {
        label: "Cara kerja lingkaran",
        description: "Lima tahap di bangku yang sama",
        href: "#lingkaran",
      },
      {
        label: "Etika dan bagi hasil",
        description: "Sumber, izin, tingkat akses, dan distribusi pendapatan",
        href: "#etika",
      },
      {
        label: "Kalender mangsa",
        description: "Musim tanam padi dalam penanggalan Jawa",
        href: "#mangsa",
      },
      {
        label: "Untuk institusi",
        description: "Sekolah, EO, desa wisata, dan korporat",
        href: "#institusi",
      },
      {
        label: "Pertanyaan umum",
        description: "Jawaban tentang penilaian, sertifikat, dan hak budaya",
        href: "#faq",
      },
    ],
  },
  mobileCta: {
    label: "Mulai dari",
    pricePrefix: "",
    priceSuffix: "/ jalur",
    registerCta: "Daftar minat",
    note: "Sudah termasuk penilaian pengajar",
  },
  leadDialogs: {
    student: {
      title: "Daftar minat belajar",
      description:
        "Pilih jalur yang ingin kamu mulai. Tim KalaNidhi Digital akan menghubungimu untuk jadwal dan langkah berikutnya.",
    },
    institution: {
      title: "Minta penawaran institusi",
      description:
        "Ceritakan kebutuhan kelas, tim, atau tamu. Tim institusi akan menyiapkan penawaran dan jadwal sesi.",
    },
    consultation: {
      title: "Tanya sebelum memesan",
      description:
        "Tanyakan ketersediaan, ukuran, jadwal, atau jalur yang paling cocok. Tim KalaNidhi Digital akan menghubungimu.",
    },
    notify: {
      title: "Beri tahu saya",
      description:
        "Tinggalkan email agar kami bisa mengabari saat bagian ini dibuka.",
    },
  },
}

export const catalogFieldsSeed: CatalogField[] = [
  {
    name: "Batik bambu",
    region: "Krebet, Sendangsari, Pajangan, Bantul",
    status: "Terbuka",
    note: "Jalur aktif",
  },
  {
    name: "Aksara Jawa",
    region: "Kota Yogyakarta",
    status: "Terbuka",
    note: "Jalur aktif",
  },
  {
    name: "Pranatacara",
    region: "Kota Yogyakarta",
    status: "Terbuka",
    note: "Jalur aktif",
  },
  {
    name: "Kriya gerabah",
    region: "Kasongan, Bantul",
    status: "Sedang dipetakan",
    note: "Kurikulum disusun; pembentukan dan pembakaran",
  },
  {
    name: "Batik tulis",
    region: "Giriloyo, Wukirsari, Imogiri, Bantul",
    status: "Sedang dipetakan",
    note: "Materi sumber belum tersedia",
  },
  {
    name: "Karawitan",
    region: "Kota Yogyakarta",
    status: "Sedang dipetakan",
    note: "Pengajar dijajaki",
  },
  {
    name: "Tari kreasi",
    region: "Kota Yogyakarta dan Sleman",
    status: "Terbuka",
    note: "Jalur aktif",
  },
  {
    name: "Keramik",
    region: "Bantul",
    status: "Direncanakan",
    note: "Belum ada pengajar; fokus glaze dan stoneware",
  },
  {
    name: "Kuliner Nusantara",
    region: "Kota Yogyakarta dan Kulon Progo",
    status: "Terbuka",
    note: "Jalur aktif",
  },
  {
    name: "Jamu",
    region: "Sleman",
    status: "Direncanakan",
    note: "Belum ada pengajar",
  },
  {
    name: "Wayang",
    region: "Bantul",
    status: "Direncanakan",
    note: "Belum ada pengajar",
  },
]

export const pathsSeed: SeedLearningPath[] = [
  {
    slug: "batik-bambu",
    code: "Jalur 01",
    title: "Batik Bambu",
    subtitle:
      "Memilih bambu, merebus, mengeringkan, mengamplas, memberi pola, nglowongi, ngisen-isen, mbabar, nembok, warna dasar, nglorod, mepe, finishing, memeriksa",
    teacher: "Sri Sriningsih",
    teacherRole:
      "Perajin batik bambu; materi adaptasi dari Paguyuban Batik Tulis Giriloyo",
    region: "Krebet, Sendangsari, Pajangan, Bantul, D.I. Yogyakarta",
    level: "Pemula",
    weeks: 6,
    tasks: 6,
    price: 1_250_000,
    imageFile: "path-batik-bambu.jpg",
    tags: ["Paket bahan disiapkan platform", "Sertifikat platform"],
    outcome:
      "Satu nampan atau panel bambu batik hasil sendiri, lengkap dengan catatan proses dari pemilihan bambu sampai pelapisan untuk Kartu Karya.",
    includes: [
      "6 modul bacaan dan latihan",
      "Paket bahan: tiga bilah bambu kering siap amplas, malam, tiga warna, dan pelapis",
      "Alat pribadi yang perlu disiapkan: canting, wajan kecil, kompor, dan kuas",
      "Panduan bahan, alat, dan keselamatan kerja",
      "6 tugas praktik dinilai perajin",
      "Ujian akhir dan sertifikat platform",
    ],
  },
  {
    slug: "pranatacara-jawa",
    code: "Jalur 02",
    title: "Seni Pembawa Acara Tradisi Jawa",
    subtitle: "Tata wicara, urutan acara, dan etiket panggung",
    teacher: "Widagdo Saputra",
    teacherRole: "Pembina pembawa acara adat",
    region: "Kota Yogyakarta, D.I. Yogyakarta",
    level: "Terbuka umum",
    weeks: 4,
    tasks: 3,
    price: 980_000,
    imageFile: "path-pranatacara.jpg",
    tags: ["Kelas live", "Sertifikat platform"],
    outcome:
      "Rekaman praktik dengan susunan acara lengkap, catatan pengajar, dan sertifikat platform.",
    includes: [
      "6 modul bacaan dan latihan tata wicara",
      "2 sesi live bersama pengajar",
      "3 rekaman praktik yang dinilai",
      "Sertifikat platform dan portofolio jasa",
    ],
  },
  {
    slug: "kriya-gerabah-bantul",
    code: "Jalur 03",
    title: "Kriya Gerabah Bantul",
    subtitle: "Membentuk, mengeringkan, dan membakar gerabah Kasongan",
    teacher: "",
    teacherRole: "",
    region: "Kasongan, Kasihan, Bantul, D.I. Yogyakarta",
    level: "Pemula",
    weeks: 0,
    tasks: 0,
    price: null,
    priceLabel: "Sedang disusun",
    imageFile: "path-gerabah-bantul.jpg",
    tags: ["Sedang disusun"],
    outcome:
      "Pengantar membentuk gerabah di roda putar, mengolah tanah liat Kasongan, dan membakar di tungku. Kurikulum sedang disusun bersama pengrajin Kasongan.",
    includes: [
      "Kurikulum dalam penyusunan",
      "Daftar tunggu dibuka",
      "Materi menyusul",
    ],
    comingSoon: true,
  },
  {
    slug: "aksara-jawa",
    code: "Jalur 04",
    title: "Aksara Jawa: Membaca dan Menulis",
    subtitle: "Dari hanacaraka sampai kalimat utuh tanpa spasi",
    teacher: "Suwardi Pratama",
    teacherRole: "Pengajar aksara Jawa, Kota Yogyakarta",
    region: "Kota Yogyakarta, D.I. Yogyakarta",
    level: "Pemula",
    weeks: 5,
    tasks: 6,
    price: 650_000,
    imageFile: "path-aksara-jawa.jpg",
    tags: ["Belajar mandiri", "Sertifikat platform", "Tanpa paket bahan"],
    outcome:
      "Menulis satu paragraf pendek dalam aksara Jawa dengan sandhangan, pasangan, dan tanda baca yang benar, serta membacanya dengan lafal yang tepat.",
    includes: [
      "5 modul bacaan dan latihan tulis",
      "Tabel sandhangan dan pasangan yang dipakai di kelas",
      "6 tugas dinilai pengajar, termasuk ujian akhir",
      "Sertifikat platform",
    ],
  },
  {
    slug: "batik-tulis-soga",
    code: "Jalur 05",
    title: "Batik Tulis",
    subtitle:
      "Materi batik tulis di atas kain sedang disiapkan; belum ada modul yang diterbitkan",
    teacher: "Bambang Hardjono",
    teacherRole:
      "Pengajar batik tulis; materi Paguyuban Batik Tulis Giriloyo sedang disiapkan",
    region: "Giriloyo, Wukirsari, Imogiri, Bantul, D.I. Yogyakarta",
    level: "Pemula",
    weeks: 0,
    tasks: 0,
    price: null,
    priceLabel: "Sedang disusun",
    imageFile: "path-batik-tulis-giriloyo.jpg",
    tags: ["Sedang disusun", "Materi sumber belum tersedia"],
    outcome:
      "Jalur batik tulis di atas kain belum dibuka. Materi sumber dari Paguyuban Batik Tulis Giriloyo masih disiapkan dan belum diterbitkan sebagai modul, jadi belum ada kurikulum yang bisa dijanjikan.",
    includes: [
      "Kurikulum dalam penyusunan",
      "Daftar tunggu dibuka",
      "Materi menyusul",
    ],
    comingSoon: true,
  },
  {
    slug: "tari-kreasi",
    code: "Jalur 06",
    title: "Tari Kreasi",
    subtitle:
      "Gerak murni dan maknawi, ruang-waktu-tenaga, bentuk penyajian, lalu menyusun kreasi pendek dua menit",
    teacher: "Retno Wulandari",
    teacherRole:
      "Pengajar tari dan koreografer; pendamping sanggar komunitas Sleman",
    region: "Kota Yogyakarta dan Sleman, D.I. Yogyakarta",
    level: "Pemula",
    weeks: 5,
    tasks: 5,
    price: 850_000,
    imageFile: "path-tari-kreasi.jpg",
    tags: ["Belajar mandiri", "Rekaman ponsel", "Sertifikat platform"],
    outcome:
      "Satu kreasi tari dua menit untuk solo atau duet, lengkap dengan skor gerak tertulis dan rekaman pertunjukan yang dinilai pengajar.",
    includes: [
      "6 modul bacaan dan latihan",
      "5 tugas praktik dinilai pengajar",
      "Panduan pemanasan, pendinginan, dan keselamatan tubuh",
      "Lembar skor gerak 8 hitungan",
      "Ujian akhir berupa rekaman kreasi dua menit",
      "Sertifikat platform",
    ],
  },
  {
    slug: "kuliner-nusantara",
    code: "Jalur 07",
    title: "Kuliner Nusantara",
    subtitle:
      "Gastronomi, identitas, teknik memasak, geblek dan tumpeng, serta pelestarian makanan tradisional",
    teacher: "Joko Santosa",
    teacherRole:
      "Pengajar kuliner rumahan; pendamping komunitas dan UMKM Kulon Progo",
    region: "Kota Yogyakarta dan Kulon Progo, D.I. Yogyakarta",
    level: "Pemula",
    weeks: 5,
    tasks: 5,
    price: 750_000,
    imageFile: "path-kuliner-nusantara.jpg",
    tags: ["Belajar mandiri", "Praktik dapur rumahan", "Sertifikat platform"],
    outcome:
      "Satu menu terdokumentasi dengan cerita, satu hidangan yang dimasak sendiri (geblek atau tumpeng mini), dan satu catatan langkah pelestarian.",
    includes: [
      "6 modul bacaan dan latihan dapur",
      "5 tugas praktik dinilai pengajar",
      "Panduan bahan, substitusi, dan keselamatan dapur",
      "Lembar biaya dan porsi",
      "Ujian akhir: masak, dokumentasi, dan cerita 300-500 kata",
      "Sertifikat platform",
    ],
  },
]

export const teachersSeed: SeedTeacher[] = [
  {
    slug: "bambang-hardjono",
    key: "bambang",
    pathIds: ["batik-tulis-soga"],
    status: "active" as const,
    verificationStatus: "verified" as const,
    published: true,
    name: "Bambang Hardjono",
    initials: "BH",
    specialty: "Pengajar batik halus",
    region: "Giriloyo, D.I. Yogyakarta",
    experience: "38 tahun membatik",
    quote:
      "Canting yang stabil lebih penting daripada motif yang rumit. Saya minta murid berhenti sebentar sebelum meneteskan lilin.",
    focus: "Batik tulis dan pewarnaan soga",
    path: "Batik Tulis",
    community: "Perajin batik tulis Giriloyo",
    imageFile: "teacher-hardjono.jpg",
    verified: true,
  },
  {
    slug: "sri-sriningsih",
    key: "sri",
    pathIds: ["batik-bambu"],
    status: "active" as const,
    verificationStatus: "verified" as const,
    published: true,
    name: "Sri Sriningsih",
    initials: "SS",
    specialty: "Perajin batik bambu dan pewarna alami",
    region: "Krebet, Sendangsari, Pajangan, Bantul, D.I. Yogyakarta",
    experience: "Lebih dari tiga puluh tahun di pewarnaan alami, belasan tahun membatik bambu",
    quote:
      "Bambu tidak menyerap malam seperti kain. Garis harus ditutup rapat, lalu diperiksa di bawah cahaya miring.",
    focus: "Batik bambu: pemilihan bambu, canting, dan pewarnaan",
    path: "Batik Bambu",
    community: "Perajin batik bambu, Bantul",
    imageFile: "teacher-sriningsih.jpg",
    verified: true,
  },
  {
    slug: "widagdo-saputra",
    key: "widagdo",
    pathIds: ["pranatacara-jawa"],
    status: "active" as const,
    verificationStatus: "verified" as const,
    published: true,
    name: "Widagdo Saputra",
    initials: "WS",
    specialty: "Instruktur tata upacara",
    region: "Kota Yogyakarta, D.I. Yogyakarta",
    experience: "30 tahun tata upacara",
    quote:
      "Pembawa acara yang baik mengatur napas acara. Kalimatnya jelas, urutannya tidak membuat tamu menunggu.",
    focus: "Pembawa acara adat dan protokol",
    path: "Seni Pembawa Acara Tradisi Jawa",
    community: "Pembawa acara tradisi Jawa, Yogyakarta",
    imageFile: "teacher-sudarsono.jpg",
    verified: true,
  },
  {
    slug: "sutrisno-wibowo",
    key: "sutrisno",
    pathIds: ["kriya-gerabah-bantul"],
    status: "review" as const,
    verificationStatus: "under_review" as const,
    published: false,
    name: "Sutrisno Wibowo",
    initials: "SW",
    specialty: "Pengrajin gerabah Kasongan",
    region: "Kasongan, Kasihan, Bantul, D.I. Yogyakarta",
    experience: "26 tahun membentuk dan membakar gerabah",
    quote:
      "Tanah yang terlalu basah akan melengkung saat kering. Latihan pertama biasanya tentang menunggu, bukan mengejar bentuk.",
    focus: "Gerabah bentuk, roda putar, dan pembakaran",
    path: "Kriya Gerabah Bantul",
    community: "Pengrajin gerabah Kasongan",
    imageFile: "teacher-gerabah.jpg",
    verified: false,
  },
  {
    slug: "suwardi-pratama",
    key: "suwardi",
    pathIds: ["aksara-jawa"],
    status: "active" as const,
    verificationStatus: "verified" as const,
    published: true,
    name: "Suwardi Pratama",
    initials: "SP",
    specialty: "Pengajar aksara Jawa dan guru bahasa Jawa",
    region: "Kota Yogyakarta, D.I. Yogyakarta",
    experience: "19 tahun mengajar bahasa Jawa di SMA Kota Yogyakarta",
    quote:
      "Saya menandai aksara yang salah satu per satu, bukan hanya memberi nilai di akhir. Kesalahan yang terlihat bisa diperbaiki besok.",
    focus: "Aksara Jawa, tembang, dan tata tulis",
    path: "Aksara Jawa: Membaca dan Menulis",
    community: "Pengajar aksara Jawa, Yogyakarta",
    imageFile: "teacher-suwardi.jpg",
    verified: true,
  },
  {
    slug: "retno-wulandari",
    key: "retno",
    pathIds: ["tari-kreasi"],
    status: "active" as const,
    verificationStatus: "verified" as const,
    published: true,
    name: "Retno Wulandari",
    initials: "RW",
    specialty: "Pengajar tari dan koreografer",
    region: "Sleman, D.I. Yogyakarta",
    experience: "24 tahun menari dan mengajar tari di sanggar komunitas",
    quote:
      "Gerak yang kecil tetap harus jelas arah dan napasnya. Saya minta murid berhenti di hitungan kedelapan, bukan buru-buru menambah gerakan.",
    focus: "Tari kreasi: gerak, ruang, waktu, dan komposisi",
    path: "Tari Kreasi",
    community: "Sanggar tari komunitas, Sleman",
    imageFile: "teacher-tari-kreasi.jpg",
    verified: true,
  },
  {
    slug: "joko-santosa",
    key: "joko",
    pathIds: ["kuliner-nusantara"],
    status: "active" as const,
    verificationStatus: "verified" as const,
    published: true,
    name: "Joko Santosa",
    initials: "JS",
    specialty: "Pengajar kuliner rumahan dan pendamping UMKM",
    region: "Kulon Progo, D.I. Yogyakarta",
    experience: "22 tahun memasak dan mengajar kuliner rumahan",
    quote:
      "Resep tanpa catatan takaran cuma jadi cerita. Saya minta murid menimbang bahan, mencatat api, dan menuliskan siapa yang mengajarkan resep itu.",
    focus: "Kuliner Nusantara: bahan lokal, teknik, dan cerita hidangan",
    path: "Kuliner Nusantara",
    community: "Komunitas kuliner dan UMKM Kulon Progo",
    imageFile: "teacher-kuliner-nusantara.jpg",
    verified: true,
  },
]

export const worksSeed: SeedWork[] = [
  {
    slug: "nampan-batik-bambu",
    makerKey: "anisa",
    pathSlug: "batik-bambu",
    certificateKey: "anisa",
    permission:
      "Izin publikasi karya tercatat dari pembuat untuk pengelola platform",
    title: "Nampan Batik Bambu",
    category: "batik",
    kind: "product",
    maker: "Anisa Rahmawati",
    makerRole: "Lulusan jalur Batik Bambu",
    teacher: "Sri Sriningsih",
    region: "Bantul",
    price: 385_000,
    unit: "Nampan bambu, diameter 30 cm",
    technique: "Tulis",
    techniqueNote: "Canting pada bilah bambu",
    workCard: "KN-8821",
    description:
      "Nampan bambu dengan motif geometris yang disusun ulang dari pola klasik Giriloyo. Malam dipakai sebagai perintang warna; motif ditutup malam sebelum warna dasar, lalu nglorod dan pelapisan akhir. Harga mencakup bilah bambu pilihan, malam, pewarna, pelapis, dan kerja canting. Tampilan Kartu Karya memakai ilustrasi tipografi, bukan foto produk.",
    imageFile: "work-bambu-nampan.jpg",
  },
  {
    slug: "box-tisu-batik-bambu",
    makerKey: "dimas",
    pathSlug: "batik-bambu",
    certificateKey: "dimas",
    permission:
      "Izin publikasi karya tercatat dari pembuat untuk pengelola platform",
    title: "Box Tisu Batik Bambu",
    category: "batik",
    kind: "product",
    maker: "Dimas Yoga Pratama",
    makerRole: "Lulusan jalur Batik Bambu",
    teacher: "Sri Sriningsih",
    region: "Bantul",
    price: 275_000,
    unit: "Kotak tisu bambu, 22 x 12 x 8 cm",
    technique: "Tulis dan colet",
    techniqueNote: "Titik canting pada anyaman bambu",
    workCard: "KN-9014",
    description:
      "Kotak tisu dari anyaman bambu dengan titik canting rapat dan dua warna. Motif ditutup malam sebelum warna dasar, lalu nglorod dan pelapisan akhir. Harga mencakup anyaman bambu, malam, pewarna, pelapis, dan kerja canting. Kartu bahan dan panduan perawatan tanpa rendam disertakan; tampilan Kartu Karya memakai ilustrasi tipografi.",
    imageFile: "work-bambu-box-tisu.jpg",
  },
  {
    slug: "hiasan-dinding-batik-bambu",
    makerKey: "purnomo",
    pathSlug: "batik-bambu",
    certificateKey: "purnomo",
    permission:
      "Izin publikasi karya tercatat dari pembuat untuk pengelola platform",
    title: "Hiasan Dinding Batik Bambu",
    category: "batik",
    kind: "product",
    maker: "Bambang Purnomo",
    makerRole: "Lulusan jalur Batik Bambu",
    teacher: "Sri Sriningsih",
    region: "Bantul",
    price: 650_000,
    unit: "Panel bambu, 60 x 40 cm",
    technique: "Tulis",
    techniqueNote: "Canting dan colet dua warna",
    workCard: "KN-9147",
    description:
      "Panel bambu untuk dinding dengan motif lereng klasik yang disusun ulang, bukan motif sakral. Motif ditutup malam sebelum warna dasar, lalu nglorod dan pelapisan akhir. Harga mencakup bilah bambu pilihan, malam, pewarna, pelapis, dan kerja canting. Tampilan Kartu Karya memakai ilustrasi tipografi, bukan foto produk.",
    imageFile: "work-bambu-hiasan.jpg",
  },
  {
    slug: "pranatacara-siraman",
    makerKey: "rani",
    pathSlug: "pranatacara-jawa",
    certificateKey: "rani",
    permission:
      "Izin publikasi tercatat untuk pengelola platform; dokumen sumber diarsipkan pengelola platform",
    title: "Pembawa Acara Siraman dan Midodareni",
    category: "layanan",
    kind: "service",
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
  },
  {
    slug: "jasa-tulis-aksara",
    makerKey: "galuh",
    pathSlug: "aksara-jawa",
    certificateKey: "galuh",
    permission:
      "Izin publikasi tercatat untuk pengelola platform; dokumen sumber diarsipkan pengelola platform",
    title: "Jasa Tulis Aksara untuk Undangan dan Papan Nama",
    category: "layanan",
    kind: "service",
    maker: "Galuh Puspita",
    makerRole: "Lulusan jalur Aksara Jawa",
    teacher: "Suwardi Pratama",
    region: "Kota Yogyakarta dan sekitarnya",
    price: 275_000,
    priceLabel: "Mulai dari",
    unit: "Tulis tangan per undangan",
    technique: "Layanan",
    techniqueNote: "Tulis tangan aksara Jawa",
    workCard: "KN-AKS-021",
    description:
      "Penerimaan pesanan tulisan tangan aksara Jawa untuk undangan, papan nama, dan label. Setiap naskah dikirim sebagai foto resolusi tinggi dengan ejaan Latin dan catatan pasangan.",
    imageFile: "work-aksara.jpg",
  },
  {
    slug: "tari-kreasi-acara-keluarga",
    makerKey: "sekar",
    pathSlug: "tari-kreasi",
    certificateKey: "sekar",
    permission:
      "Izin publikasi tercatat untuk pengelola platform; dokumen sumber diarsipkan pengelola platform",
    title: "Tari Kreasi untuk Acara Keluarga",
    category: "layanan",
    kind: "service",
    maker: "Sekar Ayuningtyas",
    makerRole: "Lulusan jalur Tari Kreasi",
    teacher: "Retno Wulandari",
    region: "Sleman dan sekitarnya",
    price: 1_500_000,
    priceLabel: "Mulai dari",
    unit: "1 penari, 1 acara",
    technique: "Layanan",
    techniqueNote: "Tari kreasi solo atau duet",
    workCard: "KN-TRI-031",
    description:
      "Penampilan tari kreasi dua menit untuk acara keluarga, dengan pilihan solo atau duet. Gerak disusun dari motif yang dipelajari di jalur, lalu disesuaikan dengan durasi dan ruang acara. Harga mencakup latihan bersama penyelenggara, iringan musik siap pakai, dan satu kali tampil. Rekaman pertunjukan dan skor gerak diserahkan setelah acara.",
    imageFile: "work-tari-kreasi.jpg",
  },
  {
    slug: "geblek-renteng-beku",
    makerKey: "bimo",
    pathSlug: "kuliner-nusantara",
    certificateKey: "bimo",
    permission:
      "Izin publikasi karya tercatat dari pembuat untuk pengelola platform",
    title: "Geblek Renteng Beku",
    category: "kuliner",
    kind: "product",
    maker: "Bimo Prakoso",
    makerRole: "Lulusan jalur Kuliner Nusantara",
    teacher: "Joko Santosa",
    region: "Kulon Progo",
    price: 45_000,
    unit: "1 paket isi 10 keping",
    technique: "Goreng",
    techniqueNote: "Geblek tapioka bentuk angka delapan",
    workCard: "KN-KUL-042",
    description:
      "Geblek Kulon Progo bentuk angka delapan, digoreng lalu dibekukan dalam paket isi sepuluh keping. Bahan utamanya tapioka dan bawang putih; teksturnya kenyal dengan bagian luar yang renyah setelah digoreng ulang. Paket disertai kartu bahan, tanggal produksi, dan cara menggoreng ulang dari beku. Bentuk terhubung dimaknai sebagai persatuan dalam narasi budaya yang dikutip laporan, bukan makna baku.",
    imageFile: "work-kuliner-nusantara.jpg",
  },
]

export const testimonialsSeed: Testimonial[] = [
  {
    quote:
      "Saya kira belajar dari video sudah cukup. Setelah pengajar menandai bagian canting yang tekanannya terlalu kuat, nampan bambu saya jadi lebih rata. Tiga bulan kemudian saya berani membuka pesanan kecil.",
    name: "Sari Wulandari",
    role: "Karyawan kreatif, pelajar batik bambu",
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
    city: "Yogyakarta",
    initials: "BP",
  },
]

export const faqsSeed: Faq[] = [
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
      "Bidang budaya sudah dipetakan, dari batik bambu Bantul, aksara Jawa, dan pranatacara sampai gerabah Kasongan, batik tulis Giriloyo, karawitan, tari, keramik, kuliner tradisi, jamu, dan wayang. Jalur dibuka bertahap setelah kurikulum dan sumbernya siap.",
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
      "Setiap jalur dan karya menampilkan Kartu Sumber Budaya: sumber materi, rujukan, tanggal pencatatan, dan tingkat akses. Rincian bagi hasil ditampilkan sebelum transaksi, saat kamu masih bisa memutuskan.",
  },
  {
    question: "Saya hanya ingin membeli karya. Apakah harus ikut kelas?",
    answer:
      "Tidak. Kamu bisa langsung menjelajahi etalase karya lulusan dan pengajar. Setiap karya punya Kartu Karya yang menjelaskan pembuat, teknik, dan jejak prosesnya.",
  },
]
