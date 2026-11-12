"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Check, Eye, Pause, Plus, ShieldCheck } from "lucide-react"
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
import { works } from "@/lib/workspace/mock-data"
import type { WorkItem } from "@/lib/workspace/types"
import { formatIDR } from "@/lib/format"
import { formatWorkspaceDate } from "@/lib/workspace/format"

export function WorksPreview() {
  const { can } = useViewer()
  const [tab, setTab] = React.useState(can("works.moderate") ? "review" : "mine")
  const [selected, setSelected] = React.useState<WorkItem | null>(null)
  const [pauseTarget, setPauseTarget] = React.useState<WorkItem | null>(null)
  const [reason, setReason] = React.useState("")

  const tabs = [
    (can("works.own") || can("works.review")) && {
      id: "mine",
      label: can("works.review") ? "Karya peserta" : "Karya saya",
    },
    (can("works.moderate") || can("works.review")) && {
      id: "review",
      label: "Menunggu tinjauan",
      count: works.filter((item) => ["review", "paused"].includes(item.status)).length,
    },
    can("works.moderate") && {
      id: "catalog",
      label: "Semua karya",
      count: works.length,
    },
  ].filter(Boolean) as { id: string; label: string; count?: number }[]

  const active = tabs.some((item) => item.id === tab) ? tab : tabs[0]?.id
  const myWorks = works.filter((item) => item.maker === "Anisa Rahmawati")

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Karya & Kartu Karya"
        title={
          can("works.moderate")
            ? "Moderasi karya dan jasa."
            : can("works.review")
              ? "Karya peserta yang kamu ampu."
              : "Karya yang kamu bawa ke pembeli."
        }
        description={
          can("works.moderate")
            ? "Periksa asal-usul, izin sumber budaya, teknik, dan bagi hasil sebelum karya tayang."
            : can("works.review")
              ? "Konfirmasi bahwa karya berasal dari proses belajar dan izin sumbernya tercatat."
              : "Setiap karya membawa jalur, sertifikat, dan Kartu Karya. Ruang jual terbuka dari sertifikat."
        }
        actions={
          can("sell") ? (
            <Button
              onClick={() =>
                toast("Karya baru", {
                  description: "Formulir karya baru dibuka dengan unggahan aman.",
                })
              }
            >
              <Plus aria-hidden="true" />
              Buat karya
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/ruang/kredensial">Cek cakupan penjual</Link>
            </Button>
          )
        }
      />

      <SegmentedTabs
        tabs={tabs}
        value={active ?? "mine"}
        onChange={setTab}
        ariaLabel="Pilih tampilan karya"
      />

      {active === "mine" ? (
        can("sell") ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-8">
              {myWorks.map((work) => (
                <WorkRow key={work.id} work={work} onSelect={setSelected} />
              ))}
              {myWorks.length === 0 ? (
                <EmptyState
                  title="Belum ada karya"
                  description="Sertifikatmu sudah membuka ruang jual. Mulai dari satu karya dengan foto proses yang lengkap."
                  action={<Button size="sm">Buat karya pertama</Button>}
                />
              ) : null}
            </div>
            <div className="space-y-4 lg:col-span-4">
              <Panel eyebrow="Kesiapan" title="Checklist penjual">
                <ul className="space-y-2.5">
                  {[
                    ["Rekening payout", "Terverifikasi", true],
                    ["Izin sumber budaya", "Tercatat", true],
                    ["Kartu Karya", "10 foto bertanggal", true],
                    ["Pajak penjual", "Belum diisi", false],
                  ].map(([label, note, done]) => (
                    <li key={String(label)} className="flex items-start gap-2.5">
                      <span
                        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center border ${
                          done
                            ? "border-moss bg-moss text-paper"
                            : "border-ink/30 text-transparent"
                        }`}
                      >
                        <Check className="size-2.5" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-[11px] font-semibold text-ink">
                          {label}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-ink-muted">{note}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel eyebrow="Bagi hasil" title="70 / 15 / 15" className="bg-panel/25">
                <p className="text-[11.5px] leading-relaxed text-ink-soft">
                  Dari Rp1.450.000, pengrajin menerima Rp1.015.000. Platform dan
                  komunitas masing-masing 15% sebelum biaya gerbang.
                </p>
                <div className="mt-3 flex h-5 border border-ink/25" aria-hidden="true">
                  <span className="h-full bg-copper-dark" style={{ width: "70%" }} />
                  <span className="h-full bg-ink" style={{ width: "15%" }} />
                  <span className="h-full bg-moss" style={{ width: "15%" }} />
                </div>
                <div className="mt-2 flex justify-between text-[8px] font-bold uppercase tracking-[0.05em] text-ink-muted">
                  <span>Pengrajin 70%</span>
                  <span>Platform 15%</span>
                  <span>Komunitas 15%</span>
                </div>
              </Panel>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Ruang jual belum terbuka"
            description="Karya dan jasa bisa ditawarkan setelah sertifikat platform terbit. Selama belajar, kamu tetap bisa menyiapkan Kartu Karya."
            action={
              <Button asChild size="sm">
                <Link href="/ruang/kredensial">Lihat kredensial</Link>
              </Button>
            }
          />
        )
      ) : null}

      {active === "review" ? (
        <div className="space-y-4">
          {works
            .filter((item) => ["review", "paused"].includes(item.status))
            .map((work) => (
              <article
                key={work.id}
                className="grid gap-0 border border-ink/20 bg-paper-2 shadow-[3px_3px_0_rgba(32,19,13,0.05)] md:grid-cols-[190px_1fr]"
              >
                <div className="relative h-40 border-b border-ink/15 md:h-full md:border-r md:border-b-0">
                  {work.image ? (
                    <Image
                      src={work.image}
                      alt={work.title}
                      fill
                      sizes="190px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-copper-dark">
                        {work.workCard} · {work.pathTitle}
                      </p>
                      <h2 className="mt-1 font-heading text-[1.35rem] leading-tight text-ink">
                        {work.title}
                      </h2>
                      <p className="mt-1 text-[11px] text-ink-soft">
                        {work.maker} · {work.makerRole} · {work.teacher}
                      </p>
                    </div>
                    <StatusStamp label={work.statusLabel} tone={work.tone} />
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
                    {work.note}
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-ink/15 pt-2.5 text-[10px] sm:grid-cols-4">
                    <div>
                      <dt className="font-bold uppercase tracking-[0.06em] text-ink-muted">Harga</dt>
                      <dd className="mt-0.5 font-semibold">{formatIDR(work.price)}</dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase tracking-[0.06em] text-ink-muted">Teknik</dt>
                      <dd className="mt-0.5">{work.technique}</dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase tracking-[0.06em] text-ink-muted">Izin</dt>
                      <dd className="mt-0.5">{work.permission}</dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase tracking-[0.06em] text-ink-muted">Diajukan</dt>
                      <dd className="mt-0.5">{formatWorkspaceDate(work.submittedAt)}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelected(work)}>
                      <Eye aria-hidden="true" />
                      Periksa
                    </Button>
                    {can("works.moderate") ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            toast("Karya diterbitkan", {
                              description: `${work.title} tayang setelah izin diverifikasi.`,
                            })
                          }
                        >
                          <Check aria-hidden="true" />
                          Terbitkan
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setPauseTarget(work)}
                        >
                          Jeda
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
        </div>
      ) : null}

      {active === "catalog" ? (
        <Panel eyebrow="Katalog" title="Semua karya dan jasa" bodyClassName="p-0">
          <DataTable
            rows={works}
            columns={workColumns(setSelected)}
            caption="Semua karya dengan pembuat, jalur, harga, dan status"
            searchPlaceholder="Cari karya, pembuat, atau Kartu Karya"
            getSearchText={(row) =>
              `${row.title} ${row.maker} ${row.workCard} ${row.pathTitle} ${row.statusLabel}`
            }
            filters={[
              {
                id: "status",
                label: "Status",
                options: [
                  { value: "all", label: "Semua", count: works.length },
                  { value: "published", label: "Tayang", count: 4 },
                  { value: "review", label: "Tinjauan" },
                  { value: "paused", label: "Dijeda" },
                ],
              },
              {
                id: "kind",
                label: "Jenis",
                options: [
                  { value: "all", label: "Semua" },
                  { value: "barang", label: "Barang" },
                  { value: "jasa", label: "Jasa" },
                ],
              },
            ]}
            filterRow={(row, values) => {
              const statusOk =
                !values.status || values.status === "all" || row.status === values.status
              const kindOk =
                !values.kind ||
                values.kind === "all" ||
                (values.kind === "jasa" && row.title.includes("Pembawa Acara")) ||
                (values.kind === "barang" && !row.title.includes("Pembawa Acara"))
              return statusOk && kindOk
            }}
            minWidth={860}
          />
        </Panel>
      ) : null}

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        eyebrow="Kartu Karya"
        title={selected?.title ?? ""}
        stamp={selected?.statusLabel}
        tone={selected?.tone}
        description={selected ? `${selected.maker} · ${selected.pathTitle}` : undefined}
        footer={
          selected ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/ruang/kredensial">Sertifikat asal</Link>
              </Button>
              {can("works.moderate") && selected.status === "review" ? (
                <Button
                  size="sm"
                  onClick={() => {
                    toast("Karya diterbitkan", { description: selected.workCard })
                    setSelected(null)
                  }}
                >
                  Terbitkan karya
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
      >
        {selected ? (
          <>
            <DetailGrid
              items={[
                { label: "Pembuat", value: selected.maker },
                { label: "Peran", value: selected.makerRole },
                { label: "Pengajar", value: selected.teacher },
                { label: "Jalur", value: selected.pathTitle },
                { label: "Teknik", value: selected.technique },
                { label: "Harga", value: formatIDR(selected.price) },
                { label: "Satuan", value: selected.unit },
                { label: "Wilayah", value: selected.region },
              ]}
            />
            <DrawerSection title="Kartu Karya">
              <div className="border border-ink/25 bg-panel/30 p-3">
                <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-copper-dark">
                  {selected.workCard}
                </p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                  {selected.note ?? "Kartu Karya memuat foto proses, izin sumber, dan pembagian hasil."}
                </p>
                <div className="mt-3 flex items-center gap-2 border-t border-ink/15 pt-2 text-[9.5px] text-ink-muted">
                  <ShieldCheck className="size-3.5 text-moss" aria-hidden="true" />
                  {selected.permission}
                </div>
              </div>
            </DrawerSection>
            <DrawerSection title="Pratinjau bagi hasil">
              <div className="flex h-6 border border-ink/25" aria-hidden="true">
                <span className="h-full bg-copper-dark" style={{ width: "70%" }} />
                <span className="h-full bg-ink" style={{ width: "15%" }} />
                <span className="h-full bg-moss" style={{ width: "15%" }} />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[9.5px]">
                <p>
                  <span className="block font-bold uppercase tracking-[0.05em] text-ink-muted">
                    Pengrajin
                  </span>
                  <span className="mt-0.5 block font-semibold">
                    {formatIDR(Math.round(selected.price * 0.7))}
                  </span>
                </p>
                <p>
                  <span className="block font-bold uppercase tracking-[0.05em] text-ink-muted">
                    Platform
                  </span>
                  <span className="mt-0.5 block font-semibold">
                    {formatIDR(Math.round(selected.price * 0.15))}
                  </span>
                </p>
                <p>
                  <span className="block font-bold uppercase tracking-[0.05em] text-ink-muted">
                    Komunitas
                  </span>
                  <span className="mt-0.5 block font-semibold">
                    {formatIDR(Math.round(selected.price * 0.15))}
                  </span>
                </p>
              </div>
            </DrawerSection>
          </>
        ) : null}
      </DetailDrawer>

      <Dialog
        open={Boolean(pauseTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setPauseTarget(null)
            setReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jeda {pauseTarget?.title}</DialogTitle>
            <DialogDescription>
              Karya berhenti tampil di landing. Pesanan yang sudah dibayar tetap
              diproses. Alasan wajib tercatat.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="pause-reason">Alasan penjedaan</Label>
            <Textarea
              id="pause-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 min-h-24"
              placeholder="Contoh: dokumen izin sumber budaya perlu diperbarui."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseTarget(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={reason.trim().length < 8}
              onClick={() => {
                toast("Karya dijeda", {
                  description: `${pauseTarget?.title} tidak lagi tampil. Alasan masuk audit.`,
                })
                setPauseTarget(null)
                setReason("")
              }}
            >
              <Pause aria-hidden="true" />
              Jeda karya
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function WorkRow({
  work,
  onSelect,
}: {
  work: WorkItem
  onSelect: (work: WorkItem) => void
}) {
  return (
    <article className="flex flex-col gap-3 border border-ink/20 bg-paper-2 p-3 sm:flex-row sm:items-center">
      <div className="relative h-24 w-full shrink-0 overflow-hidden border border-ink/15 bg-panel sm:h-20 sm:w-28">
        {work.image ? (
          <Image src={work.image} alt="" fill sizes="112px" className="object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[12.5px] font-semibold text-ink">{work.title}</h2>
          <StatusStamp label={work.statusLabel} tone={work.tone} />
        </div>
        <p className="mt-1 text-[10.5px] text-ink-muted">
          {work.workCard} · {formatIDR(work.price)} · {work.technique}
        </p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => onSelect(work)}>
          Detail
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/ruang/pesanan">Pesanan</Link>
        </Button>
      </div>
    </article>
  )
}

function workColumns(onSelect: (work: WorkItem) => void): Column<WorkItem>[] {
  return [
    {
      id: "work",
      header: "Karya",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.title}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">{row.workCard}</p>
        </div>
      ),
    },
    {
      id: "maker",
      header: "Pembuat",
      cell: (row) => (
        <div>
          <p className="text-[11.5px]">{row.maker}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">{row.teacher}</p>
        </div>
      ),
    },
    {
      id: "path",
      header: "Jalur",
      cell: (row) => (
        <span className="text-[11px] text-ink-soft">{row.pathTitle}</span>
      ),
      className: "hidden lg:table-cell",
      headClassName: "hidden lg:table-cell",
    },
    {
      id: "price",
      header: "Harga",
      cell: (row) => (
        <span className="text-[11px] tabular-nums">{formatIDR(row.price)}</span>
      ),
      align: "right",
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
