import type { Metadata } from "next"
import Link from "next/link"
import { connection } from "next/server"
import { fetchQuery } from "convex/nextjs"
import { BadgeCheck, ShieldCheck } from "lucide-react"

import { api } from "@/convex/_generated/api"
import { PUBLIC_ROUTES, verifyHref } from "@/lib/content/routes"
import { getSiteData } from "@/lib/convex/server"
import { formatWorkspaceDate } from "@/lib/workspace/format"

export const instant = false


function convexUrl() {
  return process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kode: string }>
}): Promise<Metadata> {
  const { kode } = await params
  return {
    title: `Verifikasi ${kode}`,
    description:
      "Verifikasi sertifikat platform. Sertifikat platform, bukan sertifikasi pemerintah atau BNSP.",
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default async function VerificationPage({
  params,
}: {
  params: Promise<{ kode: string }>
}) {
  const { kode } = await params
  await connection()
  const url = convexUrl()
  const data = await getSiteData().catch(() => null)
  const siteName = data?.metadata.siteName ?? "platform"

  if (!url) {
    return (
      <VerificationShell>
        <p className="text-[12.5px] leading-relaxed text-ink-soft">
          Layanan verifikasi belum tersambung pada lingkungan ini. Coba lagi
          nanti atau hubungi pengelola {siteName}.
        </p>
      </VerificationShell>
    )
  }

  let certificate = null
  try {
    certificate = await fetchQuery(
      api.certificates.verifyPublic,
      { code: kode },
      { url, skipConvexDeploymentUrlCheck: true },
    )
  } catch (error) {
    console.error("[verification] Could not load certificate.", error)
    return (
      <VerificationShell>
        <p className="text-[12.5px] leading-relaxed text-ink-soft">
          Verifikasi tidak dapat dimuat saat ini. Coba lagi nanti.
        </p>
      </VerificationShell>
    )
  }

  if (!certificate) {
    return (
      <VerificationShell>
        <p className="text-[12.5px] leading-relaxed text-ink-soft">
          Kode <code className="border border-ink/15 bg-panel/40 px-1.5 py-0.5">{kode}</code>{" "}
          tidak ditemukan dalam registry sertifikat platform {siteName}.
        </p>
        <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
          Periksa kembali kode pada sertifikat. Kode publik berbeda dari nomor
          seri internal.
        </p>
      </VerificationShell>
    )
  }

  const label =
    certificate.status === "issued"
      ? "Terbit dan berlaku"
      : certificate.status === "revoked"
        ? "Dicabut"
        : "Diganti"

  const tone =
    certificate.status === "issued"
      ? "border-moss/40 bg-moss/10 text-moss"
      : certificate.status === "revoked"
        ? "border-[#9a3423]/35 bg-[#9a3423]/10 text-[#8a2e1f]"
        : "border-ink/25 bg-panel/50 text-ink-soft"

  return (
    <VerificationShell>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink/20 pb-4">
        <div>
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-copper-dark">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Verifikasi publik
          </p>
          <h1 className="mt-2 font-heading text-[clamp(1.8rem,4vw,2.6rem)] leading-tight text-ink">
            {certificate.pathTitle}
          </h1>
          <p className="mt-1.5 text-[12px] text-ink-soft">
            {certificate.studentName} · dinilai {certificate.teacherName}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.09em] ${tone}`}
        >
          <span aria-hidden="true" className="inline-block size-1.5 bg-current" />
          {label}
        </span>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <Item label="Seri" value={certificate.serial} />
        <Item label="Kode publik" value={certificate.publicCode} />
        <Item
          label="Tanggal terbit"
          value={formatWorkspaceDate(new Date(certificate.issuedAt).toISOString())}
        />
        <Item label="Nilai penilaian" value={String(certificate.assessmentScore)} />
      </dl>

      {certificate.status === "revoked" ? (
        <p className="mt-5 border border-[#9a3423]/30 bg-[#9a3423]/5 p-3 text-[11.5px] leading-relaxed text-[#8a2e1f]">
          Sertifikat ini dicabut
          {certificate.revokedAt
            ? ` pada ${formatWorkspaceDate(new Date(certificate.revokedAt).toISOString())}`
            : ""}
          . Riwayat tetap tersimpan, tetapi kode ini tidak lagi menyatakan
          kredensial aktif.
        </p>
      ) : null}

      {certificate.status === "replaced" &&
      certificate.replacedByPublicCode ? (
        <p className="mt-5 border border-ink/20 bg-panel/30 p-3 text-[11.5px] leading-relaxed text-ink-soft">
          Kode ini telah diganti. Gunakan kode terbaru:{" "}
          <Link
            href={verifyHref(certificate.replacedByPublicCode)}
            className="font-semibold text-copper-dark underline underline-offset-2"
          >
            {certificate.replacedByPublicCode}
          </Link>
          .
        </p>
      ) : null}

      <p className="mt-6 flex items-start gap-2 border-t border-ink/15 pt-4 text-[10px] leading-relaxed text-ink-muted">
        <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-copper-dark" aria-hidden="true" />
        <span>
          Sertifikat platform {siteName} dengan verifikasi publik. Ini bukan
          sertifikasi pemerintah atau BNSP.
        </span>
      </p>
    </VerificationShell>
  )
}

async function VerificationShell({ children }: { children: React.ReactNode }) {
  const data = await getSiteData().catch(() => null)
  const siteName = data?.metadata.siteName

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="border border-ink/25 bg-paper-2 p-5 shadow-[4px_4px_0_rgba(32,19,13,0.06)] sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href={PUBLIC_ROUTES.home}
            className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft hover:text-ink"
          >
            {siteName ?? "Beranda"}
          </Link>
          <Link
            href={PUBLIC_ROUTES.verify}
            className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-muted hover:text-ink"
          >
            Registry kredensial
          </Link>
        </div>
        {children}
      </div>
    </div>
  )
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1.5 break-words text-[12.5px] leading-relaxed text-ink">
        {value}
      </dd>
    </div>
  )
}
