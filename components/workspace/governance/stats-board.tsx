"use client"

import * as React from "react"
import { Download, TrendingDown, TrendingUp } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/workspace/data/data-table"
import { MetricStrip } from "@/components/workspace/data/metric-ruler"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import {
  adminMetrics,
  funnel,
  pathPerformance,
  statsDefinitions,
  teacherMetrics,
} from "@/lib/workspace/mock-data"
import type { StatDefinition } from "@/lib/workspace/types"
import { formatCompactIDR } from "@/lib/workspace/format"
import { cn } from "cn"

export function StatsBoard() {
  const { can } = useViewer()
  const [range, setRange] = React.useState("30")
  const admin = can("stats.read")

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Statistik"
        title={admin ? "Angka yang bisa dilacak." : "Rekap mengajar."}
        description={
          admin
            ? "Semua angka dihitung dari catatan, bukan diketik. Definisinya tinggal di satu tempat dan ikut periode."
            : "Beban penilaian, penyelesaian kohort, dan pendapatan dari kelas yang kamu pegang."
        }
        meta={
          <p className="text-[10px] text-ink-muted">
            {range} hari terakhir · dibandingkan periode sebelumnya · definisi v3
          </p>
        }
        actions={
          <>
            <div className="flex border border-ink/20" role="group" aria-label="Rentang waktu">
              {[
                ["7", "7 hari"],
                ["30", "30 hari"],
                ["90", "90 hari"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={range === value}
                  onClick={() => setRange(value)}
                  className={cn(
                    "min-h-11 border-r border-ink/15 px-2.5 text-[9.5px] font-bold uppercase tracking-[0.05em] last:border-r-0",
                    range === value ? "bg-ink text-paper" : "text-ink-muted hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() =>
                toast("Statistik diekspor", {
                  description: "CSV definisi, nilai, dan periode disiapkan. Ekspor dicatat.",
                })
              }
            >
              <Download aria-hidden="true" />
              Ekspor CSV
            </Button>
          </>
        }
      />

      <MetricStrip metrics={admin ? adminMetrics : teacherMetrics} />

      {admin ? (
        <div className="grid gap-4 xl:grid-cols-12">
          <Panel className="xl:col-span-7" eyebrow="Corong" title="Dari pengunjung ke penjualan pertama">
            <ol className="space-y-3">
              {funnel.map((stage, index) => (
                <li key={stage.label}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11px] font-semibold text-ink">
                      {stage.label}
                    </span>
                    <span className="text-[11px] font-bold tabular-nums text-ink">
                      {stage.value}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-5 flex-1 bg-panel/60">
                      <div
                        className={cn(
                          "h-full border-r border-paper-2",
                          index === funnel.length - 1 ? "bg-moss" : "bg-copper-dark",
                        )}
                        style={{ width: `${stage.width}%` }}
                      />
                    </div>
                    <span className="w-32 shrink-0 text-right text-[9px] text-ink-muted">
                      {stage.note}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 border-t border-ink/15 pt-2.5 text-[9.5px] leading-relaxed text-ink-muted">
              Pengunjung dihitung dari formulir dan tautan bertanda, bukan page view.
              Tidak ada klaim lalu lintas yang tidak punya sumber.
            </p>
          </Panel>

          <div className="space-y-4 xl:col-span-5">
            <Panel eyebrow="Operasi" title="Kesehatan pekan ini">
              <dl className="grid grid-cols-2 gap-3">
                {[
                  ["SLA penilaian p50", "31 jam", "naik", "+2"],
                  ["SLA dukungan p50", "22 menit", "turun", "-9"],
                  ["Kursi terisi", "82%", "naik", "+4"],
                  ["Penyelesaian kohort", "63%", "naik", "+5,6"],
                ].map(([label, value, direction, delta]) => (
                  <div key={label} className="border border-ink/15 bg-paper/50 p-2.5">
                    <dt className="text-[8px] font-bold uppercase tracking-[0.06em] text-ink-muted">
                      {label}
                    </dt>
                    <dd className="mt-1 flex items-baseline gap-1.5">
                      <span className="font-heading text-lg leading-none text-ink">{value}</span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 text-[9px] font-bold",
                          direction === "naik" ? "text-moss" : "text-moss",
                        )}
                      >
                        {direction === "naik" ? (
                          <TrendingUp className="size-2.5" aria-hidden="true" />
                        ) : (
                          <TrendingDown className="size-2.5" aria-hidden="true" />
                        )}
                        {delta}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </Panel>
            <Panel eyebrow="Bulanan" title="GMV 12 bulan">
              <div className="flex h-28 items-end gap-1" aria-hidden="true">
                {[34, 38, 42, 39, 46, 51, 49, 58, 62, 59, 68, 74].map((value, index) => (
                  <div key={index} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className={cn(
                        "w-full",
                        index === 11 ? "bg-copper-dark" : "bg-copper/35",
                      )}
                      style={{ height: `${(value / 74) * 92}px` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex justify-between border-t border-ink/25 pt-1 text-[8px] font-bold uppercase tracking-[0.04em] text-ink-muted">
                <span>Des</span>
                <span>Mar</span>
                <span>Jun</span>
                <span>Sep</span>
                <span>Nov</span>
              </div>
              <p className="mt-2 text-[9.5px] text-ink-muted">
                Puncak Rp74,2 jt pada November; belum dikurangi refund.
              </p>
            </Panel>
          </div>
        </div>
      ) : (
        <Panel eyebrow="Kohort" title="Beban dan penyelesaian">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["BTG-06", "14 peserta", "72% selesai"],
              ["BTG-07", "11 peserta", "0% selesai"],
              ["WRN-02", "9 peserta", "89% selesai"],
            ].map(([code, students, completion]) => (
              <div key={code} className="border border-ink/15 bg-paper/50 p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                  {code}
                </p>
                <p className="mt-1 font-heading text-lg text-ink">{students}</p>
                <p className="mt-0.5 text-[10px] text-ink-muted">{completion}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel
        eyebrow="Jalur"
        title="Kinerja per jalur"
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <caption className="sr-only">
              Kinerja jalur: peserta, penyelesaian, sertifikat, dan GMV
            </caption>
            <thead>
              <tr className="border-b border-ink/25 bg-panel/55">
                {["Jalur", "Peserta", "Penyelesaian", "Sertifikat", "GMV"].map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className="px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-ink-soft"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pathPerformance.map((row) => (
                <tr key={row.path} className="border-b border-ink/10">
                  <td className="px-3 py-3 text-[11.5px] font-semibold">{row.path}</td>
                  <td className="px-3 py-3 text-[11px] tabular-nums">{row.students}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-20 bg-panel">
                        <span
                          className="block h-full bg-moss"
                          style={{ width: `${row.completion}%` }}
                        />
                      </span>
                      <span className="text-[10px] tabular-nums text-ink-muted">
                        {row.completion}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[11px] tabular-nums">{row.certs}</td>
                  <td className="px-3 py-3 text-[11px] tabular-nums">
                    {formatCompactIDR(row.gmv)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        eyebrow="Definisi"
        title={admin ? "Metrik dan pemilik" : "Metrik yang relevan"}
        bodyClassName="p-0"
      >
        <DataTable
          rows={admin ? statsDefinitions : statsDefinitions.slice(0, 5)}
          columns={definitionColumns}
          caption="Definisi metrik, nilai, perubahan, dan pemilik"
          searchPlaceholder="Cari metrik atau pemilik"
          getSearchText={(row) => `${row.label} ${row.definition} ${row.owner}`}
          filters={[
            {
              id: "owner",
              label: "Pemilik",
              options: [
                { value: "all", label: "Semua" },
                { value: "Nadia Kusuma", label: "Nadia" },
                { value: "Bambang Hardjono", label: "Bambang" },
                { value: "Fajar Nugroho", label: "Fajar" },
              ],
            },
          ]}
          filterRow={(row, values) =>
            !values.owner || values.owner === "all" || row.owner === values.owner
          }
          minWidth={760}
          footer={
            <p>
              Definisi tidak boleh mengandung angka manual. Perubahan definisi
              menaikkan versi metrik.
            </p>
          }
        />
      </Panel>
    </div>
  )
}

const definitionColumns: Column<StatDefinition>[] = [
  {
    id: "metric",
    header: "Metrik",
    cell: (row) => (
      <div>
        <p className="font-semibold text-ink">{row.label}</p>
        <p className="mt-0.5 max-w-80 text-[10px] leading-snug text-ink-muted">
          {row.definition}
        </p>
      </div>
    ),
  },
  {
    id: "value",
    header: "Nilai",
    cell: (row) => (
      <span className="font-heading text-[15px] tabular-nums text-ink">{row.value}</span>
    ),
    align: "right",
  },
  {
    id: "delta",
    header: "Perubahan",
    cell: (row) => (
      <span
        className={cn(
          "text-[10px] font-bold tabular-nums",
          row.delta.startsWith("-") ? "text-moss" : "text-[#8a5a16]",
        )}
      >
        {row.delta}
      </span>
    ),
    align: "right",
  },
  {
    id: "owner",
    header: "Pemilik",
    cell: (row) => (
      <span className="text-[10.5px] text-ink-soft">{row.owner}</span>
    ),
    className: "hidden md:table-cell",
    headClassName: "hidden md:table-cell",
  },
  {
    id: "status",
    header: "Definisi",
    cell: () => <StatusStamp label="Aktif v3" tone="done" />,
    className: "hidden lg:table-cell",
    headClassName: "hidden lg:table-cell",
  },
]
