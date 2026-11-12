"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery } from "convex/react"
import { ArrowRight, CreditCard, RotateCcw } from "lucide-react"
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
import { EmptyState } from "@/components/workspace/data/empty-state"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { SegmentedTabs } from "@/components/workspace/data/segmented-tabs"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import {
  DISPUTE_STATUS_LABELS,
  formatCommerceDateTime,
  ORDER_STATUS_LABELS,
  REFUND_STATUS_LABELS,
} from "@/lib/commerce/format"
import type {
  DisputeView,
  OrderView,
  RefundView,
} from "@/lib/commerce/types"
import type { StatusTone } from "@/lib/workspace/types"
import { formatIDR } from "@/lib/format"

function orderTone(status: string): StatusTone {
  if (status === "completed" || status === "paid") return "done"
  if (status === "disputed") return "danger"
  if (status === "cancelled" || status === "refunded") return "muted"
  if (status === "in_progress" || status === "delivered") return "progress"
  return "wait"
}

function refundTone(status: string): StatusTone {
  if (status === "paid") return "done"
  if (status === "rejected") return "danger"
  if (status === "approved") return "progress"
  return "wait"
}

type DialogState =
  | { kind: "cancel"; order: OrderView }
  | { kind: "dispute"; order: OrderView }
  | { kind: "correct"; order: OrderView }
  | { kind: "refund"; order: OrderView }
  | { kind: "resolve"; dispute: DisputeView }
  | { kind: "review-refund"; refund: RefundView; decision: "approved" | "rejected" }
  | { kind: "pay-refund"; refund: RefundView }

export function OrdersLive() {
  const { can, viewer } = useViewer()
  const orders = useQuery(api.commerce.listOrders, {})
  const refunds = useQuery(api.payouts.listRefunds, {})
  const disputes = useQuery(api.commerce.listOrderDisputes, {})

  const startOrder = useMutation(api.commerce.startOrder)
  const deliverOrder = useMutation(api.commerce.deliverOrder)
  const completeOrder = useMutation(api.commerce.completeOrder)
  const cancelOrder = useMutation(api.commerce.cancelOrder)
  const correctStatus = useMutation(api.commerce.correctOrderStatus)
  const openDispute = useMutation(api.commerce.openOrderDispute)
  const reviewDispute = useMutation(api.commerce.reviewOrderDispute)
  const resolveDispute = useMutation(api.commerce.resolveOrderDispute)
  const closeDispute = useMutation(api.commerce.closeOrderDispute)
  const requestRefund = useMutation(api.payouts.requestRefund)
  const reviewRefund = useMutation(api.payouts.reviewRefund)
  const payRefund = useMutation(api.payouts.payRefund)

  const [tab, setTab] = React.useState(can("orders.read.all") ? "all" : "buy")
  const [selected, setSelected] = React.useState<OrderView | null>(null)
  const [dialog, setDialog] = React.useState<DialogState | null>(null)
  const [reason, setReason] = React.useState("")
  const [statusTarget, setStatusTarget] = React.useState("delivered")
  const [refundAmount, setRefundAmount] = React.useState("")
  const [evidence, setEvidence] = React.useState("")
  const [pending, setPending] = React.useState(false)

  const rows = orders ?? []
  const myPurchases = rows.filter((order) => order.buyerUserId === viewer?.userId)
  const mySales = rows.filter((order) => order.sellerId === viewer?.userId)
  const disputeRows = refunds ?? []
  const disputeQueue = disputes ?? []

  const tabs = [
    can("orders.buy") && {
      id: "buy",
      label: "Pembelian",
      count: myPurchases.length,
    },
    can("orders.sell") && { id: "sell", label: "Penjualan", count: mySales.length },
    can("orders.read.all") && {
      id: "all",
      label: "Semua pesanan",
      count: rows.length,
    },
    (can("orders.read.all") || can("orders.buy")) && {
      id: "dispute",
      label: "Refund & sengketa",
      count: disputeRows.length + disputeQueue.length,
    },
  ].filter(Boolean) as { id: string; label: string; count?: number }[]

  const active = tabs.some((item) => item.id === tab) ? tab : tabs[0]?.id ?? "buy"
  const visible =
    active === "buy" ? myPurchases : active === "sell" ? mySales : rows
  const gross = visible
    .filter(
      (order) =>
        !["awaiting_payment", "draft", "cancelled"].includes(order.status),
    )
    .reduce((sum, order) => sum + order.baseAmount, 0)

  function closeDialog() {
    setDialog(null)
    setReason("")
    setEvidence("")
    setRefundAmount("")
  }

  async function run(task: () => Promise<unknown>, message: string) {
    setPending(true)
    try {
      await task()
      toast(message)
      closeDialog()
      setSelected(null)
    } catch (error) {
      const data =
        typeof error === "object" && error && "data" in error
          ? (error as { data?: { message?: string } }).data
          : undefined
      toast("Tindakan belum dapat dijalankan", {
        description: data?.message ?? "Periksa status pesanan.",
      })
    } finally {
      setPending(false)
    }
  }

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
        description="Data pesanan berasal dari Convex. Koreksi manual dan keputusan refund memerlukan alasan serta tercatat di audit."
        actions={
          can("payments.manage") ? (
            <Button asChild>
              <Link href="/ruang/pesanan/pembayaran">
                <CreditCard aria-hidden="true" />
                Rekonsiliasi
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-2.5 sm:grid-cols-3">
        {[
          ["Nilai diproses", formatIDR(gross), `${visible.length} pesanan`],
          [
            "Menunggu pembayaran",
            String(visible.filter((order) => order.status === "awaiting_payment").length),
            "pesanan",
          ],
          [
            "Refund & sengketa",
            String(
              disputeRows.filter((row) => row.status !== "paid").length +
                disputeQueue.filter((row) => row.status !== "closed").length,
            ),
            "terbuka pada tampilan",
          ],
        ].map(([label, value, note]) => (
          <div key={label} className="border border-ink/20 bg-paper-2 p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-muted">
              {label}
            </p>
            <p className="mt-2 font-heading text-2xl text-ink">{value}</p>
            <p className="mt-1 text-[10px] text-ink-muted">{note}</p>
          </div>
        ))}
      </div>

      <SegmentedTabs
        tabs={tabs}
        value={active}
        onChange={setTab}
        ariaLabel="Pilih tampilan pesanan"
      />

      {active === "dispute" ? (
        <div className="space-y-4">
          <Panel eyebrow="Refund" title="Permintaan refund" bodyClassName="p-0">
            <DataTable
              rows={disputeRows}
              columns={refundColumns(
                can("payments.manage"),
                (refund, decision) =>
                  setDialog({ kind: "review-refund", refund, decision }),
                (refund) => setDialog({ kind: "pay-refund", refund }),
              )}
              caption="Permintaan refund dengan pesanan, nilai, status, dan keputusan"
              searchPlaceholder="Cari kode pesanan atau pembeli"
              getSearchText={(row) =>
                `${row.orderCode} ${row.buyerName} ${row.status}`
              }
              emptyTitle="Belum ada permintaan refund"
              emptyDescription="Pembeli dapat mengajukan refund dari detail pesanan yang sudah dibayar."
              minWidth={860}
            />
          </Panel>

          <Panel eyebrow="Sengketa" title="Sengketa pesanan" bodyClassName="p-0">
            <DataTable
              rows={disputeQueue}
              columns={disputeColumns(
                can("orders.read.all"),
                (dispute) =>
                  run(
                    () => reviewDispute({ disputeId: dispute.id as never }),
                    "Sengketa mulai ditinjau",
                  ),
                (dispute) => setDialog({ kind: "resolve", dispute }),
                (dispute) =>
                  run(
                    () => closeDispute({ disputeId: dispute.id as never }),
                    "Sengketa ditutup",
                  ),
              )}
              caption="Sengketa pesanan dengan pembuka, alasan, dan status"
              searchPlaceholder="Cari kode pesanan atau pembuka"
              getSearchText={(row) => `${row.orderCode} ${row.reason} ${row.status}`}
              emptyTitle="Tidak ada sengketa"
              emptyDescription="Sengketa yang dibuka pembeli atau penjual muncul di sini."
              minWidth={760}
            />
          </Panel>
        </div>
      ) : orders === undefined ? (
        <Panel eyebrow="Pesanan" title="Memuat pesanan">
          <p className="text-[11.5px] text-ink-soft">Mengambil data Convex…</p>
        </Panel>
      ) : visible.length === 0 ? (
        <EmptyState
          title={active === "sell" ? "Belum ada penjualan" : "Belum ada pesanan"}
          description={
            active === "sell"
              ? "Pesanan yang dibayar akan muncul di sini beserta status payout."
              : "Pembelian dan pesanan yang diklaim dengan email terverifikasi muncul di sini."
          }
        />
      ) : (
        <Panel
          eyebrow={active === "sell" ? "Penjualan" : "Pesanan"}
          title={
            active === "sell"
              ? "Pesanan karya dan jasa"
              : active === "all"
                ? "Semua pesanan"
                : "Daftar pembelian"
          }
          bodyClassName="p-0"
        >
          <DataTable
            rows={visible}
            columns={orderColumns(
              setSelected,
              can("orders.read.all"),
              (order) => {
                setSelected(order)
                setDialog({ kind: "correct", order })
                setStatusTarget("delivered")
              },
            )}
            caption="Daftar pesanan dengan pembeli, penjual, nilai, status, dan kanal"
            searchPlaceholder="Cari kode, pembeli, atau karya"
            getSearchText={(row) =>
              `${row.code} ${row.buyerName} ${row.sellerName} ${row.workTitle} ${row.status}`
            }
            filters={[
              {
                id: "status",
                label: "Status",
                options: [
                  { value: "all", label: "Semua", count: visible.length },
                  { value: "paid", label: "Dibayar" },
                  { value: "delivered", label: "Dikirim" },
                  { value: "completed", label: "Selesai" },
                  { value: "awaiting_payment", label: "Menunggu" },
                  { value: "disputed", label: "Sengketa" },
                  { value: "refunded", label: "Refund" },
                ],
              },
            ]}
            filterRow={(row, values) =>
              !values.status || values.status === "all" || row.status === values.status
            }
            minWidth={860}
            footer={
              <p>
                {visible.length} pesanan · nilai {formatIDR(gross)}. Baris ledger
                tidak diedit; koreksi memakai entri pembalik.
              </p>
            }
          />
        </Panel>
      )}

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        eyebrow="Pesanan"
        title={selected?.code ?? ""}
        stamp={selected ? ORDER_STATUS_LABELS[selected.status] : undefined}
        tone={selected ? orderTone(selected.status) : undefined}
        description={selected?.workTitle}
        footer={
          selected ? (
            <div className="flex flex-wrap gap-2">
              {selected.sellerId === viewer?.userId && selected.status === "paid" ? (
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => startOrder({ orderId: selected.id as never }),
                      "Pesanan mulai diproses",
                    )
                  }
                >
                  Mulai proses
                </Button>
              ) : null}
              {selected.sellerId === viewer?.userId &&
              selected.status === "in_progress" ? (
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => deliverOrder({ orderId: selected.id as never }),
                      "Pesanan ditandai terkirim",
                    )
                  }
                >
                  Tandai terkirim
                </Button>
              ) : null}
              {selected.buyerUserId === viewer?.userId &&
              selected.status === "delivered" ? (
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => completeOrder({ orderId: selected.id as never }),
                      "Pesanan selesai",
                    )
                  }
                >
                  Konfirmasi selesai
                </Button>
              ) : null}
              {["draft", "awaiting_payment"].includes(selected.status) ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDialog({ kind: "cancel", order: selected })}
                >
                  Batalkan
                </Button>
              ) : null}
              {selected.buyerUserId === viewer?.userId &&
              ["paid", "in_progress", "delivered", "completed"].includes(
                selected.status,
              ) ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDialog({ kind: "refund", order: selected })}
                  >
                    <RotateCcw aria-hidden="true" />
                    Ajukan refund
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDialog({ kind: "dispute", order: selected })}
                  >
                    Buka sengketa
                  </Button>
                </>
              ) : null}
              {can("payments.manage") ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDialog({ kind: "correct", order: selected })}
                >
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
                { label: "Pembeli", value: selected.buyerName },
                { label: "Kontak", value: selected.buyerEmail },
                { label: "Penjual", value: selected.sellerName },
                { label: "Karya", value: selected.workTitle },
                { label: "Harga dasar", value: formatIDR(selected.baseAmount) },
                {
                  label: "Nominal unik",
                  value: selected.uniqueAmount
                    ? formatIDR(selected.uniqueAmount)
                    : "Belum dibuat",
                },
                { label: "Kanal", value: selected.channel },
                { label: "Dibuat", value: formatCommerceDateTime(selected.createdAt) },
                { label: "Pembayaran", value: selected.paymentStatus ?? "Belum" },
                { label: "Payout", value: selected.payoutId ?? "Belum dijadwalkan" },
                {
                  label: "Dibatalkan",
                  value: selected.cancelledAt
                    ? formatCommerceDateTime(selected.cancelledAt)
                    : "—",
                },
                {
                  label: "Alasan batal",
                  value: selected.cancelReason ?? "—",
                },
                {
                  label: "Versi persetujuan",
                  value: selected.consentVersion ?? "Belum diisi",
                },
                {
                  label: "Persetujuan",
                  value: selected.consentAt
                    ? formatCommerceDateTime(selected.consentAt)
                    : "Belum diisi",
                },
              ]}
            />
            <DrawerSection title="Rincian pesanan">
              {selected.items.length === 0 ? (
                <p className="text-[10.5px] text-ink-muted">
                  Rincian baris belum tercatat untuk pesanan ini.
                </p>
              ) : (
                <ul className="space-y-2 text-[10.5px]">
                  {selected.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 border-b border-ink/10 pb-2 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-semibold text-ink">{item.title}</p>
                        <p className="mt-0.5 text-ink-muted">
                          {item.quantity} × {formatIDR(item.unitAmount)}
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums">
                        {formatIDR(item.totalAmount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </DrawerSection>
            <DrawerSection title="Jejak">
              <ol className="space-y-2 text-[10.5px]">
                {[
                  ["Dibuat", selected.createdAt],
                  ["Dibayar", selected.paidAt],
                  ["Dikirim", selected.deliveredAt],
                  ["Selesai", selected.completedAt],
                  ["Diklaim", selected.claimedAt],
                ]
                  .filter(([, value]) => Boolean(value))
                  .map(([label, value]) => (
                    <li key={String(label)} className="flex justify-between gap-3">
                      <span className="text-ink-muted">{label}</span>
                      <span className="font-semibold">
                        {formatCommerceDateTime(Number(value))}
                      </span>
                    </li>
                  ))}
              </ol>
            </DrawerSection>
            {selected.status === "disputed" ? (
              <p className="mt-4 border border-destructive/30 bg-destructive/5 p-3 text-[10.5px] leading-relaxed text-ink-soft">
                Sengketa terbuka. Payout terkait ditahan sampai keputusan
                pengelola.
              </p>
            ) : null}
          </>
        ) : null}
      </DetailDrawer>

      <Dialog
        open={Boolean(dialog)}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.kind === "cancel"
                ? "Batalkan pesanan"
                : dialog?.kind === "dispute"
                  ? "Buka sengketa"
                  : dialog?.kind === "refund"
                    ? "Ajukan refund"
                    : dialog?.kind === "resolve"
                      ? "Selesaikan sengketa"
                      : dialog?.kind === "review-refund"
                        ? dialog.decision === "approved"
                          ? "Setujui refund"
                          : "Tolak refund"
                        : dialog?.kind === "pay-refund"
                          ? "Bayar refund"
                          : "Koreksi status"}{" "}
              {dialog && "order" in dialog
                ? dialog.order.code
                : dialog && "refund" in dialog
                  ? dialog.refund.orderCode
                  : ""}
            </DialogTitle>
            <DialogDescription>
              {dialog?.kind === "correct"
                ? "Koreksi manual tidak dapat menandai pesanan lunas. Pembayaran hanya sah melalui settlement terverifikasi."
                : dialog?.kind === "refund"
                  ? "Refund diproses terpisah dari status pembayaran. Payout yang sudah cair dicatat sebagai saldo negatif."
                  : "Alasan wajib diisi minimal 8 karakter dan masuk audit."}
            </DialogDescription>
          </DialogHeader>

          {dialog?.kind === "correct" ? (
            <div>
              <Label htmlFor="order-target">Status tujuan</Label>
              <select
                id="order-target"
                value={statusTarget}
                onChange={(event) => setStatusTarget(event.target.value)}
                className="mt-1.5 min-h-11 w-full border border-ink/25 bg-paper-2 px-2 text-[11px]"
              >
                <option value="in_progress">Diproses</option>
                <option value="delivered">Dikirim</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Dibatalkan</option>
                <option value="disputed">Sengketa</option>
              </select>
            </div>
          ) : null}

          {dialog?.kind === "refund" ? (
            <>
              <div>
                <Label htmlFor="refund-amount">Nilai refund (rupiah)</Label>
                <Input
                  id="refund-amount"
                  type="number"
                  min={1}
                  max={dialog.order.baseAmount}
                  value={refundAmount}
                  onChange={(event) => setRefundAmount(event.target.value)}
                  placeholder={String(dialog.order.baseAmount)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="refund-evidence">Bukti (opsional)</Label>
                <Textarea
                  id="refund-evidence"
                  value={evidence}
                  onChange={(event) => setEvidence(event.target.value)}
                  className="mt-1.5 min-h-16"
                  placeholder="Misalnya: foto kerusakan dan percakapan."
                />
              </div>
            </>
          ) : null}

          {dialog?.kind === "resolve" ? (
            <div>
              <Label htmlFor="resolve-order-status">Status pesanan setelah sengketa</Label>
              <select
                id="resolve-order-status"
                value={statusTarget}
                onChange={(event) => setStatusTarget(event.target.value)}
                className="mt-1.5 min-h-11 w-full border border-ink/25 bg-paper-2 px-2 text-[11px]"
              >
                <option value="delivered">Dikirim</option>
                <option value="completed">Selesai</option>
              </select>
            </div>
          ) : null}

          <div>
            <Label htmlFor="order-reason">
              {dialog?.kind === "resolve" ? "Keputusan" : "Alasan"}
            </Label>
            <Textarea
              id="order-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1.5 min-h-24"
              placeholder="Tulis alasan yang dapat diperiksa ulang."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Batal
            </Button>
            <Button
              disabled={pending || reason.trim().length < 8}
              onClick={() => {
                if (!dialog) return
                if (dialog.kind === "cancel") {
                  void run(
                    () =>
                      cancelOrder({
                        orderId: dialog.order.id as never,
                        reason,
                      }),
                    "Pesanan dibatalkan",
                  )
                } else if (dialog.kind === "dispute") {
                  void run(
                    () =>
                      openDispute({
                        orderId: dialog.order.id as never,
                        reason,
                      }),
                    "Sengketa dibuka",
                  )
                } else if (dialog.kind === "refund") {
                  void run(
                    () =>
                      requestRefund({
                        orderId: dialog.order.id as never,
                        amount: refundAmount
                          ? Number(refundAmount)
                          : dialog.order.baseAmount,
                        reason,
                        evidence: evidence || undefined,
                      }),
                    "Permintaan refund dikirim",
                  )
                } else if (dialog.kind === "review-refund") {
                  void run(
                    () =>
                      reviewRefund({
                        refundId: dialog.refund.id as never,
                        decision: dialog.decision,
                        reason,
                      }),
                    dialog.decision === "approved"
                      ? "Refund disetujui"
                      : "Refund ditolak",
                  )
                } else if (dialog.kind === "pay-refund") {
                  void run(
                    () =>
                      payRefund({
                        refundId: dialog.refund.id as never,
                        reason,
                      }),
                    "Refund ditandai dibayar",
                  )
                } else if (dialog.kind === "correct") {
                  void run(
                    () =>
                      correctStatus({
                        orderId: dialog.order.id as never,
                        status: statusTarget as
                          | "in_progress"
                          | "delivered"
                          | "completed"
                          | "cancelled"
                          | "disputed",
                        reason,
                      }),
                    "Status pesanan dikoreksi",
                  )
                } else {
                  void run(
                    () =>
                      resolveDispute({
                        disputeId: dialog.dispute.id as never,
                        resolution: reason,
                        orderStatus: statusTarget as "delivered" | "completed",
                      }),
                    "Sengketa diselesaikan",
                  )
                }
              }}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function orderColumns(
  onSelect: (row: OrderView) => void,
  canCorrect: boolean,
  onCorrect: (row: OrderView) => void,
): Column<OrderView>[] {
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
          <p className="text-[11.5px]">{row.buyerName}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">{row.channel}</p>
        </div>
      ),
    },
    {
      id: "amount",
      header: "Nilai",
      cell: (row) => (
        <span className="text-[11px] font-medium tabular-nums">
          {formatIDR(row.baseAmount)}
        </span>
      ),
      align: "right",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <StatusStamp
          label={ORDER_STATUS_LABELS[row.status] ?? row.status}
          tone={orderTone(row.status)}
        />
      ),
    },
    {
      id: "date",
      header: "Dibuat",
      cell: (row) => (
        <span className="text-[10.5px] text-ink-muted">
          {formatCommerceDateTime(row.createdAt)}
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

function refundColumns(
  canManage: boolean,
  onReview: (refund: RefundView, decision: "approved" | "rejected") => void,
  onPay: (refund: RefundView) => void,
): Column<RefundView>[] {
  return [
    {
      id: "order",
      header: "Pesanan",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.orderCode}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">{row.workTitle}</p>
        </div>
      ),
    },
    {
      id: "buyer",
      header: "Pembeli",
      cell: (row) => <span className="text-[11.5px]">{row.buyerName}</span>,
    },
    {
      id: "amount",
      header: "Refund",
      cell: (row) => (
        <span className="text-[11px] tabular-nums">
          {formatIDR(row.amount)} / {formatIDR(row.baseAmount)}
        </span>
      ),
      align: "right",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <StatusStamp
          label={REFUND_STATUS_LABELS[row.status] ?? row.status}
          tone={refundTone(row.status)}
        />
      ),
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (row) =>
        canManage ? (
          <div className="flex items-center justify-end gap-0.5">
            {row.status === "requested" || row.status === "reviewing" ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onReview(row, "approved")}
                >
                  Setujui
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onReview(row, "rejected")}
                >
                  Tolak
                </Button>
              </>
            ) : null}
            {row.status === "approved" ? (
              <Button size="sm" variant="ghost" onClick={() => onPay(row)}>
                Bayar
              </Button>
            ) : null}
          </div>
        ) : null,
    },
  ]
}

function disputeColumns(
  canManage: boolean,
  onReview: (dispute: DisputeView) => void,
  onResolve: (dispute: DisputeView) => void,
  onClose: (dispute: DisputeView) => void,
): Column<DisputeView>[] {
  return [
    {
      id: "order",
      header: "Pesanan",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.orderCode}</p>
          <p className="mt-0.5 max-w-64 truncate text-[10px] text-ink-muted">
            {row.reason}
          </p>
        </div>
      ),
    },
    {
      id: "opener",
      header: "Dibuka oleh",
      cell: (row) => <span className="text-[11.5px]">{row.openerName}</span>,
    },
    {
      id: "assignee",
      header: "Ditangani",
      cell: (row) => (
        <span className="text-[11.5px]">
          {row.assigneeName ?? "Belum ditangani"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <StatusStamp
          label={DISPUTE_STATUS_LABELS[row.status] ?? row.status}
          tone={row.status === "closed" || row.status === "resolved" ? "done" : "wait"}
        />
      ),
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (row) =>
        canManage ? (
          <div className="flex items-center justify-end gap-0.5">
            {row.status === "open" ? (
              <Button size="sm" variant="ghost" onClick={() => onReview(row)}>
                Tinjau
              </Button>
            ) : null}
            {row.status === "reviewing" ? (
              <Button size="sm" variant="ghost" onClick={() => onResolve(row)}>
                Selesaikan
              </Button>
            ) : null}
            {row.status === "resolved" ? (
              <Button size="sm" variant="ghost" onClick={() => onClose(row)}>
                Tutup
              </Button>
            ) : null}
          </div>
        ) : null,
    },
  ]
}
