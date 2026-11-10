export const navigation = [
  { label: "Jalur", href: "#jalur" },
  { label: "Karya", href: "#karya" },
  { label: "Pengajar", href: "#pengajar" },
  { label: "Mangsa", href: "#mangsa" },
  { label: "Etika", href: "#etika" },
] as const

export const sectionIds = navigation.map((item) => item.href.slice(1))
