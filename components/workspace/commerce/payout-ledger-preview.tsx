"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Download, Lock, PauseCircle, PlayCircle, Wallet } from "lucide-react"
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
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import { payouts } from "@/lib/workspace/mock-data"
import type { Payout } from "@/lib/workspace/types"
import { formatIDR } from "@/lib/format"
import { formatWorkspaceDate } from "@/lib/workspace/format"

export function PayoutLedgerPreview() {
  const { can } = useViewer()
  const [selected, setSelected] = React.useState<Payout | null>(null)
  const [action, setAction] = React.useState<{
    payout: Payout
    kind: "hold" | "release" | "reverse"
  } | null>(null)
  const [reason, setReason] = React.useState("")

  const release = can("payouts.release")
  const rows = release
    ? payouts
    : payouts.filter((item) => item.teacher === "Anisa Rahmawati" || item.teacher === "Bambang Hardjono")

  const totals = rows.reduce(
    (acc, item) => {
      acc.gross += item.gross
      acc.teacher += item.teacherShare
      acc.platform += item.platformShare
      acc.community += item.communityShare
      return acc
    },
    { gross: 0, teacher: 0, platform: 0, community: 0 },
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pesanan · payout"
        title={release ? "Ledger 70 / 15 / 15." : "Pendapatan dan statement."}
        description={
          release
            ? "Ledger append-only. Tahan, setujui, bayar, atau balik dengan entri baru — tidak pernah mengedit baris yang sudah dibayar."
            : "Bagian pengajar 70% dari setiap pesanan, status pencairan, dan statement per periode."
        }
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                toast("Statement diekspor", {
                  description: "CSV statement per pengajar dan periode disiapkan.",
                })
              }
            >
              <Download aria-hidden="true" />
              Ekspor statement
            </Button>
            {release ? (
              <Button asChild>
                <Link href="/ruang/pesanan/pembayaran">Buka rekonsiliasi</Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-2.5 sm:grid-cols-3">
        <div className="border border-ink/20 bg-paper-2 p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            Bruto pada tampilan
          </p>
          <p className="mt-2 font-heading text-2xl text-ink">{formatIDR(totals.gross)}</p>
          <p className="mt-1 text-[10px] text-ink-muted">{rows.length} baris ledger</p>
        </div>
        <div className="border border-ink/20 bg-paper-2 p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            Bagian pengajar 70%
          </p>
          <p className="mt-2 font-heading text-2xl text-ink">{formatIDR(totals.teacher)}</p>
          <p className="mt-1 text-[10px] text-ink-muted">Sebelum pajak penjual</p>
        </div>
        <div className="border border-ink/20 bg-paper-2 p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            Platform + komunitas
          </p>
          <p className="mt-2 font-heading text-2xl text-ink">
            {formatIDR(totals.platform + totals.community)}
          </p>
          <p className="mt-1 text-[10px] text-ink-muted">Masing-masing 15%</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-9"
          eyebrow="Ledger"
          title="Baris payout"
          bodyClassName="p-0"
        >
          <DataTable
            rows={rows}
            columns={payoutColumns(setSelected, release, setAction)}
            caption="Ledger payout dengan pengajar, periode, bruto, bagian, status, dan jatuh tempo"
            searchPlaceholder="Cari pengajar, kode, atau periode"
            getSearchText={(row) =>
              `${row.teacher} ${row.code} ${row.period} ${row.statusLabel}`
            }
            filters={[
              {
                id: "status",
                label: "Status",
                options: [
                  { value: "all", label: "Semua", count: rows.length },
                  { value: "pending", label: "Menunggu" },
                  { value: "held", label: "Ditahan" },
                  { value: "approved", label: "Disetujui" },
                  { value: "paid", label: "Dibayar" },
                ],
              },
            ]}
            filterRow={(row, values) =>
              !values.status || values.status === "all" || row.status === values.status
            }
            minWidth={900}
            footer={
              <p className="flex items-center gap-1.5">
                <Lock className="size-3" aria-hidden="true" />
                Baris yang sudah dibayar tidak dapat diedit. Koreksi memakai entri
                pembalik.
              </p>
            }
          />
        </Panel>

        <div className="space-y-4 xl:col-span-3">
          <Panel eyebrow="Bagi hasil" title="Dihitung sistem">
            <div className="flex h-6 border border-ink/25" aria-hidden="true">
              <span className="h-full bg-copper-dark" style={{ width: "70%" }} />
              <span className="h-full bg-ink" style={{ width: "15%" }} />
              <span className="h-full bg-moss" style={{ width: "15%" }} />
            </div>
            <dl className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-[10.5px] text-ink-soft">
                  <span className="size-2 bg-copper-dark" aria-hidden="true" />
                  Pengajar
                </dt>
                <dd className="text-[11px] font-semibold">70%</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-[10.5px] text-ink-soft">
                  <span className="size-2 bg-ink" aria-hidden="true" />
                  Platform
                </dt>
                <dd className="text-[11px] font-semibold">15%</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-[10.5px] text-ink-soft">
                  <span className="size-2 bg-moss" aria-hidden="true" />
                  Komunitas
                </dt>
                <dd className="text-[11px] font-semibold">15%</dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-ink/15 pt-2.5 text-[9.5px] leading-relaxed text-ink-muted">
              Biaya gerbang diserap dari bagian platform. Janji 70/15/15 dihitung
              dari bruto.
            </p>
          </Panel>
          <Panel eyebrow="Pintasan" title="Tindakan">
            <div className="grid gap-1.5">
              <Button asChild size="sm" variant="outline" className="justify-start">
                <Link href="/ruang/pesanan">
                  <Wallet aria-hidden="true" />
                  Lihat pesanan sumber
                </Link>
              </Button>
              <Button asChild size="sm" variant="ghost" className="justify-start">
                <Link href="/ruang/log">
                  Log payout
                  <ArrowRight aria-hidden="true" />
                </Link>
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
        eyebrow="Payout"
        title={selected?.code ?? ""}
        stamp={selected?.statusLabel}
        tone={selected?.tone}
        description={selected ? `${selected.teacher} · ${selected.period}` : undefined}
        footer={
          selected && release ? (
            <div className="flex flex-wrap gap-2">
              {selected.status === "pending" || selected.status === "held" ? (
                <Button
                  size="sm"
                  onClick={() => setAction({ payout: selected, kind: "release" })}
                >
                  <PlayCircle aria-hidden="true" />
                  Setujui
                </Button>
              ) : null}
              {selected.status === "pending" || selected.status === "approved" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAction({ payout: selected, kind: "hold" })}
                >
                  <PauseCircle aria-hidden="true" />
                  Tahan
                </Button>
              ) : null}
              {selected.status === "paid" ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setAction({ payout: selected, kind: "reverse" })}
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
                { label: "Pengajar", value: selected.teacher },
                { label: "Periode", value: selected.period },
                { label: "Bruto", value: formatIDR(selected.gross) },
                { label: "Bagian pengajar", value: formatIDR(selected.teacherShare) },
                { label: "Bagian platform", value: formatIDR(selected.platformShare) },
                { label: "Bagian komunitas", value: formatIDR(selected.communityShare) },
                { label: "Jatuh tempo", value: formatWorkspaceDate(selected.dueAt) },
                { label: "Dibayar", value: selected.paidAt ? formatWorkspaceDate(selected.paidAt) : "—" },
                { label: "Pesanan", value: `${selected.orders} pesanan` },
              ]}
            />
            {selected.note ? (
              <DrawerSection title="Catatan">
                <p className="border-l-2 border-brass pl-3 text-[11.5px] leading-relaxed text-ink-soft">
                  {selected.note}
                </p>
              </DrawerSection>
            ) : null}
            <DrawerSection title="Jejak ledger">
              <ul className="space-y-2">
                <li className="flex items-center justify-between gap-2 text-[10.5px]">
                  <span className="text-ink-muted">Dihitung otomatis</span>
                  <StatusStamp label="Tercatat" tone="done" />
                </li>
                <li className="flex items-center justify-between gap-2 text-[10.5px]">
                  <span className="text-ink-muted">Perubahan status</span>
                  <span className="text-ink">oleh sistem dan pengelola</span>
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
                  : "Setujui payout"}{" "}
              {action?.payout.code}
            </DialogTitle>
            <DialogDescription>
              {action?.kind === "release"
                ? "Payout akan masuk antrean transfer bank. Pastikan rekening sudah terverifikasi ulang."
                : action?.kind === "hold"
                  ? "Payout ditahan sampai alasan selesai. Tidak ada perubahan pada baris ledger."
                  : "Pembalik membuat baris negatif baru. Baris asli tetap utuh."}
            </DialogDescription>
          </DialogHeader>
          {action?.kind !== "release" ? (
            <div>
              <Label htmlFor="payout-reason">Alasan</Label>
              <Textarea
                id="payout-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-2 min-h-24"
                placeholder="Contoh: sengketa pesanan masih terbuka atau refund sudah disetujui."
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>
              Batal
            </Button>
            <Button
              disabled={action?.kind !== "release" && reason.trim().length < 8}
              onClick={() => {
                toast(
                  action?.kind === "hold"
                    ? "Payout ditahan"
                    : action?.kind === "reverse"
                      ? "Entri pembalik dibuat"
                      : "Payout disetujui",
                  {
                    description: `${action?.payout.code} · alasan dan aktor masuk audit.`,
                  },
                )
                setAction(null)
                setReason("")
                setSelected(null)
              }}
            >
              {action?.kind === "hold"
                ? "Tahan payout"
                : action?.kind === "reverse"
                  ? "Buat pembalik"
                  : "Setujui payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function payoutColumns(
  onSelect: (row: Payout) => void,
  canRelease: boolean,
  setAction: (value: {
    payout: Payout
    kind: "hold" | "release" | "reverse"
  }) => void,
): Column<Payout>[] {
  return [
    {
      id: "payout",
      header: "Payout",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.code}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">{row.period}</p>
        </div>
      ),
    },
    {
      id: "teacher",
      header: "Pengajar",
      cell: (row) => <span className="text-[11.5px]">{row.teacher}</span>,
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
      header: "70%",
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
      cell: (row) => <StatusStamp label={row.statusLabel} tone={row.tone} />,
    },
    {
      id: "due",
      header: "Jatuh tempo",
      cell: (row) => (
        <span className="text-[10.5px] text-ink-muted">
          {formatWorkspaceDate(row.dueAt)}
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
          {canRelease && row.status === "pending" ? (
            <Button size="sm" variant="ghost" onClick={() => setAction({ payout: row, kind: "release" })}>
              Setujui
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
