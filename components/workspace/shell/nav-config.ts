import type { LucideIcon } from "lucide-react"
import {
  Award,
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FileText,
  GitBranch,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Palette,
  ScrollText,
  Settings,
  ShoppingBag,
  Target,
  Users,
  Video,
  Wallet,
} from "lucide-react"

import type { Capability } from "@/lib/workspace/types"

export type NavItem = {
  href: string
  label: string
  teacherLabel?: string
  adminLabel?: string
  shortLabel: string
  group: "Hari ini" | "Belajar & mengajar" | "Berkarya & menjual" | "Komunikasi" | "Kelola" | "Pengaturan"
  icon: LucideIcon
  anyOf: Capability[]
  primary?: boolean
}

export const navItems: NavItem[] = [
  {
    href: "/ruang",
    label: "Ringkasan",
    shortLabel: "Ringkasan",
    group: "Hari ini",
    icon: LayoutDashboard,
    anyOf: [],
    primary: true,
  },
  {
    href: "/ruang/belajar",
    label: "Belajar",
    teacherLabel: "Kohort & jalur",
    adminLabel: "Jalur & kohort",
    shortLabel: "Belajar",
    group: "Belajar & mengajar",
    icon: BookOpen,
    anyOf: ["learn", "teach", "operate"],
    primary: true,
  },
  {
    href: "/ruang/tugas",
    label: "Tugas",
    teacherLabel: "Penilaian",
    adminLabel: "Tugas & eskalasi",
    shortLabel: "Tugas",
    group: "Belajar & mengajar",
    icon: ClipboardCheck,
    anyOf: ["submissions.submit", "submissions.grade", "submissions.escalate"],
    primary: true,
  },
  {
    href: "/ruang/kredensial",
    label: "Kredensial",
    teacherLabel: "Sertifikat kohort",
    adminLabel: "Registry sertifikat",
    shortLabel: "Kredensial",
    group: "Belajar & mengajar",
    icon: Award,
    anyOf: ["certificates.read.own", "certificates.read.cohort", "certificates.manage"],
  },
  {
    href: "/ruang/jadwal",
    label: "Jadwal",
    shortLabel: "Jadwal",
    group: "Belajar & mengajar",
    icon: CalendarDays,
    anyOf: ["schedule.read.own", "schedule.manage", "schedule.read.all"],
  },
  {
    href: "/ruang/karya",
    label: "Karya saya",
    teacherLabel: "Karya peserta",
    adminLabel: "Moderasi karya",
    shortLabel: "Karya",
    group: "Berkarya & menjual",
    icon: Palette,
    anyOf: ["works.own", "works.review", "works.moderate", "operate"],
  },
  {
    href: "/ruang/pesanan",
    label: "Pembelian",
    teacherLabel: "Pesanan & pendapatan",
    adminLabel: "Pesanan",
    shortLabel: "Pesanan",
    group: "Berkarya & menjual",
    icon: ShoppingBag,
    anyOf: ["orders.buy", "orders.sell", "orders.read.all"],
    primary: true,
  },
  {
    href: "/ruang/pesanan/pembayaran",
    label: "Pembayaran",
    shortLabel: "Pembayaran",
    group: "Berkarya & menjual",
    icon: CreditCard,
    anyOf: ["payments.manage"],
  },
  {
    href: "/ruang/pesanan/payout",
    label: "Pendapatan",
    adminLabel: "Payout",
    shortLabel: "Pendapatan",
    group: "Berkarya & menjual",
    icon: Wallet,
    anyOf: ["payouts.view.own", "payouts.release"],
  },
  {
    href: "/ruang/pesan",
    label: "Pesan",
    shortLabel: "Pesan",
    group: "Komunikasi",
    icon: MessageSquare,
    anyOf: ["messages.read.own", "messages.moderate"],
    primary: true,
  },
  {
    href: "/ruang/panggilan",
    label: "Panggilan",
    shortLabel: "Panggilan",
    group: "Komunikasi",
    icon: Video,
    anyOf: ["calls.start", "calls.monitor"],
  },
  {
    href: "/ruang/prospek",
    label: "Prospek",
    shortLabel: "Prospek",
    group: "Kelola",
    icon: Target,
    anyOf: ["leads.read", "leads.write"],
  },
  {
    href: "/ruang/orang",
    label: "Orang",
    shortLabel: "Orang",
    group: "Kelola",
    icon: Users,
    anyOf: ["people.read"],
  },
  {
    href: "/ruang/konten",
    label: "Konten",
    shortLabel: "Konten",
    group: "Kelola",
    icon: FileText,
    anyOf: ["content.publish"],
  },
  {
    href: "/ruang/statistik",
    label: "Statistik",
    teacherLabel: "Statistik mengajar",
    shortLabel: "Statistik",
    group: "Kelola",
    icon: BarChart3,
    anyOf: ["stats.read", "stats.teach"],
  },
  {
    href: "/ruang/alur",
    label: "Alur",
    shortLabel: "Alur",
    group: "Kelola",
    icon: GitBranch,
    anyOf: ["flows.manage"],
  },
  {
    href: "/ruang/log",
    label: "Log",
    shortLabel: "Log",
    group: "Kelola",
    icon: ScrollText,
    anyOf: ["logs.read"],
  },
  {
    href: "/ruang/dukungan",
    label: "Dukungan",
    shortLabel: "Dukungan",
    group: "Kelola",
    icon: LifeBuoy,
    anyOf: ["support.request", "support.manage"],
  },
  {
    href: "/ruang/pengaturan",
    label: "Pengaturan",
    shortLabel: "Pengaturan",
    group: "Pengaturan",
    icon: Settings,
    anyOf: [],
  },
]

export const navGroups: NavItem["group"][] = [
  "Hari ini",
  "Belajar & mengajar",
  "Berkarya & menjual",
  "Komunikasi",
  "Kelola",
  "Pengaturan",
]

export function labelForItem(
  item: NavItem,
  capabilities: Capability[],
): string {
  if (item.adminLabel && capabilities.includes("operate")) return item.adminLabel
  if (item.teacherLabel && capabilities.includes("teach")) return item.teacherLabel
  return item.label
}

export function visibleNav(capabilities: Capability[]): NavItem[] {
  return navItems.filter(
    (item) =>
      item.anyOf.length === 0 ||
      item.anyOf.some((capability) => capabilities.includes(capability)),
  )
}

export function activeNav(pathname: string): NavItem | undefined {
  return [...navItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
}

export const mobilePrimaryHrefs = [
  "/ruang",
  "/ruang/belajar",
  "/ruang/tugas",
  "/ruang/pesan",
  "/ruang/pesanan",
]
