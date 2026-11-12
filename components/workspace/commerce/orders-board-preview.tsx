"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, CreditCard, Download, ReceiptText, RotateCcw } from "lucide-react"
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
import { MetricStrip } from "@/components/workspace/data/metric-ruler"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { SegmentedTabs } from "@/components/workspace/data/segmented-tabs"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import { adminMetrics, orders } from "@/lib/workspace/mock-data"
import type { Order } from "@/lib/workspace/types"
import { formatIDR } from "@/lib/format"
import { formatWorkspaceDateTime } from "@/lib/workspace/format"

export function OrdersPreview() {
  const { can } = useViewer()
  const [tab, setTab] = React.useState(can("orders.read.all") ? "all" : "buy")
  const [selected, setSelected] = React.useState<Order | null>(null)
  const [correction, setCorrection] = React.useState<Order | null>(null)
  const [reason, setReason] = React.useState("")

  const tabs = [
    can("orders.buy") && { id: "buy", label: "Pembelian", count: 3 },
    can("orders.sell") && { id: "sell", label: "Penjualan", count: 4 },
    can("orders.read.all") && {
      id: "all",
      label: "Semua pesanan",
      count: orders.length,
    },
    can("orders.read.all") && {
      id: "dispute",
      label: "Refund & sengketa",
      count: orders.filter((item) => ["disputed", "refunded"].includes(item.status)).length,
    },
  ].filter(Boolean) as { id: string; label: string; count?: number }[]

  const active = tabs.some((item) => item.id === tab) ? tab : tabs[0]?.id
  const rows =
    active === "buy"
      ? orders.filter((item) => ["Bayu Pratama", "Maya Kartika", "Nadia Kusuma"].includes(item.buyer))
      : active === "sell"
        ? orders.filter((item) => item.seller === "Anisa Rahmawati")
        : active === "dispute"
          ? orders.filter((item) => ["disputed", "refunded"].includes(item.status))
          : orders

  const gross = rows
    .filter((item) => !["refunded", "awaiting_payment"].includes(item.status))
    .reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pesanan"
        title={
          can("orders.read.all")
            ? "Pesanan, uang, dan penyelesaian."
            : can("orders.sell")
              ? "Pesanan dan pendapatan."
              : "Pembelian dan tanda terima."
        }
        description={
          can("orders.read.all")
            ? "Semua pesanan lintas pembeli, penjual, dan kanal. Koreksi status manual memerlukan alasan."
            : can("orders.sell")
              ? "Pesanan karya dan jasa, status pengiriman, serta bagi hasil 70%."
              : "Pesanan yang kamu bayar, status pembayaran, dan tanda terima."
        }
        actions={
          can("payments.manage") ? (
            <Button asChild>
              <Link href="/ruang/pesanan/pembayaran">
                <CreditCard aria-hidden="true" />
                Rekonsiliasi
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() =>
                toast("Tanda terima diekspor", {
                  description: "PDF disiapkan untuk pesanan yang sudah dibayar.",
                })
              }
            >
              <Download aria-hidden="true" />
              Unduh tanda terima
            </Button>
          )
        }
      />

      {can("orders.read.all") ? (
        <MetricStrip metrics={adminMetrics.slice(0, 3)} />
      ) : null}

      <SegmentedTabs
        tabs={tabs}
        value={active ?? "buy"}
        onChange={setTab}
        ariaLabel="Pilih tampilan pesanan"
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-8"
          eyebrow={active === "sell" ? "Penjualan" : "Pesanan"}
          title={
            active === "sell"
              ? "Pesanan karya dan jasa"
              : active === "dispute"
                ? "Refund dan sengketa terbuka"
                : "Daftar pesanan"
          }
          bodyClassName="p-0"
        >
          <DataTable
            rows={rows}
            columns={orderColumns(setSelected, can("payments.manage"), setCorrection)}
            caption="Daftar pesanan dengan pembeli, penjual, nilai, status, dan kanal"
            searchPlaceholder="Cari kode, pembeli, atau karya"
            getSearchText={(row) =>
              `${row.code} ${row.buyer} ${row.seller} ${row.workTitle} ${row.statusLabel}`
            }
            filters={[
              {
                id: "status",
                label: "Status",
                options: [
                  { value: "all", label: "Semua", count: rows.length },
                  { value: "paid", label: "Dibayar" },
                  { value: "delivered", label: "Dikirim" },
                  { value: "awaiting_payment", label: "Menunggu" },
                  { value: "completed", label: "Selesai" },
                  { value: "disputed", label: "Sengketa" },
                ],
              },
              {
                id: "channel",
                label: "Kanal",
                options: [
                  { value: "all", label: "Semua" },
                  { value: "web", label: "Web" },
                  { value: "whatsapp", label: "WhatsApp" },
                  { value: "institusi", label: "Institusi" },
                ],
              },
            ]}
            filterRow={(row, values) => {
              const statusOk =
                !values.status || values.status === "all" || row.status === values.status
              const channelOk =
                !values.channel || values.channel === "all" || row.channel === values.channel
              return statusOk && channelOk
            }}
            minWidth={800}
            footer={
              <p>
                {rows.length} pesanan ·{" "}
                <span className="font-semibold text-ink">
                  {formatIDR(gross)}
                </span>{" "}
                nilai diproses
              </p>
            }
          />
        </Panel>

        <div className="space-y-4 xl:col-span-4">
          <Panel eyebrow="Ringkasan" title={active === "sell" ? "Pendapatan" : "Nilai pesanan"}>
            <p className="font-heading text-3xl leading-none text-ink">
              {formatIDR(gross)}
            </p>
            <p className="mt-1.5 text-[10.5px] text-ink-muted">
              {rows.length} pesanan pada tampilan ini
            </p>
            {active === "sell" ? (
              <>
                <div className="mt-4 flex h-5 border border-ink/25" aria-hidden="true">
                  <span className="h-full bg-copper-dark" style={{ width: "70%" }} />
                  <span className="h-full bg-ink" style={{ width: "15%" }} />
                  <span className="h-full bg-moss" style={{ width: "15%" }} />
                </div>
                <div className="mt-2 flex justify-between text-[8px] font-bold uppercase tracking-[0.05em] text-ink-muted">
                  <span>Pengrajin 70%</span>
                  <span>Platform 15%</span>
                  <span>Komunitas 15%</span>
                </div>
                <p className="mt-3 border-t border-ink/15 pt-2.5 text-[10.5px] text-ink-soft">
                  Bagian pengrajin:{" "}
                  <strong className="text-ink">{formatIDR(Math.round(gross * 0.7))}</strong>
                </p>
              </>
            ) : (
              <dl className="mt-4 space-y-2 border-t border-ink/15 pt-3">
                <div className="flex justify-between gap-2 text-[11px]">
                  <dt className="text-ink-muted">Menunggu pembayaran</dt>
                  <dd className="font-semibold">
                    {formatIDR(
                      rows
                        .filter((item) => item.status === "awaiting_payment")
                        .reduce((sum, item) => sum + item.amount, 0),
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 text-[11px]">
                  <dt className="text-ink-muted">Sengketa terbuka</dt>
                  <dd className="font-semibold">
                    {orderCount(rows, "disputed")} pesanan
                  </dd>
                </div>
                <div className="flex justify-between gap-2 text-[11px]">
                  <dt className="text-ink-muted">Refund</dt>
                  <dd className="font-semibold">{orderCount(rows, "refunded")} pesanan</dd>
                </div>
              </dl>
            )}
          </Panel>
          <Panel eyebrow="Pintasan" title="Tindakan">
            <div className="grid gap-1.5">
              <Button asChild variant="outline" size="sm" className="justify-start">
                <Link href="/ruang/pesanan/pembayaran">
                  <CreditCard aria-hidden="true" />
                  Payment intents dan rekonsiliasi
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="justify-start">
                <Link href="/ruang/pesanan/payout">
                  <ReceiptText aria-hidden="true" />
                  Ledger payout 70/15/15
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="justify-start">
                <Link href="/ruang/pesan">Tanya pembeli</Link>
              </Button>
            </div>
          </Panel>
        </div>
      </div>

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        eyebrow="Pesanan"
        title={selected?.code ?? ""}
        stamp={selected?.statusLabel}
        tone={selected?.tone}
        description={selected?.workTitle}
        footer={
          selected ? (
            <div className="flex flex-wrap gap-2">
              {selected.paymentId ? (
                <Button asChild size="sm" variant="outline">
                  <Link href="/ruang/pesanan/pembayaran">Lihat pembayaran</Link>
                </Button>
              ) : null}
              {selected.payoutId ? (
                <Button asChild size="sm" variant="outline">
                  <Link href="/ruang/pesanan/payout">Lihat payout</Link>
                </Button>
              ) : null}
              {can("payments.manage") ? (
                <Button size="sm" onClick={() => setCorrection(selected)}>
                  Koreksi status
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
                { label: "Pembeli", value: selected.buyer },
                { label: "Kontak", value: selected.buyerContact },
                { label: "Penjual", value: selected.seller },
                { label: "Karya", value: selected.workTitle },
                { label: "Nilai", value: formatIDR(selected.amount) },
                { label: "Kanal", value: selected.channel },
                { label: "Dibuat", value: formatWorkspaceDateTime(selected.createdAt) },
                { label: "Pembayaran", value: selected.paymentId ?? "Belum dibuat" },
                { label: "Payout", value: selected.payoutId ?? "Belum dijadwalkan" },
              ]}
            />
            <DrawerSection title="Catatan operasi">
              <p className="text-[11.5px] leading-relaxed text-ink-soft">
                {selected.note ?? "Tidak ada catatan tambahan pada pesanan ini."}
              </p>
            </DrawerSection>
            {selected.status === "disputed" ? (
              <div className="mt-4 border border-destructive/30 bg-destructive/5 p-3">
                <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#8a2e1f]">
                  <RotateCcw className="size-3" aria-hidden="true" />
                  Sengketa terbuka
                </p>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-soft">
                  Payout terkait ditahan. Refund tidak dijalankan sampai bukti kedua
                  pihak lengkap.
                </p>
              </div>
            ) : null}
          </>
        ) : null}
      </DetailDrawer>

      <Dialog
        open={Boolean(correction)}
        onOpenChange={(open) => {
          if (!open) {
            setCorrection(null)
            setReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Koreksi {correction?.code}</DialogTitle>
            <DialogDescription>
              Perubahan status manual memerlukan alasan, aktor, dan waktu. Ledger
              keuangan tidak diedit; koreksi finansial memakai entri pembalik.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="order-reason">Alasan koreksi</Label>
            <Textarea
              id="order-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 min-h-24"
              placeholder="Contoh: pembayaran terlambat terverifikasi melalui mutasi bank."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrection(null)}>
              Batal
            </Button>
            <Button
              disabled={reason.trim().length < 8}
              onClick={() => {
                toast("Koreksi dicatat", {
                  description: `${correction?.code} diperbarui. Audit menyimpan status sebelum dan sesudah.`,
                })
                setCorrection(null)
                setReason("")
              }}
            >
              Simpan koreksi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function orderCount(rows: Order[], status: Order["status"]) {
  return rows.filter((item) => item.status === status).length
}

function orderColumns(
  onSelect: (row: Order) => void,
  canCorrect: boolean,
  onCorrect: (row: Order) => void,
): Column<Order>[] {
  return [
    {
      id: "code",
      header: "Pesanan",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.code}</p>
          <p className="mt-0.5 max-w-52 truncate text-[10px] text-ink-muted">
            {row.workTitle}
          </p>
        </div>
      ),
    },
    {
      id: "buyer",
      header: "Pembeli",
      cell: (row) => (
        <div>
          <p className="text-[11.5px]">{row.buyer}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">{row.channel}</p>
        </div>
      ),
    },
    {
      id: "amount",
      header: "Nilai",
      cell: (row) => (
        <span className="text-[11px] font-medium tabular-nums">
          {formatIDR(row.amount)}
        </span>
      ),
      align: "right",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusStamp label={row.statusLabel} tone={row.tone} />,
    },
    {
      id: "date",
      header: "Dibuat",
      cell: (row) => (
        <span className="text-[10.5px] text-ink-muted">
          {formatWorkspaceDateTime(row.createdAt)}
        </span>
      ),
      className: "hidden xl:table-cell",
      headClassName: "hidden xl:table-cell",
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-0.5">
          {canCorrect ? (
            <Button size="sm" variant="ghost" onClick={() => onCorrect(row)}>
              Koreksi
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
