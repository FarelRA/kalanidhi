/**
 * Seed identities.
 *
 * The workspace should read like a real Yogyakarta studio, not a fixture:
 * every account uses a plausible Gmail address, an Indonesian mobile number,
 * and a regency inside D.I. Yogyakarta. Timestamps are compressed into the
 * 2026 operating window so activities never predate the platform and never
 * pile up on a single day.
 */

/** Owner tag for media rows the seed itself creates, so reseeds can clear them. */
export const SEED_ASSET_OWNER = "KalaNidhi"

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
    region: "Krebet, Sendangsari, Pajangan, Bantul, DI Yogyakarta",
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
    key: "sutrisno",
    name: "Sutrisno Wibowo",
    email: "sutrisno.wibowo72@gmail.com",
    phone: "6282138460925",
    province: "DI Yogyakarta",
    region: "Kasongan, Kasihan, Bantul, DI Yogyakarta",
    initials: "SW",
    roles: ["teacher"],
    joinedDaysAgo: 380,
    lastActiveDaysAgo: 5,
  },
  {
    key: "suwardi",
    name: "Suwardi Pratama",
    email: "suwardi.pratama62@gmail.com",
    phone: "6281395408271",
    province: "DI Yogyakarta",
    region: "Kota Yogyakarta, DI Yogyakarta",
    initials: "SP",
    roles: ["teacher"],
    joinedDaysAgo: 265,
    lastActiveDaysAgo: 1,
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
  {
    key: "galuh",
    name: "Galuh Puspita",
    email: "galuh.puspita94@gmail.com",
    phone: "6282143075968",
    province: "DI Yogyakarta",
    region: "Gondokusuman, Kota Yogyakarta, DI Yogyakarta",
    initials: "GP",
    roles: ["student"],
    joinedDaysAgo: 250,
    lastActiveDaysAgo: 2,
  },
  {
    key: "retno",
    name: "Retno Wulandari",
    email: "retno.wulandari74@gmail.com",
    phone: "6281296743205",
    province: "DI Yogyakarta",
    region: "Depok, Sleman, DI Yogyakarta",
    initials: "RW",
    roles: ["teacher"],
    joinedDaysAgo: 340,
    lastActiveDaysAgo: 1,
  },
  {
    key: "joko",
    name: "Joko Santosa",
    email: "joko.santosa68@gmail.com",
    phone: "6282137596408",
    province: "DI Yogyakarta",
    region: "Wates, Kulon Progo, DI Yogyakarta",
    initials: "JS",
    roles: ["teacher"],
    joinedDaysAgo: 330,
    lastActiveDaysAgo: 2,
  },
  {
    key: "sekar",
    name: "Sekar Ayuningtyas",
    email: "sekar.ayuningtyas97@gmail.com",
    phone: "6285729461830",
    province: "DI Yogyakarta",
    region: "Mlati, Sleman, DI Yogyakarta",
    initials: "SA",
    roles: ["student"],
    joinedDaysAgo: 300,
    lastActiveDaysAgo: 3,
  },
  {
    key: "bimo",
    name: "Bimo Prakoso",
    email: "bimo.prakoso93@gmail.com",
    phone: "6281395284617",
    province: "DI Yogyakarta",
    region: "Sentolo, Kulon Progo, DI Yogyakarta",
    initials: "BP",
    roles: ["student"],
    joinedDaysAgo: 290,
    lastActiveDaysAgo: 2,
  },
]

const BY_KEY = new Map(SEED_USERS.map((user) => [user.key, user] as const))

function seedUser(key: string): SeedUser {
  const user = BY_KEY.get(key)
  if (!user) throw new Error(`Seed identity missing, ${key}`)
  return user
}

export function seedEmail(key: string): string {
  return seedUser(key).email
}

export function seedPhone(key: string): string {
  return seedUser(key).phone
}
