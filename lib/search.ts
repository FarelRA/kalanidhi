import { catalog, paths, teachers, works } from "@/lib/content/landing"

export type SearchIcon = "path" | "teacher" | "work" | "page"

export type SearchItem = {
  label: string
  description: string
  href: string
}

export type SearchGroup = {
  heading: string
  icon: SearchIcon
  items: SearchItem[]
}

export function buildSearchGroups(): SearchGroup[] {
  return [
    {
      heading: "Jalur belajar",
      icon: "path",
      items: paths.map((path) => ({
        label: path.title,
        description: path.comingSoon
          ? "Sedang disusun, daftar tunggu dibuka"
          : `${path.teacher}, ${path.level}`,
        href: "#jalur",
      })),
    },
    {
      heading: "Pengajar",
      icon: "teacher",
      items: teachers.map((teacher) => ({
        label: teacher.name,
        description: `${teacher.specialty}, ${teacher.region}`,
        href: "#pengajar",
      })),
    },
    {
      heading: "Karya dan jasa",
      icon: "work",
      items: works.map((work) => ({
        label: work.title,
        description: `${work.maker}, ${work.region}`,
        href: "#karya",
      })),
    },
    {
      heading: "Bidang budaya",
      icon: "page",
      items: catalog.fields.map((field) => ({
        label: field.name,
        description: `${field.region}, ${field.status.toLowerCase()}`,
        href: "#indeks",
      })),
    },
    {
      heading: "Halaman",
      icon: "page",
      items: [
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
          description: "Catatan musim dari pengajar Giriloyo",
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
  ]
}
