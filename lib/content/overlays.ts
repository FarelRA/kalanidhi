export type LeadVariant = "student" | "institution" | "consultation" | "notify"

export type LeadRequest = {
  variant: LeadVariant
  interest?: string
}

export type InfoKey =
  | "policy"
  | "login"
  | "mangsa"
  | "verify"
  | "about"
  | "privacy"
  | "terms"

export type InfoContent = {
  icon: "policy" | "login" | "calendar" | "verify" | "about" | "privacy" | "terms"
  title: string
  description: string
  bullets?: string[]
  footnote?: string
  action?: {
    label: string
    lead: LeadRequest
  }
}

export const infoContent: Record<InfoKey, InfoContent> = {
  policy: {
    icon: "policy",
    title: "Etika & hak budaya",
    description:
      "Prinsip yang kami pakai sebelum sebuah pengetahuan atau karya ditampilkan.",
    bullets: [
      "Komunitas, pengajar, dan sumber pengetahuan tampil di setiap jalur dan karya, dari batik sampai keramik.",
      "Izin berbagi dicatat, diberi tanggal, dan ditampilkan bersama tingkat aksesnya.",
      "Rincian bagi hasil dapat dilihat sebelum transaksi, saat kamu masih bisa memutuskan.",
      "Pengetahuan terbatas dihormati. Tidak semua materi dibuka untuk publik.",
      "Motif sakral atau larangan tidak dipakai sebagai dekorasi antarmuka.",
    ],
    footnote:
      "Kebijakan lengkap tersedia untuk pengajar, sanggar, dan mitra institusi. Katalog bidang dibuka bertahap bersama pemilik pengetahuannya. Untuk pertanyaan lain, hubungi tim kurator.",
    action: {
      label: "Tanyakan kebijakan",
      lead: { variant: "consultation", interest: "Etika & hak budaya" },
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
      "Gunakan email yang sama saat mendaftar. Akun pengajar dan mitra dibuat oleh tim KalaNidhi Digital.",
    action: {
      label: "Daftar minat",
      lead: { variant: "student" },
    },
  },
  mangsa: {
    icon: "calendar",
    title: "Kalender Pranata Mangsa",
    description:
      "Kalender 12 mangsa dengan catatan kurator dan rujukan yang bisa dilacak.",
    bullets: [
      "Roda 12 mangsa, linimasa, dan tampilan daftar.",
      "Setiap entri menampilkan sumber serta catatan kurator.",
      "Pengingat musim dan tautan ke entri Pustaka terkait.",
    ],
    footnote:
      "Entri disusun dari arsip sanggar dan wawancara pengajar. Untuk keputusan tanam atau produksi, tetap cek prakiraan cuaca resmi.",
    action: {
      label: "Beri tahu saya",
      lead: { variant: "notify", interest: "Pustaka & kalender mangsa" },
    },
  },
  verify: {
    icon: "verify",
    title: "Verifikasi sertifikat & Kartu Karya",
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
      "KalaNidhi Digital adalah ruang belajar berbagai praktik budaya Nusantara yang dibangun bersama pengajar, praktisi, dan sanggar.",
    bullets: [
      "Jalur belajar disusun bersama pengajar, kurator, dan praktisi sanggar.",
      "Setiap karya membawa Kartu Karya yang mencatat pembuat, teknik, dan proses.",
      "Sertifikat KalaNidhi Digital adalah sertifikat platform dengan kode verifikasi publik.",
      "Bagi hasil ditampilkan sebelum transaksi dan disalurkan ke pengajar serta komunitas.",
      "Lulusan yang siap bisa kembali sebagai pengajar, penilai, atau pemasok, sehingga jalur dan pasokan baru lahir dari dalam.",
    ],
    footnote:
      "Sekretariat kami berada di Yogyakarta dan Surakarta. Basis awal kami di Jawa, dan platform terbuka untuk praktisi dari berbagai daerah di Nusantara dengan rilis bertahap.",
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
      "Untuk permintaan terkait data pribadi, hubungi privasi@kalanidhi.digital.",
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
}
