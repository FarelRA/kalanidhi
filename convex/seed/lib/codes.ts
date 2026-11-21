/**
 * Typed seed key registry.
 *
 * Cross-file references (path slugs, cohort codes, work slugs, order codes,
 * certificate serials, and task keys) live here so a rename cannot leave one
 * seed module pointing at a row another module no longer creates. Every getter
 * throws on an unknown key instead of silently skipping a row.
 */

function requireCode<T extends Record<string, string>>(
  registry: T,
  key: keyof T,
  label: string,
): string {
  const value = registry[key]
  if (value === undefined) {
    throw new Error(`SEED_CODE_MISSING: ${label}.${String(key)}`)
  }
  return value
}

/** Path slugs, used by curriculum, cohorts, messaging, and governance. */
export const PATHS = {
  batikBambu: "batik-bambu",
  kriyaGerabahBantul: "kriya-gerabah-bantul",
  aksaraJawa: "aksara-jawa",
  batikTulisSoga: "batik-tulis-soga",
  tariKreasi: "tari-kreasi",
  kulinerNusantara: "kuliner-nusantara",
} as const

export type PathKey = keyof typeof PATHS

export function pathSlug(key: PathKey): string {
  return requireCode(PATHS, key, "paths")
}

/** Work slugs, used by commerce, work cards, and audit trails. */
export const WORK_SLUGS = {
  nampanBatikBambu: "nampan-batik-bambu",
  kotakBundarBatikBambu: "kotak-bundar-batik-bambu",
  hiasanDindingBatikBambu: "hiasan-dinding-batik-bambu",
  jasaTulisAksara: "jasa-tulis-aksara",
  tariKreasiAcara: "tari-kreasi-acara-keluarga",
  geblekRentengBeku: "geblek-renteng-beku",
} as const

export type WorkKey = keyof typeof WORK_SLUGS

export function workSlug(key: WorkKey): string {
  return requireCode(WORK_SLUGS, key, "workSlugs")
}

/**
 * Pre-renumber order code inputs, used by commerce before growth exists.
 *
 * These are temporary invoice numbers. `renumberOrders` assigns the final
 * `KN-2026-NNNNNN` codes by `createdAt` after every order (including growth)
 * is inserted, then rewrites payment, event, and payout references. Do not use
 * this registry to look up a live order; use the order row's `code`.
 */
export const ORDER_CODE_INPUTS = {
  order1: "KN-2026-000008",
  order2: "KN-2026-000009",
  order3: "KN-2026-000011",
  order4: "KN-2026-000013",
  order5: "KN-2026-000007",
  order6: "KN-2026-000010",
  order7: "KN-2026-000001",
  order8: "KN-2026-000002",
  order9: "KN-2026-000003",
  order10: "KN-2026-000004",
  order11: "KN-2026-000005",
  order12: "KN-2026-000006",
  order13: "KN-2026-000012",
} as const

/** @deprecated Use `ORDER_CODE_INPUTS`; kept for seed callers. */
export const ORDER_CODES = ORDER_CODE_INPUTS

export type OrderKey = keyof typeof ORDER_CODE_INPUTS

export function orderCode(key: OrderKey): string {
  return requireCode(ORDER_CODE_INPUTS, key, "orderCodes")
}
