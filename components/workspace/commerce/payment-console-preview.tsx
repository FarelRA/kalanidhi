"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  Download,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DataTable, type Column } from "@/components/workspace/data/data-table"
import {
  DetailDrawer,
  DetailGrid,
  DrawerSection,
} from "@/components/workspace/data/detail-drawer"
import { MetricStrip } from "@/components/workspace/data/metric-ruler"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { SegmentedTabs } from "@/components/workspace/data/segmented-tabs"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import {
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
} from "@/lib/commerce/options"
import { gatewayHealth, paymentIntents } from "@/lib/workspace/mock-data"
import type { Metric, PaymentIntent } from "@/lib/workspace/types"
import { formatIDR } from "@/lib/format"
import { formatWorkspaceDateTime } from "@/lib/workspace/format"

const paymentMetrics: Metric[] = [
  {
    id: "today",
    label: "Lunas hari ini",
    value: "Rp3,4 jt",
    note: "3 transaksi · 2 provider",
    delta: "+1",
    direction: "up",
    series: [1, 2, 2, 1, 3, 2, 4, 3, 2, 4, 3, 3],
  },
  {
    id: "pending",
    label: "Intent menunggu",
    value: "7",
    note: "2 mendekati kedaluwarsa",
    delta: "+1",
    direction: "flat",
    series: [4, 5, 6, 5, 7, 6, 7, 8, 7, 6, 7, 7],
  },
  {
    id: "unmatched",
    label: "Belum cocok",
    value: "2",
    note: "perlu tindakan manual",
    delta: "0",
    direction: "flat",
    series: [0, 1, 0, 1, 1, 2, 1, 2, 2, 1, 2, 2],
  },
  {
    id: "success",
    label: "Keberhasilan gerbang",
    value: "99,2%",
    note: "30 hari · 1.284 transaksi",
    delta: "-0,3%",
    direction: "down",
    series: [98, 99, 100, 99, 99, 100, 99, 98, 100, 99, 99, 99],
  },
]

export function PaymentConsolePreview() {
  const [tab, setTab] = React.useState("intents")
  const [selected, setSelected] = React.useState<PaymentIntent | null>(null)
  const [matchTarget, setMatchTarget] = React.useState<PaymentIntent | null>(null)
  const [reason, setReason] = React.useState("")
  const [orderCode, setOrderCode] = React.useState("")

  const unmatched = paymentIntents.filter((item) => !item.matched)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pesanan · pembayaran"
        title="Gerbang pembayaran dan rekonsiliasi."
        description="Intent, nilai unik, mutasi masuk, dan kesehatan sesi merchant. Setiap pencocokan manual menyimpan bukti, alasan, dan aktor."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                toast("Polling dijalankan", {
                  description: "Provider diperiksa. 7 intent menunggu, 0 galat baru.",
                })
              }
            >
              <RefreshCw aria-hidden="true" />
              Polling sekarang
            </Button>
            <Button
              onClick={() =>
                toast("Rekonsiliasi diekspor", {
                  description: "CSV 7 intent dan 2 mutasi belum cocok disiapkan.",
                })
              }
            >
              <Download aria-hidden="true" />
              Ekspor
            </Button>
          </>
        }
      />

      <MetricStrip metrics={paymentMetrics} />

      <SegmentedTabs
        tabs={[
          { id: "intents", label: "Payment intents", count: paymentIntents.length },
          { id: "reconcile", label: "Rekonsiliasi", count: unmatched.length },
          { id: "health", label: "Kesehatan gerbang" },
          { id: "events", label: "Peristiwa provider" },
        ]}
        value={tab}
        onChange={setTab}
        ariaLabel="Pilih tampilan pembayaran"
      />

      {tab === "intents" ? (
        <Panel eyebrow="Intent" title="Semua payment intent" bodyClassName="p-0">
          <DataTable
            rows={paymentIntents}
            columns={intentColumns(setSelected)}
            caption="Payment intent dengan order, provider, nilai unik, kedaluwarsa, dan status"
            searchPlaceholder="Cari order, referensi, atau provider"
            getSearchText={(row) =>
              `${row.orderCode} ${row.reference} ${row.provider} ${row.statusLabel}`
            }
            filters={[
              {
                id: "status",
                label: "Status",
                options: [
                  { value: "all", label: "Semua", count: paymentIntents.length },
                  ...PAYMENT_STATUSES.map((status) => ({
                    value: status,
                    label: PAYMENT_STATUS_LABELS[status],
                  })),
                ],
              },
              {
                id: "provider",
                label: "Provider",
                options: [
                  { value: "all", label: "Semua" },
                  ...Array.from(
                    new Set(paymentIntents.map((item) => item.provider)),
                  ).map((provider) => ({
                    value: provider,
                    label: provider,
                  })),
                ],
              },
            ]}
            filterRow={(row, values) => {
              const statusOk =
                !values.status || values.status === "all" || row.status === values.status
              const providerOk =
                !values.provider || values.provider === "all" || row.provider === values.provider
              return statusOk && providerOk
            }}
            minWidth={860}
            footer={
              <p>
                Nilai unik ditambahkan ke nominal dasar agar transfer dapat
                dicocokkan tanpa menebak.
              </p>
            }
          />
        </Panel>
      ) : null}

      {tab === "reconcile" ? (
        <div className="grid gap-4 xl:grid-cols-12">
          <Panel
            className="xl:col-span-8"
            eyebrow="Rekonsiliasi"
            title="Mutasi belum cocok"
            bodyClassName="p-0"
          >
            <DataTable
              rows={unmatched}
              columns={intentColumns(setSelected)}
              caption="Intent yang belum cocok dengan mutasi"
              searchPlaceholder="Cari order atau referensi"
              getSearchText={(row) => `${row.orderCode} ${row.reference}`}
              emptyTitle="Semua transfer sudah cocok"
              emptyDescription="Antrean rekonsiliasi kosong. Mutasi baru akan muncul di sini."
              minWidth={760}
            />
          </Panel>
          <div className="space-y-4 xl:col-span-4">
            <Panel eyebrow="Tindakan" title="Cocokkan manual">
              <p className="text-[11.5px] leading-relaxed text-ink-soft">
                Cocokkan hanya setelah mutasi bank atau provider terverifikasi.
                Nominal unik dan bukti transfer wajib cocok.
              </p>
              <Button
                className="mt-3 w-full"
                onClick={() => {
                  setMatchTarget(unmatched[0] ?? null)
                  setOrderCode(unmatched[0]?.orderCode ?? "")
                }}
              >
                Mulai pencocokan
              </Button>
            </Panel>
            <Panel eyebrow="Panduan" title="Tiga pemeriksaan">
              <ol className="space-y-2.5">
                {[
                  ["Nominal", "Nilai unik harus sama sampai rupiah terakhir."],
                  ["Waktu", "Transfer masuk sebelum intent kedaluwarsa atau dalam toleransi 60 menit."],
                  ["Identitas", "Nama pengirim dan order harus dapat dihubungkan."],
                ].map(([title, note]) => (
                  <li key={title} className="flex gap-2">
                    <span className="mt-1 size-1.5 shrink-0 bg-copper-dark" />
                    <div>
                      <p className="text-[11px] font-semibold text-ink">{title}</p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-ink-muted">{note}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>
        </div>
      ) : null}

      {tab === "health" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {gatewayHealth.map((item) => (
            <Panel key={item.id} eyebrow="Gerbang" title={item.label}>
              <div className="flex items-start gap-2">
                {item.tone === "done" ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-moss" aria-hidden="true" />
                ) : (
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[#8a5a16]" aria-hidden="true" />
                )}
                <div>
                  <p className="font-heading text-lg leading-tight text-ink">
                    {item.status}
                  </p>
                  <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">
                    {item.note}
                  </p>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      ) : null}

      {tab === "events" ? (
        <Panel eyebrow="Provider" title="Peristiwa terakhir">
          <ol className="relative ml-2 border-l border-ink/20 pl-5">
            {[
              ["09.58", "intent.created", "QRIS · pay-2206 · Rp375.221", "info"],
              ["09.18", "transfer.received", "BCA · Rp850.137 · belum cocok", "warning"],
              ["09.12", "poll.timeout", "GoPay · 8 detik · percobaan 1", "error"],
              ["09.05", "webhook.delivered", "ORD-1039 · delivered", "info"],
              ["08.44", "intent.paid", "Transfer · pay-2201 · Rp2.500.311", "info"],
            ].map(([time, action, detail, severity]) => (
              <li key={`${time}-${action}`} className="relative pb-4 last:pb-0">
                <span
                  aria-hidden="true"
                  className={`absolute top-1 -left-[25px] size-2 border border-paper-2 ${
                    severity === "error"
                      ? "bg-[#9a3423]"
                      : severity === "warning"
                        ? "bg-brass"
                        : "bg-moss"
                  }`}
                />
                <p className="text-[11px] font-semibold text-ink">{action}</p>
                <p className="mt-0.5 text-[10px] text-ink-muted">{detail}</p>
                <p className="mt-0.5 text-[8.5px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                  {time}
                </p>
              </li>
            ))}
          </ol>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/ruang/log">
              Buka log pembayaran
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </Panel>
      ) : null}

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        eyebrow="Payment intent"
        title={selected?.id ?? ""}
        stamp={selected?.statusLabel}
        tone={selected?.tone}
        description={selected?.orderCode}
        footer={
          selected ? (
            <div className="flex flex-wrap gap-2">
              {!selected.matched ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setMatchTarget(selected)
                    setOrderCode(selected.orderCode)
                  }}
                >
                  Cocokkan manual
                </Button>
              ) : null}
              <Button asChild size="sm" variant="outline">
                <Link href="/ruang/pesanan">Buka pesanan</Link>
              </Button>
            </div>
          ) : undefined
        }
      >
        {selected ? (
          <>
            <DetailGrid
              items={[
                { label: "Order", value: selected.orderCode },
                { label: "Provider", value: selected.provider },
                { label: "Referensi", value: selected.reference },
                { label: "Nominal dasar", value: formatIDR(selected.amount) },
                { label: "Nilai unik", value: formatIDR(selected.uniqueAmount) },
                { label: "Dibuat", value: formatWorkspaceDateTime(selected.createdAt) },
                { label: "Kedaluwarsa", value: formatWorkspaceDateTime(selected.expiresAt) },
                { label: "Cocok", value: selected.matched ? "Ya" : "Belum" },
              ]}
            />
            {selected.note ? (
              <DrawerSection title="Catatan">
                <p className="border-l-2 border-brass pl-3 text-[11.5px] leading-relaxed text-ink-soft">
                  {selected.note}
                </p>
              </DrawerSection>
            ) : null}
            <DrawerSection title="Risiko">
              <p className="flex items-start gap-2 text-[10.5px] leading-relaxed text-ink-muted">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-moss" aria-hidden="true" />
                Jangan pernah mengubah nilai unik setelah intent dibuat. Gunakan
                entri pembalik untuk koreksi.
              </p>
            </DrawerSection>
          </>
        ) : null}
      </DetailDrawer>

      <Dialog
        open={Boolean(matchTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setMatchTarget(null)
            setReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cocokkan {matchTarget?.id}</DialogTitle>
            <DialogDescription>
              Cocokkan intent dengan mutasi yang sudah diverifikasi. Tindakan ini
              mengubah status order dan tercatat di log pembayaran.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="match-order">Kode pesanan</Label>
              <Input
                id="match-order"
                value={orderCode}
                onChange={(event) => setOrderCode(event.target.value)}
                className="mt-1.5"
                placeholder="ORD-1038"
              />
            </div>
            <div>
              <Label htmlFor="match-reason">Bukti dan alasan</Label>
              <Textarea
                id="match-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-1.5 min-h-24"
                placeholder="Contoh: mutasi BCA 850.137 pukul 09.18, nama pengirim cocok."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchTarget(null)}>
              Batal
            </Button>
            <Button
              disabled={reason.trim().length < 8 || orderCode.trim().length < 4}
              onClick={() => {
                toast("Pembayaran dicocokkan", {
                  description: `${matchTarget?.id} terhubung ke ${orderCode}. Audit mencatat bukti.`,
                })
                setMatchTarget(null)
                setReason("")
              }}
            >
              Simpan pencocokan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function intentColumns(
  onSelect: (row: PaymentIntent) => void,
): Column<PaymentIntent>[] {
  return [
    {
      id: "intent",
      header: "Intent",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.id}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">{row.orderCode}</p>
        </div>
      ),
    },
    {
      id: "provider",
      header: "Provider",
      cell: (row) => (
        <div>
          <p className="text-[11.5px] font-medium">{row.provider}</p>
          <p className="mt-0.5 max-w-44 truncate text-[9.5px] text-ink-muted">
            {row.reference}
          </p>
        </div>
      ),
    },
    {
      id: "amount",
      header: "Nilai unik",
      cell: (row) => (
        <span className="text-[11px] tabular-nums">{formatIDR(row.uniqueAmount)}</span>
      ),
      align: "right",
    },
    {
      id: "expires",
      header: "Kedaluwarsa",
      cell: (row) => (
        <span className="text-[10px] text-ink-muted">
          {formatWorkspaceDateTime(row.expiresAt)}
        </span>
      ),
      className: "hidden lg:table-cell",
      headClassName: "hidden lg:table-cell",
    },
    {
      id: "match",
      header: "Cocok",
      cell: (row) =>
        row.matched ? (
          <StatusStamp label="Cocok" tone="done" />
        ) : (
          <StatusStamp label="Belum" tone="wait" />
        ),
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
