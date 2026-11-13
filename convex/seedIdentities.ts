import type { Doc } from "./_generated/dataModel"
import type { MutationCtx } from "./_generated/server"

/**
 * Seed identities and timeline.
 *
 * The demo workspace should read like a real Yogyakarta studio, not a fixture:
 * every account uses a plausible Gmail address, an Indonesian mobile number,
 * and a regency inside D.I. Yogyakarta. Timestamps are compressed into the
 * 2026 operating window so activities never predate the platform and never
 * pile up on a single day.
 */
export const DAY = 86_400_000
/** Owner tag for media rows the seed itself creates, so reseeds can clear them. */
export const SEED_ASSET_OWNER = "KalaNidhi"
export const HOUR = 3_600_000
export const SEED_NOW = Date.now()

/** The platform opened on 2 January 2026. */
export const SEED_START = Date.UTC(2026, 0, 2, 8, 0, 0)

const SEED_SPAN_DAYS = Math.max(1, (SEED_NOW - SEED_START) / DAY)

/**
 * Legacy seed fixtures used relative offsets up to 400 days. Rescaling keeps
 * the original ordering (a certificate still lands after its assessment) while
 * pinning the oldest event to the opening week of 2026.
 */
const LEGACY_SPAN_DAYS = 400

/** A timestamp between 2 January 2026 and now, preserving relative order. */
export function seedAgo(days: number): number {
  if (days <= 0) return SEED_NOW - Math.round(days * DAY)
  const scaled = (days / LEGACY_SPAN_DAYS) * SEED_SPAN_DAYS
  return Math.max(SEED_START, Math.round(SEED_NOW - scaled * DAY))
}

/** A future timestamp for scheduled sessions, deadlines, and payouts. */
export function seedAhead(days: number): number {
  return SEED_NOW + Math.round(days * DAY)
}

export type SeedRole = "student" | "teacher" | "admin"

export type SeedUser = {
  key: string
  name: string
  email: string
  phone: string
  province: string
  region: string
  initials: string
  roles: SeedRole[]
  /** Account age, used to keep every activity inside the account lifetime. */
  joinedDaysAgo: number
  lastActiveDaysAgo: number
}

export const SEED_ADMIN_PROFILE = {
  name: "Farel Reski Aditiya",
  /**
   * The operator account is created by Better Auth, so the live database keeps
   * the real sign-in mailbox. This profile is only the fallback for a fresh
   * self-hosted install where no admin exists yet.
   */
  email: "farel@farel.is-a.dev",
  phone: "6285157813352",
  province: "DI Yogyakarta",
  region: "Kota Yogyakarta, DI Yogyakarta",
  initials: "FR",
  joinedDaysAgo: 400,
} as const

export const SEED_USERS: SeedUser[] = [
  {
    key: "bambang",
    name: "Bambang Hardjono",
    email: "bambang.hardjono78@gmail.com",
    phone: "6281273415086",
    province: "DI Yogyakarta",
    region: "Giriloyo, Wukirsari, Bantul, DI Yogyakarta",
    initials: "BH",
    roles: ["teacher"],
    joinedDaysAgo: 399,
    lastActiveDaysAgo: 1,
  },
  {
    key: "sri",
    name: "Sri Sriningsih",
    email: "sri.sriningsih81@gmail.com",
    phone: "6285729461037",
    province: "DI Yogyakarta",
    region: "Pleret, Bantul, DI Yogyakarta",
    initials: "SS",
    roles: ["teacher"],
    joinedDaysAgo: 398,
    lastActiveDaysAgo: 2,
  },
  {
    key: "widagdo",
    name: "Widagdo Saputra",
    email: "widagdo.saputra75@gmail.com",
    phone: "6281392657410",
    province: "DI Yogyakarta",
    region: "Umbulharjo, Kota Yogyakarta, DI Yogyakarta",
    initials: "WS",
    roles: ["teacher"],
    joinedDaysAgo: 397,
    lastActiveDaysAgo: 1,
  },
  {
    key: "joko",
    name: "Joko Santoso",
    email: "joko.santoso79@gmail.com",
    phone: "6282138460925",
    province: "DI Yogyakarta",
    region: "Sewon, Bantul, DI Yogyakarta",
    initials: "JS",
    roles: ["teacher"],
    joinedDaysAgo: 380,
    lastActiveDaysAgo: 5,
  },
  {
    key: "anisa",
    name: "Anisa Rahmawati",
    email: "anisa.rahmawati02@gmail.com",
    phone: "6281294736508",
    province: "DI Yogyakarta",
    region: "Kasihan, Bantul, DI Yogyakarta",
    initials: "AR",
    roles: ["student"],
    joinedDaysAgo: 396,
    lastActiveDaysAgo: 3,
  },
  {
    key: "dimas",
    name: "Dimas Yoga Pratama",
    email: "dimas.yogapratama96@gmail.com",
    phone: "6285742096371",
    province: "DI Yogyakarta",
    region: "Depok, Sleman, DI Yogyakarta",
    initials: "DP",
    roles: ["student"],
    joinedDaysAgo: 395,
    lastActiveDaysAgo: 4,
  },
  {
    key: "purnomo",
    name: "Bambang Purnomo",
    email: "bambang.purnomo74@gmail.com",
    phone: "6281387502649",
    province: "DI Yogyakarta",
    region: "Mlati, Sleman, DI Yogyakarta",
    initials: "BP",
    roles: ["student"],
    joinedDaysAgo: 394,
    lastActiveDaysAgo: 2,
  },
  {
    key: "rani",
    name: "Rani Wikaningsih",
    email: "rani.wikaningsih97@gmail.com",
    phone: "6282130958467",
    province: "DI Yogyakarta",
    region: "Banguntapan, Bantul, DI Yogyakarta",
    initials: "RW",
    roles: ["student"],
    joinedDaysAgo: 393,
    lastActiveDaysAgo: 2,
  },
  {
    key: "sari",
    name: "Sari Wulandari",
    email: "sari.wulandari95@gmail.com",
    phone: "6281295083741",
    province: "DI Yogyakarta",
    region: "Mergangsan, Kota Yogyakarta, DI Yogyakarta",
    initials: "SW",
    roles: ["student"],
    joinedDaysAgo: 180,
    lastActiveDaysAgo: 0,
  },
  {
    key: "dwi",
    name: "Dwi Lestari",
    email: "dwi.lestari90@gmail.com",
    phone: "6285726409183",
    province: "DI Yogyakarta",
    region: "Godean, Sleman, DI Yogyakarta",
    initials: "DL",
    roles: ["student"],
    joinedDaysAgo: 175,
    lastActiveDaysAgo: 1,
  },
  {
    key: "bayu",
    name: "Bayu Pratama",
    email: "bayu.pratama94@gmail.com",
    phone: "6281396720485",
    province: "DI Yogyakarta",
    region: "Banguntapan, Bantul, DI Yogyakarta",
    initials: "BP",
    roles: ["student"],
    joinedDaysAgo: 168,
    lastActiveDaysAgo: 1,
  },
  {
    key: "nanda",
    name: "Nanda Kusuma",
    email: "nanda.kusuma01@gmail.com",
    phone: "6282148305962",
    province: "DI Yogyakarta",
    region: "Sewon, Bantul, DI Yogyakarta",
    initials: "NK",
    roles: ["student"],
    joinedDaysAgo: 160,
    lastActiveDaysAgo: 2,
  },
  {
    key: "ratih",
    name: "Ratih Puspitasari",
    email: "ratih.puspitasari93@gmail.com",
    phone: "6281274095638",
    province: "DI Yogyakarta",
    region: "Pakem, Sleman, DI Yogyakarta",
    initials: "RP",
    roles: ["student"],
    joinedDaysAgo: 152,
    lastActiveDaysAgo: 4,
  },
  {
    key: "yusuf",
    name: "Yusuf Maulana",
    email: "yusuf.maulana99@gmail.com",
    phone: "6285739162840",
    province: "DI Yogyakarta",
    region: "Wates, Kulon Progo, DI Yogyakarta",
    initials: "YM",
    roles: ["student"],
    joinedDaysAgo: 148,
    lastActiveDaysAgo: 3,
  },
  {
    key: "melati",
    name: "Melati Anggraini",
    email: "melati.anggraini00@gmail.com",
    phone: "6281385274061",
    province: "DI Yogyakarta",
    region: "Playen, Gunungkidul, DI Yogyakarta",
    initials: "MA",
    roles: ["student"],
    joinedDaysAgo: 300,
    lastActiveDaysAgo: 6,
  },
  {
    key: "arif",
    name: "Arif Setiawan",
    email: "arif.setiawan92@gmail.com",
    phone: "6281296384750",
    province: "DI Yogyakarta",
    region: "Kotagede, Kota Yogyakarta, DI Yogyakarta",
    initials: "AS",
    roles: ["student"],
    joinedDaysAgo: 330,
    lastActiveDaysAgo: 1,
  },
  {
    key: "dewi",
    name: "Dewi Kartika",
    email: "dewi.kartika91@gmail.com",
    phone: "6285720849376",
    province: "DI Yogyakarta",
    region: "Berbah, Sleman, DI Yogyakarta",
    initials: "DK",
    roles: ["student"],
    joinedDaysAgo: 330,
    lastActiveDaysAgo: 2,
  },
  {
    key: "fajar",
    name: "Fajar Nugroho",
    email: "fajar.nugroho98@gmail.com",
    phone: "6282149576308",
    province: "DI Yogyakarta",
    region: "Piyungan, Bantul, DI Yogyakarta",
    initials: "FN",
    roles: ["student"],
    joinedDaysAgo: 300,
    lastActiveDaysAgo: 5,
  },
]

const BY_KEY = new Map(SEED_USERS.map((user) => [user.key, user] as const))

export function seedUser(key: string): SeedUser {
  const user = BY_KEY.get(key)
  if (!user) throw new Error(`Seed identity missing: ${key}`)
  return user
}

export function seedEmail(key: string): string {
  return seedUser(key).email
}

export function seedPhone(key: string): string {
  return seedUser(key).phone
}

/**
 * The live admin row is tied to a Better Auth subject, so it must be resolved
 * by role instead of by a mailbox the seed controls.
 */
export async function seedAdmin(ctx: MutationCtx): Promise<Doc<"users">> {
  const users = await ctx.db.query("users").collect()
  const admin = users.find(
    (user) => user.roles.includes("admin") && user.status === "active",
  )
  if (!admin) throw new Error("Seed admin missing")
  return admin
}
