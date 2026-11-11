export const navigation = [
  { label: "Lingkaran", href: "#lingkaran" },
  { label: "Rak bahan", href: "#indeks" },
  { label: "Jalur", href: "#jalur" },
  { label: "Pengajar", href: "#pengajar" },
  { label: "Karya", href: "#karya" },
  { label: "Etika", href: "#etika" },
] as const

export const sectionIds = navigation.map((item) => item.href.slice(1))
