import { paths, teachers, works, faqs } from "@/lib/content/landing"

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
          ? "Segera hadir, daftar tunggu"
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
      heading: "Karya & jasa",
      icon: "work",
      items: works.map((work) => ({
        label: work.title,
        description: `${work.maker}, ${work.region}`,
        href: "#karya",
      })),
    },
    {
      heading: "Halaman",
      icon: "page",
      items: [
        {
          label: "Cara kerja",
          description: "Lima tahap, dari belajar sampai kembali mengajar",
          href: "#cara-kerja",
        },
        {
          label: "Etika & bagi hasil",
          description: "Sumber, izin, dan distribusi pendapatan",
          href: "#etika",
        },
        {
          label: "Kalender mangsa",
          description: "Pranata mangsa dan pengetahuan musim",
          href: "#mangsa",
        },
        {
          label: "Untuk institusi",
          description: "Sekolah, EO, desa wisata, dan korporat",
          href: "#institusi",
        },
        {
          label: "Pertanyaan umum",
          description: `Jawaban untuk ${faqs.length} pertanyaan populer`,
          href: "#faq",
        },
      ],
    },
  ]
}
