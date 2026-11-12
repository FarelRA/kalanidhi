import { SPLIT_PERCENTAGES } from "../lib/commerce/money"
import {
  ABOUT_LOOP_HREF,
  PUBLIC_ROUTES,
} from "../lib/content/routes"
import type {
  CatalogField,
  Faq,
  LearningPath,
  SiteCopy,
  Teacher,
  Testimonial,
  Work,
} from "../lib/content/types"

/**
 * Seed data never stores static image paths. Each image carries a bare
 * filename that the seed mutation resolves against the `mediaAssets` registry
 * (files live in `seed/images` only as the upload source for Convex storage).
 */
type WithImageFile<T> = Omit<T, "image"> & { imageFile: string }

/** `modules` is derived from `pathModules`, never stored as seed copy. */
export type SeedLearningPath = WithImageFile<Omit<LearningPath, "modules">>
export type SeedTeacher = WithImageFile<Teacher>
export type SeedWork = WithImageFile<Work>

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
    areaServed: "Yogyakarta dan Jawa Tengah",
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
      "batik tulis",
      "pranatacara",
      "tenun",
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
      imageFile: "hero-canting.jpg",
      width: 1408,
      height: 768,
      alt: "Proses membatik dengan canting",
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
    region: "Yogyakarta dan Jawa Tengah",
    homeLabel: "Beranda",
  },
  hero: {
    title: ["Duduk di bangku ini.", "Nanti kamu yang mengajari."],
    description:
      "KalaNidhi Digital mempertemukan pelajar dengan pengajar batik, tenun, ukir, karawitan, tari, pranatacara, dan praktik hidup lain di Nusantara. Kerjakan tugas dengan tangan, kirim hasilnya, terima koreksi pengajar, lalu bawa karya atau jasamu ke pembeli. Lulusan yang siap kembali mengajar dan membuka jalur untuk pelajar berikutnya.",
    primaryCta: "Pilih jalur yang terbuka",
    secondaryCta: "Lihat lingkarannya",
    plate: {
      imageFile: "hero-canting.jpg",
      alt: "Tangan membatik dengan canting di atas kain",
      caption: "Proses canting, Giriloyo",
      note: "Lopati, 2026",
    },
    workCard: {
      title: "Kartu Karya",
    },
  },
  traction: {
    label: "Capaian 2026",
    note: "Angka dihitung dari catatan publik Convex: bidang, pengajar terbit, peserta aktif, tugas yang sudah dinilai, dan karya terbit.",
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
    diagram: {
      title: "Bangku kerja melingkar dengan lima tahap",
      description:
        "Lima tahap tersusun mengelilingi bangku. Jalur kembali membawa karya yang selesai ke bangku pertama, tempat lulusan mulai mengajar.",
    },
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
    label: "Rak bahan",
    title: "Rak ini tumbuh satu per satu, bersama pengajarnya.",
    description:
      "Katalog tumbuh dari pengajar yang masuk. Rak di bawah menunjukkan mana yang sudah bisa dikerjakan sekarang, mana yang sedang disiapkan, dan mana yang masih menunggu pengajar.",
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
        "Catatan dari peserta dan mitra, dikutip dengan izin. Isinya pengalaman yang bisa diperiksa.",
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
        "Terbuka untuk praktisi dari daerah lain secara bertahap.",
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
      permissionLabel: "Izin",
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
          { label: "Rak bahan", href: `${PUBLIC_ROUTES.home}#indeks` },
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
      "Pengetahuan pada halaman ini ditampilkan dengan sumber komunitas. Setiap karya mencantumkan pembuat, pengajar pendamping, dan sumber pengetahuan.",
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
    { label: "Rak bahan", href: `${PUBLIC_ROUTES.home}#indeks` },
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
        "Komunitas, pengajar, dan sumber pengetahuan tampil di setiap jalur dan karya.",
        "Izin berbagi dicatat, diberi tanggal, dan ditampilkan bersama tingkat aksesnya.",
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
        "Layanan berjalan di Yogyakarta dan Jawa Tengah, terbuka untuk praktisi dari daerah lain secara bertahap.",
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
]

export const pathsSeed: SeedLearningPath[] = [
  {
    slug: "batik-tulis-soga",
    code: "Jalur 01",
    title: "Batik Tulis Soga",
    subtitle: "Dari canting pertama sampai kain siap karya",
    teacher: "Bambang Hardjono",
    teacherRole: "Pengajar batik Giriloyo",
    region: "Giriloyo, Yogyakarta",
    level: "Pemula sampai menengah",
    weeks: 6,
    tasks: 3,
    price: 1_450_000,
    imageFile: "path-batik.jpg",
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
    weeks: 4,
    tasks: 3,
    price: 980_000,
    imageFile: "path-pranatacara.jpg",
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
    weeks: 0,
    tasks: 0,
    price: null,
    priceLabel: "Sedang disusun",
    imageFile: "path-ukir.jpg",
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

export const teachersSeed: SeedTeacher[] = [
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
    imageFile: "teacher-hardjono.jpg",
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
    imageFile: "teacher-sriningsih.jpg",
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
    imageFile: "teacher-sudarsono.jpg",
    verified: true,
  },
  {
    slug: "joko-santoso",
    name: "Joko Santoso",
    initials: "JS",
    specialty: "Pengrajin ukir kayu",
    region: "Jepara, Jawa Tengah",
    experience: "27 tahun mengukir",
    quote:
      "Ukiran yang baik lahir dari arah pahat yang sabar. Saya ajarkan urutan, bukan hanya bentuk akhir.",
    focus: "Ukir relief dan ornamen sulur",
    path: "Kriya Ukir Kayu Jepara",
    community: "Sanggar Ukir Jepara",
    imageFile: "teacher-joko.jpg",
    verified: false,
  },
]

export const worksSeed: SeedWork[] = [
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
    imageFile: "work-soga.jpg",
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
    imageFile: "work-nitik.jpg",
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
    imageFile: "work-sutra.jpg",
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
    imageFile: "work-pranatacara.jpg",
  },
]

export const testimonialsSeed: Testimonial[] = [
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
      "Bidang budaya sudah dipetakan, dari batik tulis dan pranatacara sampai tenun, karawitan, tari, keramik, kuliner tradisi, jamu, dan wayang. Jalur dibuka bertahap setelah kurikulum dan izin komunitas selesai.",
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
