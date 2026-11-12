"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery } from "convex/react"
import {
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/convex/_generated/api"
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
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { SegmentedTabs } from "@/components/workspace/data/segmented-tabs"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import {
  formatCommerceDateTime,
  PAYMENT_STATUS_LABELS,
} from "@/lib/commerce/format"
import type { PaymentEventView, PaymentIntentView } from "@/lib/commerce/types"
import type { StatusTone } from "@/lib/workspace/types"
import { formatIDR } from "@/lib/format"

function intentTone(intent: PaymentIntentView): StatusTone {
  if (intent.status === "paid") return "done"
  if (intent.reconciliationState === "late" || intent.reconciliationState === "unmatched") {
    return "danger"
  }
  if (intent.status === "pending") return "wait"
  return "muted"
}

function intentLabel(intent: PaymentIntentView): string {
  if (intent.reconciliationState === "late") return "Terlambat"
  if (intent.reconciliationState === "unmatched") return "Belum cocok"
  return PAYMENT_STATUS_LABELS[intent.status] ?? intent.status
}

export function PaymentConsoleLive() {
  const reconciliation = useQuery(api.payments.getReconciliation, {})
  const events = useQuery(api.payments.listPaymentEvents, {})
  const health = useQuery(api.payments.getGatewayHealth, {})
  const manualMatch = useMutation(api.payments.manualMatch)
  const expireIntents = useMutation(api.payments.expireIntents)

  const [tab, setTab] = React.useState("intents")
  const [selected, setSelected] = React.useState<PaymentIntentView | null>(null)
  const [match, setMatch] = React.useState<PaymentIntentView | null>(null)
  const [transactionId, setTransactionId] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [probing, setProbing] = React.useState(false)

  const intents = reconciliation?.intents ?? []
  const unmatched = intents.filter(
    (intent) =>
      intent.reconciliationState === "late" ||
      intent.reconciliationState === "unmatched" ||
      (intent.status === "pending" && intent.isLate),
  )
  const late = intents.filter(
    (intent) =>
      intent.reconciliationState === "late" ||
      (intent.status === "pending" && intent.isLate),
  )
  const pendingCount = reconciliation?.pendingCount ?? 0
  const paidTotal = reconciliation?.paidTotal ?? 0

  async function run(task: () => Promise<unknown>, message: string) {
    setPending(true)
    try {
      await task()
      toast(message)
      setMatch(null)
      setSelected(null)
      setReason("")
      setTransactionId("")
    } catch (error) {
      const data =
        typeof error === "object" && error && "data" in error
          ? (error as { data?: { message?: string } }).data
          : undefined
      toast("Tindakan belum dapat dijalankan", {
        description: data?.message ?? "Periksa data mutasi dan status intent.",
      })
    } finally {
      setPending(false)
    }
  }

  async function probeHealth() {
    setProbing(true)
    try {
      const response = await fetch("/api/payments/health", { method: "POST" })
      const data = (await response.json()) as { ok?: boolean }
      toast(data.ok ? "Gerbang sehat" : "Gerbang tidak sehat", {
        description: data.ok
          ? "Status sesi merchant dicatat di integration health."
          : "Periksa sesi merchant dan koneksi jaringan internal.",
      })
    } catch {
      toast("Probe gagal", { description: "Rute kesehatan tidak dapat dihubungi." })
    } finally {
      setProbing(false)
    }
  }

  const metrics = [
    {
      label: "GMV lunas",
      value: formatIDR(paidTotal),
      note: `${reconciliation?.paidCount ?? 0} intent lunas`,
      tone: "done" as StatusTone,
    },
    {
      label: "Intent menunggu",
      value: String(pendingCount),
      note: `${late.length} melewati masa berlaku`,
      tone: "wait" as StatusTone,
    },
    {
      label: "Belum cocok",
      value: String(reconciliation?.unmatchedCount ?? 0),
      note: "perlu tindakan manual",
      tone: "danger" as StatusTone,
    },
    {
      label: "Kedaluwarsa",
      value: String(reconciliation?.expiredCount ?? 0),
      note: "tetap di antrean rekonsiliasi",
      tone: "muted" as StatusTone,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pesanan · pembayaran"
        title="Gerbang pembayaran dan rekonsiliasi."
        description="Intent, nilai unik, mutasi masuk, dan kesehatan sesi merchant. Setiap pencocokan manual menyimpan bukti, alasan, dan aktor."
        actions={
          <>
            <Button variant="outline" onClick={probeHealth} disabled={probing}>
              <RefreshCw aria-hidden="true" className={probing ? "animate-spin" : undefined} />
              Periksa gerbang
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(() => expireIntents({}), "Intent kedaluwarsa ditandai")
              }
            >
              Tandai kedaluwarsa
            </Button>
          </>
        }
      />

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="border border-ink/20 bg-paper-2 p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-muted">
              {metric.label}
            </p>
            <p className="mt-2 font-heading text-xl text-ink">{metric.value}</p>
            <p className="mt-1 text-[10px] text-ink-muted">{metric.note}</p>
            <div className="mt-2">
              <StatusStamp label={metric.label} tone={metric.tone} />
            </div>
          </div>
        ))}
      </div>

      <SegmentedTabs
        tabs={[
          { id: "intents", label: "Payment intents", count: intents.length },
          { id: "reconcile", label: "Rekonsiliasi", count: unmatched.length },
          { id: "health", label: "Kesehatan gerbang" },
          { id: "events", label: "Peristiwa provider", count: events?.length },
        ]}
        value={tab}
        onChange={setTab}
        ariaLabel="Pilih tampilan pembayaran"
      />

      {tab === "intents" ? (
        <Panel eyebrow="Intent" title="Semua payment intent" bodyClassName="p-0">
          <DataTable
            rows={intents}
            columns={intentColumns(setSelected, (intent) => setMatch(intent), true)}
            caption="Payment intent dengan order, provider, nilai unik, kedaluwarsa, dan status"
            searchPlaceholder="Cari order, referensi, atau provider"
            getSearchText={(row) =>
              `${row.orderCode} ${row.providerReference ?? ""} ${row.provider} ${row.status}`
            }
            filters={[
              {
                id: "status",
                label: "Status",
                options: [
                  { value: "all", label: "Semua", count: intents.length },
                  { value: "pending", label: "Menunggu" },
                  { value: "paid", label: "Lunas" },
                  { value: "expired", label: "Kedaluwarsa" },
                  { value: "failed", label: "Gagal" },
                ],
              },
            ]}
            filterRow={(row, values) =>
              !values.status || values.status === "all" || row.status === values.status
            }
            minWidth={900}
            footer={
              <p>
                Nilai unik ditambahkan ke nominal dasar agar transfer dapat
                dicocokkan tanpa menebak. Selisih bukan pendapatan.
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
            title="Mutasi dan intent bermasalah"
            bodyClassName="p-0"
          >
            <DataTable
              rows={unmatched}
              columns={intentColumns(setSelected, (intent) => setMatch(intent), true)}
              caption="Intent yang belum cocok atau melewati masa berlaku"
              searchPlaceholder="Cari order atau referensi"
              getSearchText={(row) => `${row.orderCode} ${row.providerReference ?? ""}`}
              emptyTitle="Semua transfer sudah cocok"
              emptyDescription="Antrean rekonsiliasi kosong. Mutasi baru akan muncul di sini."
              minWidth={820}
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
                disabled={unmatched.length === 0}
                onClick={() => setMatch(unmatched[0] ?? null)}
              >
                Mulai pencocokan
              </Button>
            </Panel>
            <Panel eyebrow="Panduan" title="Tiga pemeriksaan">
              <ol className="space-y-2.5">
                {[
                  ["Nominal", "Nilai unik harus sama sampai rupiah terakhir."],
                  [
                    "Waktu",
                    "Transfer masuk sebelum intent kedaluwarsa atau dalam toleransi 60 menit.",
                  ],
                  ["Identitas", "Nama pengirim dan order harus dapat dihubungkan."],
                ].map(([title, note]) => (
                  <li key={title} className="flex gap-2">
                    <span className="mt-1 size-1.5 shrink-0 bg-copper-dark" />
                    <div>
                      <p className="text-[11px] font-semibold text-ink">{title}</p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-ink-muted">
                        {note}
                      </p>
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
          {[
            {
              label: "Status gerbang",
              status: health?.status ?? "unknown",
              note: health?.message ?? "Belum ada probe.",
              done: health?.status === "healthy",
            },
            {
              label: "Sesi merchant",
              status: health?.status === "healthy" ? "Aktif" : "Perlu diperiksa",
              note: "Sesi disimpan terenkripsi di gerbang.",
              done: health?.status === "healthy",
            },
            {
              label: "Intent menunggu",
              status: String(health?.pendingIntents ?? 0),
              note: "Dihitung dari catatan Convex.",
              done: (health?.pendingIntents ?? 0) < 10,
            },
            {
              label: "Terakhir diperiksa",
              status: formatCommerceDateTime(health?.checkedAt),
              note: `Latensi ${health?.latencyMs ?? "—"} ms`,
              done: Boolean(health?.checkedAt),
            },
            {
              label: "Settlement terakhir",
              status: formatCommerceDateTime(health?.lastSettledAt),
              note: "Settlement hanya dari webhook terverifikasi.",
              done: Boolean(health?.lastSettledAt),
            },
          ].map((item) => (
            <Panel key={item.label} eyebrow="Gerbang" title={item.label}>
              <div className="flex items-start gap-2">
                {item.done ? (
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-moss"
                    aria-hidden="true"
                  />
                ) : (
                  <TriangleAlert
                    className="mt-0.5 size-4 shrink-0 text-[#8a5a16]"
                    aria-hidden="true"
                  />
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
        <Panel eyebrow="Provider" title="Peristiwa terakhir" bodyClassName="p-0">
          <DataTable
            rows={events ?? []}
            columns={eventColumns}
            caption="Peristiwa pembayaran terakhir dengan jenis, order, dan nominal"
            searchPlaceholder="Cari event atau order"
            getSearchText={(row) => `${row.eventId} ${row.orderCode ?? ""} ${row.kind}`}
            emptyTitle="Belum ada peristiwa"
            emptyDescription="Peristiwa webhook dan rekonsiliasi akan muncul di sini."
            minWidth={680}
          />
        </Panel>
      ) : null}

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        eyebrow="Payment intent"
        title={selected?.orderCode ?? ""}
        stamp={selected ? intentLabel(selected) : undefined}
        tone={selected ? intentTone(selected) : undefined}
        description={selected?.workTitle}
        footer={
          selected ? (
            <div className="flex flex-wrap gap-2">
              {selected.status === "pending" || selected.status === "expired" ? (
                <Button size="sm" onClick={() => setMatch(selected)}>
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
                { label: "Pembeli", value: selected.buyerName },
                { label: "Provider", value: selected.provider },
                { label: "Referensi", value: selected.providerReference ?? "—" },
                { label: "Nominal dasar", value: formatIDR(selected.baseAmount) },
                { label: "Nilai unik", value: formatIDR(selected.uniqueAmount) },
                {
                  label: "Biaya gerbang",
                  value:
                    selected.gatewayFee === null
                      ? "Belum dilaporkan"
                      : formatIDR(selected.gatewayFee),
                },
                { label: "Dibuat", value: formatCommerceDateTime(selected.createdAt) },
                {
                  label: "Kedaluwarsa",
                  value: formatCommerceDateTime(selected.expiresAt),
                },
                { label: "Dibayar", value: formatCommerceDateTime(selected.paidAt) },
              ]}
            />
            {selected.reconciliationReason ? (
              <DrawerSection title="Catatan rekonsiliasi">
                <p className="border-l-2 border-brass pl-3 text-[11.5px] leading-relaxed text-ink-soft">
                  {selected.reconciliationReason}
                </p>
              </DrawerSection>
            ) : null}
            <DrawerSection title="Risiko">
              <p className="flex items-start gap-2 text-[10.5px] leading-relaxed text-ink-muted">
                <ShieldCheck
                  className="mt-0.5 size-3.5 shrink-0 text-moss"
                  aria-hidden="true"
                />
                Jangan mengubah nilai unik setelah intent dibuat. Koreksi
                finansial memakai entri pembalik, bukan edit baris.
              </p>
            </DrawerSection>
          </>
        ) : null}
      </DetailDrawer>

      <Dialog
        open={Boolean(match)}
        onOpenChange={(open) => {
          if (!open) {
            setMatch(null)
            setReason("")
            setTransactionId("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cocokkan {match?.orderCode}</DialogTitle>
            <DialogDescription>
              Cocokkan intent dengan mutasi yang sudah diverifikasi. Nominal
              harus sama dengan nilai unik {match ? formatIDR(match.uniqueAmount) : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="match-transaction">ID transaksi provider / mutasi</Label>
              <Input
                id="match-transaction"
                value={transactionId}
                onChange={(event) => setTransactionId(event.target.value)}
                className="mt-1.5"
                placeholder="TRX-…"
              />
            </div>
            <div>
              <Label htmlFor="match-amount">Nominal</Label>
              <Input
                id="match-amount"
                value={match ? String(match.uniqueAmount) : ""}
                readOnly
                className="mt-1.5 tabular-nums"
              />
            </div>
            <div>
              <Label htmlFor="match-reason">Bukti dan alasan</Label>
              <Textarea
                id="match-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-1.5 min-h-24"
                placeholder="Misalnya: mutasi BCA 1.450.037 pukul 09.18, nama pengirim cocok."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatch(null)}>
              Batal
            </Button>
            <Button
              disabled={
                pending ||
                !match ||
                reason.trim().length < 8 ||
                transactionId.trim().length < 4
              }
              onClick={() =>
                match
                  ? run(
                      () =>
                        manualMatch({
                          paymentId: match.id as never,
                          providerTransactionId: transactionId.trim(),
                          amount: match.uniqueAmount,
                          reason,
                        }),
                      "Pembayaran dicocokkan",
                    )
                  : undefined
              }
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
  onSelect: (row: PaymentIntentView) => void,
  onMatch: (row: PaymentIntentView) => void,
  canManage: boolean,
): Column<PaymentIntentView>[] {
  return [
    {
      id: "intent",
      header: "Intent",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.orderCode}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">{row.buyerName}</p>
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
            {row.providerReference ?? row.providerTransactionId ?? "—"}
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
      id: "base",
      header: "Dasar",
      cell: (row) => (
        <span className="text-[10.5px] tabular-nums text-ink-muted">
          {formatIDR(row.baseAmount)}
        </span>
      ),
      align: "right",
      className: "hidden lg:table-cell",
      headClassName: "hidden lg:table-cell",
    },
    {
      id: "expires",
      header: "Kedaluwarsa",
      cell: (row) => (
        <span className="text-[10px] text-ink-muted">
          {formatCommerceDateTime(row.expiresAt)}
        </span>
      ),
      className: "hidden xl:table-cell",
      headClassName: "hidden xl:table-cell",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusStamp label={intentLabel(row)} tone={intentTone(row)} />,
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-0.5">
          {canManage && (row.status === "pending" || row.status === "expired") ? (
            <Button size="sm" variant="ghost" onClick={() => onMatch(row)}>
              Cocokkan
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => onSelect(row)}>
            Buka
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ]
}

const eventColumns: Column<PaymentEventView>[] = [
  {
    id: "event",
    header: "Peristiwa",
    cell: (row) => (
      <div>
        <p className="font-semibold text-ink">{row.kind}</p>
        <p className="mt-0.5 max-w-64 truncate text-[9.5px] text-ink-muted">
          {row.eventId}
        </p>
      </div>
    ),
  },
  {
    id: "order",
    header: "Pesanan",
    cell: (row) => <span className="text-[11px]">{row.orderCode ?? "—"}</span>,
  },
  {
    id: "amount",
    header: "Nominal",
    cell: (row) => (
      <span className="text-[11px] tabular-nums">
        {row.amount ? formatIDR(row.amount) : "—"}
      </span>
    ),
    align: "right",
  },
  {
    id: "at",
    header: "Waktu",
    cell: (row) => (
      <span className="text-[10px] text-ink-muted">
        {formatCommerceDateTime(row.createdAt)}
      </span>
    ),
  },
]

