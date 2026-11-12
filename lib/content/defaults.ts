/**
 * Fallbacks for copy fields added after a site was first published. Convex
 * keeps the last published document, so a live site must keep rendering while
 * the admin has not republished the new fields yet.
 */
export const CONTENT_FALLBACKS = {
  loop: {
    returnCaveat:
      "Jalur kembali tidak menjanjikan semua lulusan mengajar. Pintu ini disiapkan untuk pengajar pendamping, penilai tugas, atau pemasok bahan. Setiap pintu yang terisi membuka jalur baru.",
  },
  ethicsCard: {
    emptyState:
      "Belum ada catatan sumber budaya yang terbit di Convex. Izin dan atribusi akan tampil di sini setelah dicatat.",
  },
  sections: {
    paths: {
      teacherLabel: "Pengajar",
      regionLabel: "Daerah",
      levelLabel: "Level",
      emptyState:
        "Belum ada jalur terbit di Convex. Jalur akan muncul di sini setelah kurikulum, pengajar, dan angkatan pertama tersedia.",
    },
    teachers: {
      emptyState:
        "Belum ada pengajar terbit di Convex. Profil akan muncul di sini setelah pengajar menyelesaikan verifikasi dan publikasi.",
    },
    works: {
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
      emptyState: "Belum ada catatan peserta yang terbit di Convex.",
    },
    faq: {
      askInterest: "Pertanyaan umum",
      emptyState: "Belum ada pertanyaan umum yang terbit di Convex.",
    },
  },
  header: {
    homeLabel: "Beranda",
  },
} as const
