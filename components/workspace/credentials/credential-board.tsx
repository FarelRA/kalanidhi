"use client"

import * as React from "react"
import Link from "next/link"
import {
  BadgeCheck,
  Copy,
  Download,
  ExternalLink,
  QrCode,
  ShieldCheck,
} from "lucide-react"
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
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { SegmentedTabs } from "@/components/workspace/data/segmented-tabs"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import { certificates, works } from "@/lib/workspace/mock-data"
import type { Certificate } from "@/lib/workspace/types"
import { formatWorkspaceDate } from "@/lib/workspace/format"

import { LiveCredentialBoard } from "./live-credential-board"

export function CredentialBoard() {
  const { isPreview } = useViewer()
  return isPreview ? <PreviewCredentialBoard /> : <LiveCredentialBoard />
}

function PreviewCredentialBoard() {
  const { can } = useViewer()
  const [tab, setTab] = React.useState("mine")
  const [selected, setSelected] = React.useState<Certificate | null>(null)
  const [revokeTarget, setRevokeTarget] = React.useState<Certificate | null>(null)
  const [reason, setReason] = React.useState("")

  const tabs = [
    can("certificates.read.own") && { id: "mine", label: "Sertifikat saya" },
    can("certificates.read.cohort") && { id: "cohort", label: "Kohort saya" },
    can("certificates.manage") && {
      id: "registry",
      label: "Registry",
      count: certificates.length,
    },
  ].filter(Boolean) as { id: string; label: string; count?: number }[]

  const active = tabs.some((item) => item.id === tab) ? tab : tabs[0]?.id
  const mine = certificates.filter((item) => item.student === "Anisa Rahmawati")
  const cohortCerts = certificates.filter((item) =>
    ["Batik Tulis Soga", "Batik Tulis Soga · Pewarna Alam"].includes(item.pathTitle),
  )

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
            ? "Cari berdasarkan seri, kode publik, nama, atau jalur. Setiap pencabutan memerlukan alasan dan tercatat."
            : can("certificates.read.cohort")
              ? "Sertifikat diterbitkan dari penilaian yang disetujui. Kode publik dapat diverifikasi pembeli."
              : "Sertifikat platform dengan kode verifikasi publik, plus Kartu Karya yang membuka ruang penjual."
        }
        actions={
          can("certificates.manage") ? (
            <Button
              variant="outline"
              onClick={() =>
                toast("Registry diekspor", {
                  description: "CSV 6 sertifikat disiapkan, tautan berlaku 15 menit.",
                })
              }
            >
              Ekspor registry
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
        mine.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {mine.map((cert) => (
              <CertificateCard key={cert.id} certificate={cert} />
            ))}
            <Panel eyebrow="Cakupan penjual" title="Satu sertifikat, satu jalur" className="lg:col-span-2">
              <p className="max-w-3xl text-[12px] leading-relaxed text-ink-soft">
                Sertifikat Batik Tulis Soga hanya membuka penjualan karya batik pada
                jalur itu. Sertifikat pranatacara tidak membuka karya batik, dan
                sebaliknya. Setiap karya mencantumkan jalur dan sertifikat asalnya.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {works
                  .filter((work) => work.maker === "Anisa Rahmawati")
                  .map((work) => (
                    <Link
                      key={work.id}
                      href="/ruang/karya"
                      className="inline-flex min-h-11 items-center gap-2 border border-ink/20 px-3 text-[10.5px] font-semibold hover:border-ink/40"
                    >
                      {work.title}
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </Link>
                  ))}
              </div>
            </Panel>
          </div>
        ) : (
          <Panel eyebrow="Kredensial" title="Belum ada sertifikat">
            <p className="text-[12px] leading-relaxed text-ink-soft">
              Sertifikat terbit setelah tugas terakhir disetujui pengajar. Setelah
              terbit, ruang penjual terbuka untuk jalur tersebut.
            </p>
            <Button asChild size="sm" className="mt-3">
              <Link href="/ruang/tugas">Buka tugas</Link>
            </Button>
          </Panel>
        )
      ) : null}

      {active === "cohort" ? (
        <Panel eyebrow="Kohort" title="Sertifikat peserta" bodyClassName="p-0">
          <DataTable
            rows={cohortCerts}
            columns={certificateColumns(setSelected)}
            caption="Sertifikat peserta pada kohort yang diampu"
            searchPlaceholder="Cari peserta, seri, atau jalur"
            getSearchText={(row) => `${row.student} ${row.serial} ${row.pathTitle}`}
            minWidth={780}
          />
        </Panel>
      ) : null}

      {active === "registry" ? (
        <Panel eyebrow="Registry" title="Semua sertifikat" bodyClassName="p-0">
          <DataTable
            rows={certificates}
            columns={certificateColumns(setSelected)}
            caption="Registry sertifikat dengan status, jalur, dan pengajar"
            searchPlaceholder="Cari seri, kode publik, nama, atau jalur"
            getSearchText={(row) =>
              `${row.serial} ${row.publicCode} ${row.student} ${row.pathTitle} ${row.teacher}`
            }
            filters={[
              {
                id: "status",
                label: "Status",
                options: [
                  { value: "all", label: "Semua", count: certificates.length },
                  { value: "issued", label: "Terbit", count: 4 },
                  { value: "revoked", label: "Dicabut", count: 1 },
                  { value: "replaced", label: "Diganti", count: 1 },
                ],
              },
              {
                id: "path",
                label: "Jalur",
                options: [
                  { value: "all", label: "Semua" },
                  { value: "batik", label: "Batik" },
                  { value: "pranatacara", label: "Pranatacara" },
                ],
              },
            ]}
            filterRow={(row, values) => {
              const statusOk =
                !values.status || values.status === "all" || row.status === values.status
              const pathOk =
                !values.path ||
                values.path === "all" ||
                (values.path === "batik" && row.pathId === "batik-tulis-soga") ||
                (values.path === "pranatacara" && row.pathId === "pranatacara-jawa")
              return statusOk && pathOk
            }}
            minWidth={900}
            footer={
              <p>
                Registry bersifat append-only. Penggantian membuat seri baru; seri
                lama berstatus diganti.
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
        title={selected?.student ?? ""}
        stamp={selected?.statusLabel}
        tone={selected?.tone}
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
                variant="destructive"
                onClick={() => setRevokeTarget(selected)}
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
                { label: "Pengajar", value: selected.teacher },
                { label: "Terbit", value: formatWorkspaceDate(selected.issuedAt) },
                { label: "Nilai penilaian", value: String(selected.assessmentScore) },
                { label: "Kartu Karya", value: selected.workCard },
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
                      {selected.student} · dinilai {selected.teacher}
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
              </div>
            </DrawerSection>
            {selected.status !== "issued" ? (
              <p className="mt-4 border border-destructive/30 bg-destructive/5 p-3 text-[10.5px] leading-relaxed text-[#8a2e1f]">
                Status ini terlihat publik. Pencabutan tidak menghapus riwayat;
                verifikasi menampilkan “dicabut”.
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
              Pencabutan langsung terlihat pada verifikasi publik. Tindakan ini
              tercatat di audit dan memerlukan alasan.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="revoke-reason">Alasan pencabutan</Label>
            <Textarea
              id="revoke-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 min-h-24"
              placeholder="Contoh: bukti penilaian tidak sah, permintaan pemilik, atau pelanggaran etika."
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
              onClick={() => {
                toast("Sertifikat dicabut", {
                  description: `${revokeTarget?.serial} dicabut. Alasan masuk ke audit.`,
                })
                setRevokeTarget(null)
                setReason("")
                setSelected(null)
              }}
            >
              Cabut dengan alasan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CertificateCard({ certificate }: { certificate: Certificate }) {
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
            {certificate.student} · dinilai {certificate.teacher}
          </p>
        </div>
        <span className="flex size-16 shrink-0 items-center justify-center border border-ink/30 bg-paper">
          <QrCode className="size-11 text-ink" aria-hidden="true" />
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-ink/15 py-3 text-[10px]">
        <div>
          <dt className="font-bold uppercase tracking-[0.08em] text-ink-muted">Seri</dt>
          <dd className="mt-1 font-semibold">{certificate.serial}</dd>
        </div>
        <div>
          <dt className="font-bold uppercase tracking-[0.08em] text-ink-muted">Kode publik</dt>
          <dd className="mt-1 font-semibold">{certificate.publicCode}</dd>
        </div>
        <div>
          <dt className="font-bold uppercase tracking-[0.08em] text-ink-muted">Kartu Karya</dt>
          <dd className="mt-1 font-semibold">{certificate.workCard}</dd>
        </div>
        <div>
          <dt className="font-bold uppercase tracking-[0.08em] text-ink-muted">Terbit</dt>
          <dd className="mt-1 font-semibold">{formatWorkspaceDate(certificate.issuedAt)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[10.5px] leading-relaxed text-ink-soft">
        {certificate.scope}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            toast("Tautan verifikasi disalin", {
              description: `kalanidhi.site/verifikasi/${certificate.publicCode}`,
            })
          }
        >
          <Copy aria-hidden="true" />
          Salin tautan
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            toast("PDF disiapkan", {
              description: "Unduhan sertifikat memakai tautan bertanda tangan.",
            })
          }
        >
          <Download aria-hidden="true" />
          Unduh PDF
        </Button>
      </div>
      <StatusStamp
        label={certificate.statusLabel}
        tone={certificate.tone}
        className="absolute -top-2 right-3 bg-paper-2"
      />
    </article>
  )
}

function certificateColumns(
  onSelect: (row: Certificate) => void,
): Column<Certificate>[] {
  return [
    {
      id: "student",
      header: "Pemegang",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.student}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">{row.serial}</p>
        </div>
      ),
    },
    {
      id: "path",
      header: "Jalur",
      cell: (row) => (
        <span className="text-[11px] leading-snug text-ink-soft">{row.pathTitle}</span>
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
          {formatWorkspaceDate(row.issuedAt)}
        </span>
      ),
      className: "hidden xl:table-cell",
      headClassName: "hidden xl:table-cell",
    },
    {
      id: "score",
      header: "Nilai",
      cell: (row) => (
        <span className="font-heading text-sm tabular-nums">{row.assessmentScore}</span>
      ),
      align: "center",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusStamp label={row.statusLabel} tone={row.tone} />,
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
