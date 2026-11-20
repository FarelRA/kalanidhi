"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery } from "convex/react"
import { ArrowRight, Lock, PauseCircle, PlayCircle, Wallet } from "lucide-react"
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
  formatCommerceDate,
  formatCommerceDateTime,
  PAYOUT_STATUS_LABELS,
} from "@/lib/commerce/format"
import {
  LEDGER_ACCOUNT_LABELS,
  LEDGER_DIRECTION_LABELS,
  LEDGER_ENTRY_TYPE_LABELS,
  PAYOUT_KIND_LABELS,
  PAYOUT_STATUSES,
  PAYOUT_STATUS_TONES,
} from "@/lib/commerce/options"
import { SPLIT_PERCENTAGES } from "@/lib/commerce/money"
import type { LedgerEntryView, PayoutView } from "@/lib/commerce/types"
import { formatIDR } from "@/lib/format"

const SPLIT_LABEL = `${SPLIT_PERCENTAGES.teacher} / ${SPLIT_PERCENTAGES.platform} / ${SPLIT_PERCENTAGES.community}`
const TEACHER_SHARE_LABEL = `${SPLIT_PERCENTAGES.teacher}%`

type PayoutAction =
  | { kind: "hold"; payout: PayoutView }
  | { kind: "reverse"; payout: PayoutView }
  | { kind: "approve"; payout: PayoutView }
  | { kind: "release"; payout: PayoutView }

type PayoutAccountRow = {
  id: string
  userId: string
  userName: string
  provider: "bank" | "gopay" | "other"
  bankCode: string
  accountName: string
  accountNumberMasked: string
  accountRef: string
  status: "pending" | "verified" | "rejected" | "suspended"
  verifiedBy: string | null
  verifiedAt: number | null
  createdAt: number
  updatedAt: number
}

const ACCOUNT_STATUS_LABELS: Record<PayoutAccountRow["status"], string> = {
  pending: "Menunggu verifikasi",
  verified: "Terverifikasi",
  rejected: "Ditolak",
  suspended: "Ditangguhkan",
}

export function PayoutLedgerLive() {
  const { can } = useViewer()
  const payouts = useQuery(api.payouts.listPayouts, {})
  const ledger = useQuery(api.payouts.listLedger, {})
  const statement = useQuery(
    api.payouts.getSellerStatement,
    can("payouts.release") ? "skip" : {},
  )
  const holdPayout = useMutation(api.payouts.holdPayout)
  const approvePayout = useMutation(api.payouts.approvePayout)
  const releasePayout = useMutation(api.payouts.releasePayout)
  const reversePayout = useMutation(api.payouts.reversePayout)
  const accounts = useQuery(api.payouts.listPayoutAccounts, {})

  const release = can("payouts.release")
  const [tab, setTab] = React.useState("payouts")
  const [selected, setSelected] = React.useState<PayoutView | null>(null)
  const [action, setAction] = React.useState<PayoutAction | null>(null)
  const [reason, setReason] = React.useState("")
  const [pending, setPending] = React.useState(false)

  const rows = payouts ?? []
  const entries = ledger ?? []
  const accountRows = (accounts ?? []) as PayoutAccountRow[]
  const saleRows = rows.filter((row) => row.kind === "sale")
  const teacherReversalsByOrder = new Map<string, number>()
  for (const entry of entries) {
    if (
      entry.account === "teacher" &&
      entry.entryType === "reversal" &&
      entry.orderId
    ) {
      teacherReversalsByOrder.set(
        entry.orderId,
        (teacherReversalsByOrder.get(entry.orderId) ?? 0) + entry.amount,
      )
    }
  }
  const totals = saleRows.reduce(
    (acc, row) => {
      if (row.status !== "reversed") {
        acc.gross += row.gross
        acc.teacher += row.teacherShare
        acc.platform += row.platformShare
        acc.community += row.communityShare
      }
      return acc
    },
    { gross: 0, teacher: 0, platform: 0, community: 0 },
  )
  // Pending must be net of refund reversals, not the original sale share.
  const pendingTotal = saleRows
    .filter((row) => ["pending", "held", "approved"].includes(row.status))
    .reduce(
      (sum, row) =>
        sum +
        row.teacherShare -
        (row.orderId ? (teacherReversalsByOrder.get(row.orderId) ?? 0) : 0),
      0,
    )
  const paidTotal = saleRows
    .filter((row) => row.status === "paid")
    .reduce((sum, row) => sum + (row.paidAmount ?? row.teacherShare), 0)

  async function run(task: () => Promise<unknown>, message: string) {
    setPending(true)
    try {
      await task()
      toast(message)
      setAction(null)
      setSelected(null)
      setReason("")
    } catch (error) {
      const data =
        typeof error === "object" && error && "data" in error
          ? (error as { data?: { message?: string } }).data
          : undefined
      toast("Tindakan belum dapat dijalankan", {
        description: data?.message ?? "Periksa status payout dan rekening.",
      })
    } finally {
      setPending(false)
    }
  }

  const needsReason = action?.kind === "hold" || action?.kind === "reverse"

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pesanan · payout"
        title={release ? `Ledger ${SPLIT_LABEL}.` : "Pendapatan dan statement."}
        description={
          release
            ? "Catatan hanya tambah. Tahan, setujui, bayar, atau balik dengan entri baru. Baris yang sudah dibayar tidak pernah diedit."
            : `Bagian pengajar ${TEACHER_SHARE_LABEL} dari setiap pesanan, status pencairan, dan statement dari ledger.`
        }
        actions={
          <Button asChild variant="outline">
            <Link href="/ruang/pesanan">
              <Wallet aria-hidden="true" />
              Lihat pesanan sumber
            </Link>
          </Button>
        }
      />

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Bruto sebelum refund",
            formatIDR(totals.gross),
            `${saleRows.length} baris, belum dikurangi pembalikan`,
          ],
          [
            "Bagian pembuat",
            formatIDR(totals.teacher),
            `${TEACHER_SHARE_LABEL} dari bruto`,
          ],
          [
            "Belum cair (neto refund)",
            formatIDR(pendingTotal),
            "menunggu / ditahan / disetujui, setelah pembalikan refund",
          ],
          ["Sudah cair", formatIDR(paidTotal), "payout berstatus dibayar"],
        ].map(([label, value, note]) => (
          <div key={label} className="border border-ink/20 bg-paper-2 p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-muted">
              {label}
            </p>
            <p className="mt-2 font-heading text-xl text-ink">{value}</p>
            <p className="mt-1 text-[10px] text-ink-muted">{note}</p>
          </div>
        ))}
      </div>

      <PayoutAccountPanel
        accounts={accountRows}
        manager={can("people.manage")}
      />

      {!release && statement ? (
        <Panel eyebrow="Rekap" title={`Ringkasan ${statement.teacherName}`}>
          <dl className="grid gap-3 sm:grid-cols-3">
            {[
              ["Penjualan bruto sebelum refund", formatIDR(statement.grossSales)],
              ["Bagian pembuat", formatIDR(statement.teacherEarned)],
              ["Bagian platform", formatIDR(statement.platformShare)],
              ["Bagian komunitas", formatIDR(statement.communityShare)],
              ["Biaya gerbang", formatIDR(statement.gatewayFees)],
              ["Sudah dibayar", formatIDR(statement.teacherPaid)],
              ["Pembalikan", formatIDR(statement.teacherReversed)],
              ["Saldo negatif", formatIDR(statement.teacherNegativeBalance)],
              ["Saldo bersih", formatIDR(statement.teacherBalance)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[9px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                  {label}
                </dt>
                <dd className="mt-1 text-[12px] font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 border-t border-ink/15 pt-3 text-[10px] leading-relaxed text-ink-muted">
            Statement dihitung dari baris ledger. Refund setelah pencairan
            muncul sebagai saldo negatif yang dibawa ke payout berikutnya.
          </p>
        </Panel>
      ) : null}

      <SegmentedTabs
        tabs={[
          { id: "payouts", label: "Payout", count: rows.length },
          { id: "ledger", label: "Baris ledger", count: entries.length },
        ]}
        value={tab}
        onChange={setTab}
        ariaLabel="Pilih tampilan payout"
      />

      {tab === "payouts" ? (
        payouts === undefined ? (
          <Panel eyebrow="Catatan" title="Memuat payout">
            <p className="text-[11.5px] text-ink-soft">Mengambil data Convex…</p>
          </Panel>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Belum ada payout"
            description={`Payout dibuat otomatis dari setiap pesanan yang lunas, dengan pembagian ${SPLIT_LABEL}.`}
          />
        ) : (
          <Panel eyebrow="Catatan" title="Baris pencairan" bodyClassName="p-0">
            <DataTable
              rows={rows}
              columns={payoutColumns(setSelected, release, setAction)}
              caption="Ledger payout dengan pembuat, periode, bruto, bagian, status, dan jatuh tempo"
              searchPlaceholder="Cari pembuat, kode, atau referensi"
              getSearchText={(row) =>
                `${row.teacherName} ${row.reference ?? ""} ${row.status}`
              }
              filters={[
                {
                  id: "status",
                  label: "Status",
                  options: [
                    { value: "all", label: "Semua", count: rows.length },
                    ...PAYOUT_STATUSES.map((status) => ({
                      value: status,
                      label: PAYOUT_STATUS_LABELS[status],
                    })),
                  ],
                },
              ]}
              filterRow={(row, values) =>
                !values.status || values.status === "all" || row.status === values.status
              }
              minWidth={920}
              footer={
                <p className="flex items-center gap-1.5">
                  <Lock className="size-3" aria-hidden="true" />
                  Baris yang sudah dibayar tidak dapat diedit. Koreksi memakai
                  entri pembalik.
                </p>
              }
            />
          </Panel>
        )
      ) : null}

      {tab === "ledger" ? (
        <Panel eyebrow="Hanya tambah" title="Semua entri ledger" bodyClassName="p-0">
          <DataTable
            rows={entries}
            columns={ledgerColumns}
            caption="Entri catatan hanya tambah dengan akun, arah, jenis, dan nominal"
            searchPlaceholder="Cari kode pesanan atau alasan"
            getSearchText={(row) =>
              `${row.orderCode ?? ""} ${row.account} ${row.entryType} ${row.reason}`
            }
            emptyTitle="Belum ada entri ledger"
            emptyDescription="Setiap pesanan lunas menulis tiga entri penjualan."
            minWidth={880}
          />
        </Panel>
      ) : null}

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        eyebrow="Payout"
        title={selected?.orderCode ?? selected?.reference ?? ""}
        stamp={selected ? PAYOUT_STATUS_LABELS[selected.status] : undefined}
        tone={selected ? PAYOUT_STATUS_TONES[selected.status] : undefined}
        description={
          selected
            ? `${selected.teacherName} · ${PAYOUT_KIND_LABELS[selected.kind]}`
            : undefined
        }
        footer={
          selected && release ? (
            <div className="flex flex-wrap gap-2">
              {["pending", "held"].includes(selected.status) ? (
                <Button
                  size="sm"
                  onClick={() => setAction({ kind: "approve", payout: selected })}
                >
                  <PlayCircle aria-hidden="true" />
                  Setujui
                </Button>
              ) : null}
              {["pending", "approved"].includes(selected.status) ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAction({ kind: "hold", payout: selected })}
                >
                  <PauseCircle aria-hidden="true" />
                  Tahan
                </Button>
              ) : null}
              {selected.status === "approved" ? (
                <Button
                  size="sm"
                  onClick={() => setAction({ kind: "release", payout: selected })}
                >
                  Cairkan
                </Button>
              ) : null}
              {selected.status === "paid" ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setAction({ kind: "reverse", payout: selected })}
                >
                  Buat entri pembalik
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
                { label: "Pembuat", value: selected.teacherName },
                { label: "Pesanan", value: selected.orderCode ?? "-" },
                { label: "Jenis", value: PAYOUT_KIND_LABELS[selected.kind] },
                { label: "Bruto", value: formatIDR(selected.gross) },
                { label: "Bagian pembuat", value: formatIDR(selected.teacherShare) },
                { label: "Bagian platform", value: formatIDR(selected.platformShare) },
                { label: "Bagian komunitas", value: formatIDR(selected.communityShare) },
                {
                  label: "Jatuh tempo",
                  value: formatCommerceDate(selected.dueAt),
                },
                {
                  label: "Dibayar",
                  value: formatCommerceDate(selected.paidAt),
                },
                {
                  label: "Nilai dibayar",
                  value: selected.paidAmount
                    ? formatIDR(selected.paidAmount)
                    : "-",
                },
              ]}
            />
            {selected.holdReason || selected.reason ? (
              <DrawerSection title="Catatan">
                <p className="border-l-2 border-brass pl-3 text-[11.5px] leading-relaxed text-ink-soft">
                  {selected.holdReason ?? selected.reason}
                </p>
              </DrawerSection>
            ) : null}
            <DrawerSection title="Riwayat ledger">
              <ul className="space-y-2">
                <li className="flex items-center justify-between gap-2 text-[10.5px]">
                  <span className="text-ink-muted">Dihitung otomatis</span>
                  <StatusStamp label={SPLIT_LABEL} tone="done" />
                </li>
                <li className="flex items-center justify-between gap-2 text-[10.5px]">
                  <span className="text-ink-muted">Perubahan status</span>
                  <span className="text-ink">oleh pengelola, beralasan</span>
                </li>
                <li className="flex items-center justify-between gap-2 text-[10.5px]">
                  <span className="text-ink-muted">Penghapusan baris</span>
                  <span className="font-semibold text-[#8a2e1f]">Tidak diizinkan</span>
                </li>
              </ul>
            </DrawerSection>
          </>
        ) : null}
      </DetailDrawer>

      <Dialog
        open={Boolean(action)}
        onOpenChange={(open) => {
          if (!open) {
            setAction(null)
            setReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action?.kind === "hold"
                ? "Tahan payout"
                : action?.kind === "reverse"
                  ? "Buat entri pembalik"
                  : action?.kind === "approve"
                    ? "Setujui payout"
                    : "Cairkan payout"}{" "}
              {action?.payout.orderCode ?? ""}
            </DialogTitle>
            <DialogDescription>
              {action?.kind === "release"
                ? "Payout masuk antrean transfer. Rekening harus terverifikasi. Perubahan rekening memblokir pencairan sampai diverifikasi ulang."
                : action?.kind === "hold"
                  ? "Payout ditahan sampai alasan selesai. Tidak ada perubahan pada baris ledger."
                  : action?.kind === "reverse"
                    ? "Pembalik membuat baris negatif baru. Baris asli tetap utuh."
                    : "Persetujuan menandai payout siap dicairkan."}
            </DialogDescription>
          </DialogHeader>
          {needsReason ? (
            <div>
              <Label htmlFor="payout-reason">Alasan</Label>
              <Textarea
                id="payout-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-2 min-h-24"
                placeholder="Misalnya, sengketa pesanan masih terbuka atau refund sudah disetujui."
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>
              Batal
            </Button>
            <Button
              disabled={pending || (needsReason && reason.trim().length < 8)}
              onClick={() => {
                if (!action) return
                const payoutId = action.payout.id as never
                if (action.kind === "hold") {
                  void run(
                    () => holdPayout({ payoutId, reason }),
                    "Payout ditahan",
                  )
                } else if (action.kind === "reverse") {
                  void run(
                    () => reversePayout({ payoutId, reason }),
                    "Entri pembalik dibuat",
                  )
                } else if (action.kind === "approve") {
                  void run(
                    () => approvePayout({ payoutId }),
                    "Payout disetujui",
                  )
                } else {
                  void run(
                    () => releasePayout({ payoutId }),
                    "Payout dicairkan",
                  )
                }
              }}
            >
              {action?.kind === "hold"
                ? "Tahan payout"
                : action?.kind === "reverse"
                  ? "Buat pembalik"
                  : action?.kind === "approve"
                    ? "Setujui payout"
                    : "Cairkan payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PayoutAccountPanel({
  accounts,
  manager,
}: {
  accounts: PayoutAccountRow[]
  manager: boolean
}) {
  const requestAccount = useMutation(api.payouts.requestPayoutAccount)
  const verifyAccount = useMutation(api.payouts.verifyPayoutAccount)
  const own = accounts[0] ?? null
  const [pending, setPending] = React.useState(false)
  const [verifyTarget, setVerifyTarget] =
    React.useState<PayoutAccountRow | null>(null)
  const [reason, setReason] = React.useState("")

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = new FormData(event.currentTarget)
    setPending(true)
    try {
      await requestAccount({
        provider: String(form.get("provider") ?? "bank") as PayoutAccountRow["provider"],
        bankCode: String(form.get("bankCode") ?? "").trim(),
        accountName: String(form.get("accountName") ?? "").trim(),
        accountNumberMasked: String(form.get("accountNumberMasked") ?? "").trim(),
        accountRef: String(form.get("accountRef") ?? "").trim(),
      })
      toast("Rekening payout disimpan", {
        description: "Menunggu verifikasi pengelola sebelum pencairan.",
      })
    } catch (error) {
      const data =
        typeof error === "object" && error && "data" in error
          ? (error as { data?: { message?: string } }).data
          : undefined
      toast("Rekening belum dapat disimpan", {
        description: data?.message ?? "Periksa data rekening.",
      })
    } finally {
      setPending(false)
    }
  }

  async function verify() {
    if (!verifyTarget || pending) return
    setPending(true)
    try {
      await verifyAccount({
        accountId: verifyTarget.id as never,
        reason,
      })
      toast("Rekening diverifikasi")
      setVerifyTarget(null)
      setReason("")
    } catch (error) {
      const data =
        typeof error === "object" && error && "data" in error
          ? (error as { data?: { message?: string } }).data
          : undefined
      toast("Verifikasi belum dapat dijalankan", {
        description: data?.message ?? "Periksa rekening dan alasan.",
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Panel
      eyebrow="Pencairan"
      title={manager ? "Verifikasi rekening penjual" : "Rekening payout"}
    >
      {manager ? (
        accounts.length === 0 ? (
          <p className="text-[11px] text-ink-muted">
            Belum ada penjual yang mengirim rekening.
          </p>
        ) : (
          <ul className="divide-y divide-ink/10">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-[11.5px] font-semibold text-ink">
                    {account.userName} · {account.accountName}
                  </p>
                  <p className="mt-0.5 text-[10px] text-ink-muted">
                    {account.provider === "bank"
                      ? account.bankCode
                      : account.provider}{" "}
                    · {account.accountNumberMasked} ·{" "}
                    {ACCOUNT_STATUS_LABELS[account.status]}
                  </p>
                </div>
                {account.status === "pending" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setVerifyTarget(account)}
                  >
                    Verifikasi
                  </Button>
                ) : account.verifiedAt ? (
                  <span className="text-[10px] text-ink-muted">
                    {formatCommerceDateTime(account.verifiedAt)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border border-ink/15 bg-cream/60 p-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                Status rekening
              </p>
              <p className="mt-1 text-[11.5px] font-semibold text-ink">
                {own ? ACCOUNT_STATUS_LABELS[own.status] : "Belum diisi"}
              </p>
            </div>
            {own ? (
              <p className="text-[10px] text-ink-muted">
                {own.provider === "bank" ? own.bankCode : own.provider} ·{" "}
                {own.accountNumberMasked}
              </p>
            ) : null}
          </div>
          <form
            key={own ? `${own.id}:${own.updatedAt}` : "new"}
            onSubmit={submit}
            className="grid gap-3 sm:grid-cols-2"
          >
            <div>
              <Label htmlFor="payout-provider">Jenis rekening</Label>
              <select
                id="payout-provider"
                name="provider"
                defaultValue={own?.provider ?? "bank"}
                className="mt-1.5 min-h-10 w-full border border-ink/25 bg-paper px-3 text-[12px]"
              >
                <option value="bank">Bank</option>
                <option value="gopay">GoPay</option>
                <option value="other">Lainnya</option>
              </select>
            </div>
            <div>
              <Label htmlFor="payout-bank">Kode bank / penyedia</Label>
              <Input
                id="payout-bank"
                name="bankCode"
                defaultValue={own?.bankCode ?? ""}
                placeholder="Misalnya BCA"
                required
              />
            </div>
            <div>
              <Label htmlFor="payout-name">Nama pemilik rekening</Label>
              <Input
                id="payout-name"
                name="accountName"
                defaultValue={own?.accountName ?? ""}
                required
              />
            </div>
            <div>
              <Label htmlFor="payout-number">Nomor rekening (masked)</Label>
              <Input
                id="payout-number"
                name="accountNumberMasked"
                defaultValue={own?.accountNumberMasked ?? ""}
                placeholder="**** **** 1234"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="payout-ref">Referensi vault</Label>
              <Input
                id="payout-ref"
                name="accountRef"
                defaultValue={own?.accountRef ?? ""}
                placeholder="ID rekening pada penyimpanan aman"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending}>
                {own ? "Kirim ulang untuk verifikasi" : "Simpan rekening"}
              </Button>
              <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">
                Mengubah rekening mengembalikan status ke menunggu verifikasi.
                Pencairan diblokir sampai pengelola memverifikasi.
              </p>
            </div>
          </form>
        </div>
      )}

      <Dialog
        open={Boolean(verifyTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setVerifyTarget(null)
            setReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verifikasi rekening payout</DialogTitle>
            <DialogDescription>
              {verifyTarget
                ? `${verifyTarget.userName} · ${verifyTarget.accountName} · ${verifyTarget.accountNumberMasked}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="verify-account-reason">Alasan verifikasi</Label>
            <Textarea
              id="verify-account-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 min-h-24"
              placeholder="Cocokkan nama dan nomor rekening dengan dokumen penjual."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyTarget(null)}>
              Batal
            </Button>
            <Button
              disabled={pending || reason.trim().length < 8}
              onClick={() => void verify()}
            >
              Verifikasi rekening
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  )
}

function payoutColumns(
  onSelect: (row: PayoutView) => void,
  canRelease: boolean,
  setAction: (value: PayoutAction) => void,
): Column<PayoutView>[] {
  return [
    {
      id: "payout",
      header: "Payout",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.orderCode ?? row.reference ?? "-"}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">
            {PAYOUT_KIND_LABELS[row.kind]}
          </p>
        </div>
      ),
    },
    {
      id: "teacher",
      header: "Pembuat",
      cell: (row) => <span className="text-[11.5px]">{row.teacherName}</span>,
    },
    {
      id: "gross",
      header: "Bruto",
      cell: (row) => (
        <span className="text-[11px] tabular-nums">{formatIDR(row.gross)}</span>
      ),
      align: "right",
      className: "hidden md:table-cell",
      headClassName: "hidden md:table-cell",
    },
    {
      id: "share",
      header: TEACHER_SHARE_LABEL,
      cell: (row) => (
        <span className="text-[11px] font-semibold tabular-nums">
          {formatIDR(row.teacherShare)}
        </span>
      ),
      align: "right",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <StatusStamp
          label={PAYOUT_STATUS_LABELS[row.status] ?? row.status}
          tone={PAYOUT_STATUS_TONES[row.status]}
        />
      ),
    },
    {
      id: "due",
      header: "Jatuh tempo",
      cell: (row) => (
        <span className="text-[10.5px] text-ink-muted">
          {formatCommerceDate(row.dueAt)}
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
          {canRelease && ["pending", "held"].includes(row.status) ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAction({ kind: "approve", payout: row })}
            >
              Setujui
            </Button>
          ) : null}
          {canRelease && row.status === "approved" ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAction({ kind: "release", payout: row })}
            >
              Cairkan
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => onSelect(row)}>
            Buka
          </Button>
        </div>
      ),
    },
  ]
}

const ledgerColumns: Column<LedgerEntryView>[] = [
  {
    id: "entry",
    header: "Entri",
    cell: (row) => (
      <div>
        <p className="font-semibold text-ink">
          {LEDGER_ACCOUNT_LABELS[row.account]}
        </p>
        <p className="mt-0.5 text-[10px] text-ink-muted">
          {LEDGER_ENTRY_TYPE_LABELS[row.entryType]} ·{" "}
          {LEDGER_DIRECTION_LABELS[row.direction]}
        </p>
      </div>
    ),
  },
  {
    id: "order",
    header: "Pesanan",
    cell: (row) => (
      <span className="text-[11px] tabular-nums">{row.orderCode ?? "-"}</span>
    ),
  },
  {
    id: "amount",
    header: "Nominal",
    cell: (row) => (
      <span className="text-[11px] font-semibold tabular-nums">
        {formatIDR(row.amount)}
      </span>
    ),
    align: "right",
  },
  {
    id: "reversal",
    header: "Pembalik dari",
    cell: (row) => (
      <span className="text-[10px] text-ink-muted">
        {row.reversalOf ?? "Belum diisi"}
      </span>
    ),
    className: "hidden lg:table-cell",
    headClassName: "hidden lg:table-cell",
  },
  {
    id: "reason",
    header: "Alasan",
    cell: (row) => (
      <span className="text-[10.5px] text-ink-muted">{row.reason}</span>
    ),
    className: "hidden lg:table-cell",
    headClassName: "hidden lg:table-cell",
  },
  {
    id: "at",
    header: "Waktu",
    cell: (row) => (
      <span className="text-[10px] text-ink-muted">
        {formatCommerceDateTime(row.createdAt)}
      </span>
    ),
    className: "hidden xl:table-cell",
    headClassName: "hidden xl:table-cell",
  },
  {
    id: "link",
    header: "",
    align: "right",
    cell: () => (
      <Button asChild size="sm" variant="ghost">
        <Link href="/ruang/pesanan">
          Pesanan
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    ),
  },
]
