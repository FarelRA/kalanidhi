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
  pranatacaraJawa: "pranatacara-jawa",
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

/** Internal cohort keys, used to group enrollments and submissions. */
export const COHORT_KEYS = {
  bbm2026_01: "bbm-2026-01",
  bbm2025_02: "bbm-2025-02",
  pra2026_01: "pra-2026-01",
  pra2026_02: "pra-2026-02",
  bbm2026_03: "bbm-2026-03",
  bbm2026_04: "bbm-2026-04",
  pra2025_01: "pra-2025-01",
  aks2026_01: "aks-2026-01",
  tari2026_01: "tari-2026-01",
  kul2026_01: "kul-2026-01",
} as const

export type CohortKey = keyof typeof COHORT_KEYS

export function cohortKey(key: CohortKey): string {
  return requireCode(COHORT_KEYS, key, "cohortKeys")
}

/** Public cohort codes stored on `cohorts.code`. */
export const COHORT_CODES = {
  bbm2026_01: "BBM-2026-01",
  bbm2025_02: "BBM-2026-00",
  pra2026_01: "PRA-2026-01",
  pra2026_02: "PRA-2026-02",
  bbm2026_03: "BBM-2026-03",
  bbm2026_04: "BBM-2026-04",
  pra2025_01: "PRA-2026-00",
  aks2026_01: "AKS-2026-01",
  tari2026_01: "TARI-2026-01",
  kul2026_01: "KUL-2026-01",
} as const

export function cohortCode(key: CohortKey): string {
  return requireCode(COHORT_CODES, key, "cohortCodes")
}

/** Work slugs, used by commerce, work cards, and audit trails. */
export const WORK_SLUGS = {
  nampanBatikBambu: "nampan-batik-bambu",
  kotakBundarBatikBambu: "kotak-bundar-batik-bambu",
  hiasanDindingBatikBambu: "hiasan-dinding-batik-bambu",
  pranatacaraSiraman: "pranatacara-siraman",
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

/** Certificate serials double as the public verification code. */
export const CERTIFICATES = {
  anisa: { serial: "KN-2026-0001", publicCode: "KN-2026-0001" },
  dimas: { serial: "KN-2026-0002", publicCode: "KN-2026-0002" },
  purnomo: { serial: "KN-2026-0003", publicCode: "KN-2026-0003" },
  rani: { serial: "KN-2026-0004", publicCode: "KN-2026-0004" },
  galuh: { serial: "KN-2026-0005", publicCode: "KN-2026-0005" },
  arif: { serial: "KN-2026-0007", publicCode: "KN-2026-0007" },
  dwi: { serial: "KN-2026-0006", publicCode: "KN-2026-0006" },
  sekar: { serial: "KN-2026-0008", publicCode: "KN-2026-0008" },
  bimo: { serial: "KN-2026-0009", publicCode: "KN-2026-0009" },
} as const

export type CertificateKey = keyof typeof CERTIFICATES

function certificate(key: CertificateKey) {
  const value = CERTIFICATES[key]
  if (!value) throw new Error(`SEED_CODE_MISSING: certificates.${key}`)
  return value
}

export function certificateSerial(key: CertificateKey): string {
  return certificate(key).serial
}

export function certificatePublicCode(key: CertificateKey): string {
  return certificate(key).publicCode
}

/** Task keys; the public submission code is derived from the key. */
export const SUBMISSION_KEYS = {
  sariBbm1: "sari-bbm-1",
  sariBbm2: "sari-bbm-2",
  dwiBbm1: "dwi-bbm-1",
  dwiBbm2: "dwi-bbm-2",
  bayuBbm1: "bayu-bbm-1",
  nandaBbm1: "nanda-bbm-1",
  ratihBbm1: "ratih-bbm-1",
  yusufBbm1: "yusuf-bbm-1",
  melatiBbm1: "melati-bbm-1",
  arifBbm1: "arif-bbm-1",
  anisaBbmFinal: "anisa-bbm-final",
  dimasBbmFinal: "dimas-bbm-final",
  purnomoBbmFinal: "purnomo-bbm-final",
  dwiBbmFinal: "dwi-bbm-final",
  raniPraFinal: "rani-pra-final",
  sariPra1: "sari-pra-1",
  dwiPra1: "dwi-pra-1",
  bayuPra1: "bayu-pra-1",
  nandaPra1: "nanda-pra-1",
  dewiPra1: "dewi-pra-1",
  fajarPra1: "fajar-pra-1",
  arifBbm3: "arif-bbm-3",
  dewiBbm3: "dewi-bbm-3",
  galuhAks1: "galuh-aks-1",
  galuhAksFinal: "galuh-aks-final",
  arifAks1: "arif-aks-1",
  arifAksFinal: "arif-aks-final",
  sekarTariFinal: "sekar-tari-final",
  bimoKulFinal: "bimo-kul-final",
} as const

export type SubmissionKey = keyof typeof SUBMISSION_KEYS

export function submissionKey(key: SubmissionKey): string {
  return requireCode(SUBMISSION_KEYS, key, "submissionKeys")
}

export function submissionCode(key: SubmissionKey): string {
  return `TUG-${submissionKey(key).toUpperCase()}`
}

/** Derives the public code from a literal task key such as `sari-bbm-1`. */
export function submissionCodeForKey(key: string): string {
  if (!Object.values(SUBMISSION_KEYS).includes(key as never)) {
    throw new Error(`SEED_CODE_MISSING: submissionKeys.${key}`)
  }
  return `TUG-${key.toUpperCase()}`
}

/** Evidence keys shared by submissions, audits, and support threads. */
export const EVIDENCE_KEYS = {
  sariBbm1: "TUG-SARI-BBM-1",
  dwiBbm2: "TUG-DWI-BBM-2",
} as const

export type EvidenceKey = keyof typeof EVIDENCE_KEYS

export function evidenceCode(key: EvidenceKey): string {
  return requireCode(EVIDENCE_KEYS, key, "evidenceKeys")
}
