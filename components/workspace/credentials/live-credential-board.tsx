"use client"

import * as React from "react"
import Link from "next/link"
import {
  BadgeCheck,
  Copy,
  ExternalLink,
  QrCode,
  ShieldCheck,
} from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DataTable, type Column } from "@/components/workspace/data/data-table"
import {
  DetailDrawer,
  DetailGrid,
  DrawerSection,
} from "@/components/workspace/data/detail-drawer"
import { EmptyState } from "@/components/workspace/data/empty-state"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { SegmentedTabs } from "@/components/workspace/data/segmented-tabs"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import { api } from "@/convex/_generated/api"
import type { CertificateOverview } from "@/lib/workspace/phase2-types"
import type { StatusTone } from "@/lib/workspace/types"
import { formatWorkspaceDate } from "@/lib/workspace/format"

function iso(ms: number) {
  return new Date(ms).toISOString()
}

function toneFor(status: CertificateOverview["status"]): StatusTone {
  if (status === "issued") return "done"
  if (status === "revoked") return "danger"
  return "muted"
}

export function LiveCredentialBoard() {
  const { can } = useViewer()
  const [tab, setTab] = React.useState("mine")
  const [selected, setSelected] = React.useState<CertificateOverview | null>(
    null,
  )
  const [revokeTarget, setRevokeTarget] =
    React.useState<CertificateOverview | null>(null)
  const [reissueTarget, setReissueTarget] =
    React.useState<CertificateOverview | null>(null)
  const [reason, setReason] = React.useState("")

  const mine = useQuery(
    api.certificates.listMine,
    can("certificates.read.own") ? {} : "skip",
  )
  const cohort = useQuery(
    api.certificates.listCohort,
    can("certificates.read.cohort") ? {} : "skip",
  )
  const registry = useQuery(
    api.certificates.listRegistry,
    can("certificates.manage") ? {} : "skip",
  )
  const revoke = useMutation(api.certificates.revoke)
  const reissue = useMutation(api.certificates.reissue)

  const tabs = [
    can("certificates.read.own") && { id: "mine", label: "Sertifikat saya" },
    can("certificates.read.cohort") && {
      id: "cohort",
      label: "Kohort saya",
      count: cohort?.length ?? 0,
    },
    can("certificates.manage") && {
      id: "registry",
      label: "Registry",
      count: registry?.length ?? 0,
    },
  ].filter(Boolean) as { id: string; label: string; count?: number }[]

  const active = tabs.some((item) => item.id === tab) ? tab : tabs[0]?.id

  if (tabs.length === 0) {
    return (
      <EmptyState
        title="Belum ada kredensial"
        description="Akun ini belum memiliki akses sertifikat atau registry."
      />
    )
  }

  async function onRevoke() {
    if (!revokeTarget) return
    try {
      await revoke({ certificateId: revokeTarget.id, reason })
      toast("Sertifikat dicabut", {
        description: "Verifikasi publik langsung menampilkan status dicabut.",
      })
      setRevokeTarget(null)
      setReason("")
      setSelected(null)
    } catch (error) {
      toast.error("Pencabutan gagal", {
        description:
          error instanceof Error ? error.message : "Alasan minimal 8 karakter.",
      })
    }
  }

  async function onReissue() {
    if (!reissueTarget) return
    try {
      const result = await reissue({
        certificateId: reissueTarget.id,
        reason,
      })
      toast("Sertifikat diganti", {
        description: `Kode baru ${result.publicCode}. Kode lama menjadi diganti.`,
      })
      setReissueTarget(null)
      setReason("")
      setSelected(null)
    } catch (error) {
      toast.error("Penggantian gagal", {
        description:
          error instanceof Error ? error.message : "Alasan minimal 8 karakter.",
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Kredensial"
        title={
          can("certificates.manage")
            ? "Registry, verifikasi, dan pencabutan."
            : can("certificates.read.cohort")
              ? "Sertifikat kohort."
              : "Sertifikat dan Kartu Karya."
        }
        description={
          can("certificates.manage")
            ? "Sertifikat platform dengan kode publik. Pencabutan dan penggantian memerlukan alasan dan tercatat."
            : can("certificates.read.cohort")
              ? "Sertifikat yang kamu nilai pada kohort sendiri, dengan kode verifikasi publik."
              : "Sertifikat platform dengan kode verifikasi publik dan Kartu Karya."
        }
        actions={
          can("certificates.manage") ? (
            <Button asChild variant="outline">
              <Link href="/ruang/log">Lihat log audit</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/ruang/karya">Buka karya saya</Link>
            </Button>
          )
        }
      />

      <SegmentedTabs
        tabs={tabs}
        value={active ?? "mine"}
        onChange={setTab}
        ariaLabel="Pilih tampilan kredensial"
      />

      {active === "mine" ? (
        mine && mine.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {mine.map((certificate) => (
              <CertificateCard
                key={certificate.id}
                certificate={certificate}
                onSelect={() => setSelected(certificate)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Belum ada sertifikat"
            description="Sertifikat terbit setelah tugas terakhir disetujui pengajar. Setelah terbit, cakupan penjualan jalur itu terbuka."
            action={
              <Button asChild size="sm">
                <Link href="/ruang/tugas">Buka tugas</Link>
              </Button>
            }
          />
        )
      ) : null}

      {active === "cohort" ? (
        <Panel eyebrow="Kohort" title="Sertifikat peserta" bodyClassName="p-0">
          <DataTable
            rows={cohort ?? []}
            columns={certificateColumns(setSelected)}
            caption="Sertifikat peserta pada kohort yang diampu"
            searchPlaceholder="Cari peserta, seri, atau jalur"
            getSearchText={(row) =>
              `${row.studentName} ${row.serial} ${row.pathTitle}`
            }
            emptyTitle="Belum ada sertifikat kohort"
            minWidth={780}
          />
        </Panel>
      ) : null}

      {active === "registry" ? (
        <Panel eyebrow="Registry" title="Semua sertifikat" bodyClassName="p-0">
          <DataTable
            rows={registry ?? []}
            columns={certificateColumns(setSelected)}
            caption="Registry sertifikat dengan status, jalur, dan pengajar"
            searchPlaceholder="Cari seri, kode publik, nama, atau jalur"
            getSearchText={(row) =>
              `${row.serial} ${row.publicCode} ${row.studentName} ${row.pathTitle} ${row.teacherName}`
            }
            filters={[
              {
                id: "status",
                label: "Status",
                options: [
                  { value: "all", label: "Semua", count: registry?.length ?? 0 },
                  { value: "issued", label: "Terbit" },
                  { value: "revoked", label: "Dicabut" },
                  { value: "replaced", label: "Diganti" },
                ],
              },
            ]}
            filterRow={(row, values) =>
              !values.status ||
              values.status === "all" ||
              row.status === values.status
            }
            emptyTitle="Registry kosong"
            minWidth={900}
            footer={
              <p>
                Registry bersifat append-only. Penggantian membuat kode baru;
                kode lama berstatus diganti.
              </p>
            }
          />
        </Panel>
      ) : null}

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        eyebrow="Sertifikat platform"
        title={selected?.studentName ?? ""}
        stamp={selected?.statusLabel}
        tone={selected ? toneFor(selected.status) : "muted"}
        description={selected?.pathTitle}
        footer={
          selected && can("certificates.manage") ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard?.writeText(selected.publicCode)
                  toast("Kode publik disalin", {
                    description: selected.publicCode,
                  })
                }}
              >
                <Copy aria-hidden="true" />
                Salin kode
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReason("")
                  setReissueTarget(selected)
                }}
                disabled={selected.status !== "issued"}
              >
                Ganti sertifikat
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setReason("")
                  setRevokeTarget(selected)
                }}
                disabled={selected.status !== "issued"}
              >
                Cabut sertifikat
              </Button>
            </div>
          ) : undefined
        }
      >
        {selected ? (
          <>
            <DetailGrid
              items={[
                { label: "Seri", value: selected.serial },
                { label: "Kode publik", value: selected.publicCode },
                { label: "Jalur", value: selected.pathTitle },
                { label: "Pengajar", value: selected.teacherName },
                { label: "Terbit", value: formatWorkspaceDate(iso(selected.issuedAt)) },
                { label: "Nilai penilaian", value: String(selected.assessmentScore) },
                {
                  label: "Diganti dengan",
                  value: selected.replacedByCode ?? "—",
                },
                { label: "Cakupan", value: selected.scope },
              ]}
            />
            <DrawerSection title="Pratinjau verifikasi publik">
              <div className="border border-ink/25 bg-panel/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-[0.12em] text-copper-dark">
                      <ShieldCheck className="size-3" aria-hidden="true" />
                      KalaNidhi Digital
                    </p>
                    <p className="mt-2 font-heading text-[1.35rem] leading-tight text-ink">
                      {selected.pathTitle}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-soft">
                      {selected.studentName} · dinilai {selected.teacherName}
                    </p>
                  </div>
                  <span className="flex size-14 shrink-0 items-center justify-center border border-ink/30 bg-paper">
                    <QrCode className="size-9 text-ink" aria-hidden="true" />
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-ink/15 pt-3 text-[10px]">
                  <div>
                    <dt className="font-bold uppercase tracking-[0.08em] text-ink-muted">
                      Seri
                    </dt>
                    <dd className="mt-1 font-semibold">{selected.serial}</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase tracking-[0.08em] text-ink-muted">
                      Status
                    </dt>
                    <dd className="mt-1 font-semibold">{selected.statusLabel}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-[9px] leading-relaxed text-ink-muted">
                  Sertifikat platform, bukan sertifikasi pemerintah atau BNSP.
                  Verifikasi di kalanidhi.site/verifikasi/{selected.publicCode}.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link href={`/verifikasi/${selected.publicCode}`}>
                    Buka verifikasi publik
                    <ExternalLink aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </DrawerSection>
            {selected.status !== "issued" ? (
              <p className="mt-4 border border-destructive/30 bg-destructive/5 p-3 text-[10.5px] leading-relaxed text-[#8a2e1f]">
                Status ini terlihat publik. Pencabutan tidak menghapus riwayat.
              </p>
            ) : null}
          </>
        ) : null}
      </DetailDrawer>

      <Dialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRevokeTarget(null)
            setReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cabut {revokeTarget?.serial}</DialogTitle>
            <DialogDescription>
              Pencabutan langsung terlihat pada verifikasi publik, mencatat
              audit, dan mencabut cakupan penjualan jalur ini.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="revoke-reason">Alasan pencabutan</Label>
            <Textarea
              id="revoke-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 min-h-24"
              placeholder="Alasan pencabutan yang dapat diaudit."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRevokeTarget(null)
                setReason("")
              }}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={reason.trim().length < 8}
              onClick={onRevoke}
            >
              Cabut dengan alasan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reissueTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setReissueTarget(null)
            setReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ganti {reissueTarget?.serial}</DialogTitle>
            <DialogDescription>
              Kode baru diterbitkan. Kode lama berstatus diganti dan tidak lagi
              memverifikasi sebagai sertifikat aktif.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="reissue-reason">Alasan penggantian</Label>
            <Textarea
              id="reissue-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 min-h-24"
              placeholder="Alasan penggantian yang dapat diaudit."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReissueTarget(null)
                setReason("")
              }}
            >
              Batal
            </Button>
            <Button
              disabled={reason.trim().length < 8}
              onClick={onReissue}
            >
              Terbitkan kode baru
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CertificateCard({
  certificate,
  onSelect,
}: {
  certificate: CertificateOverview
  onSelect: () => void
}) {
  return (
    <article className="relative border border-ink/25 bg-paper-2 p-4 shadow-[4px_4px_0_rgba(32,19,13,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-[0.12em] text-copper-dark">
            <BadgeCheck className="size-3.5" aria-hidden="true" />
            Sertifikat platform
          </p>
          <h2 className="mt-2 font-heading text-[1.6rem] leading-[1.05] text-ink">
            {certificate.pathTitle}
          </h2>
          <p className="mt-1.5 text-[11px] text-ink-soft">
            {certificate.studentName} · dinilai {certificate.teacherName}
          </p>
        </div>
        <span className="flex size-16 shrink-0 items-center justify-center border border-ink/30 bg-paper">
          <QrCode className="size-11 text-ink" aria-hidden="true" />
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-ink/15 py-3 text-[10px]">
        <div>
          <dt className="font-bold uppercase tracking-[0.08em] text-ink-muted">
            Seri
          </dt>
          <dd className="mt-1 font-semibold">{certificate.serial}</dd>
        </div>
        <div>
          <dt className="font-bold uppercase tracking-[0.08em] text-ink-muted">
            Kode publik
          </dt>
          <dd className="mt-1 font-semibold">{certificate.publicCode}</dd>
        </div>
        <div>
          <dt className="font-bold uppercase tracking-[0.08em] text-ink-muted">
            Terbit
          </dt>
          <dd className="mt-1 font-semibold">
            {formatWorkspaceDate(iso(certificate.issuedAt))}
          </dd>
        </div>
        <div>
          <dt className="font-bold uppercase tracking-[0.08em] text-ink-muted">
            Nilai
          </dt>
          <dd className="mt-1 font-semibold">{certificate.assessmentScore}</dd>
        </div>
        <div>
          <dt className="font-bold uppercase tracking-[0.08em] text-ink-muted">
            Kartu Karya
          </dt>
          <dd className="mt-1 font-semibold">
            {certificate.workCards[0]?.serial ?? "Belum terhubung"}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-[10.5px] leading-relaxed text-ink-soft">
        {certificate.scope}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={onSelect}>
          Buka detail
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/verifikasi/${certificate.publicCode}`}>
            Verifikasi
            <ExternalLink aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <StatusStamp
        label={certificate.statusLabel}
        tone={toneFor(certificate.status)}
        className="absolute -top-2 right-3 bg-paper-2"
      />
    </article>
  )
}

function certificateColumns(
  onSelect: (row: CertificateOverview) => void,
): Column<CertificateOverview>[] {
  return [
    {
      id: "student",
      header: "Pemegang",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.studentName}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">{row.serial}</p>
        </div>
      ),
    },
    {
      id: "path",
      header: "Jalur",
      cell: (row) => (
        <span className="text-[11px] leading-snug text-ink-soft">
          {row.pathTitle}
        </span>
      ),
      className: "hidden md:table-cell",
      headClassName: "hidden md:table-cell",
    },
    {
      id: "code",
      header: "Kode publik",
      cell: (row) => (
        <code className="border border-ink/15 bg-panel/35 px-1.5 py-1 text-[10px] text-ink">
          {row.publicCode}
        </code>
      ),
      className: "hidden lg:table-cell",
      headClassName: "hidden lg:table-cell",
    },
    {
      id: "issued",
      header: "Terbit",
      cell: (row) => (
        <span className="text-[11px] text-ink-soft">
          {formatWorkspaceDate(iso(row.issuedAt))}
        </span>
      ),
      className: "hidden xl:table-cell",
      headClassName: "hidden xl:table-cell",
    },
    {
      id: "score",
      header: "Nilai",
      cell: (row) => (
        <span className="font-heading text-sm tabular-nums">
          {row.assessmentScore}
        </span>
      ),
      align: "center",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <StatusStamp
          label={row.statusLabel}
          tone={toneFor(row.status)}
        />
      ),
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (row) => (
        <Button size="sm" variant="ghost" onClick={() => onSelect(row)}>
          Buka
        </Button>
      ),
    },
  ]
}
