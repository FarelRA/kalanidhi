"use client"

import * as React from "react"
import { Download } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EmptyState } from "@/components/workspace/data/empty-state"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { api } from "@/convex/_generated/api"
import { downloadCsv } from "@/lib/admin/csv"
import type { MetricHistoryPoint, MetricResult } from "@/lib/admin/types"
import { useMutation, useQuery } from "convex/react"

function toDateInput(timestamp: number): string {
  const shifted = new Date(timestamp + 7 * 60 * 60 * 1_000)
  return shifted.toISOString().slice(0, 10)
}

function fromDateInput(value: string, endOfDay = false): number | undefined {
  if (!value) return undefined
  const base = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}+07:00`)
  return base.getTime()
}

function formatMetric(metric: MetricResult): string {
  if (metric.value === null) return "Belum ada data"
  if (metric.unit === "rupiah") {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(metric.value)
  }
  if (metric.unit === "ratio") return `${(metric.value * 100).toFixed(1)}%`
  if (metric.unit === "hours") return `${metric.value.toFixed(1)} jam`
  if (metric.unit === "minutes") return `${metric.value.toFixed(0)} menit`
  if (metric.unit === "days") return `${metric.value.toFixed(0)} hari`
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(
    metric.value,
  )
}

function formatHistoryValue(value: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(
    value,
  )
}

function MetricTrend({ points }: { points: MetricHistoryPoint[] }) {
  const max = Math.max(...points.map((point) => Math.abs(point.value)), 0)

  return (
    <div
      className="flex h-10 items-end gap-0.5"
      role="img"
      aria-label={`Tren harian ${points.length} titik`}
    >
      {points.map((point) => {
        const height =
          max > 0
            ? Math.max(2, Math.round((Math.abs(point.value) / max) * 100))
            : 2
        return (
          <span
            key={point.date}
            title={`${point.date}: ${formatHistoryValue(point.value)}`}
            className="min-w-0 flex-1 bg-copper-dark/70"
            style={{ height: `${height}%` }}
          />
        )
      })}
    </div>
  )
}

function formatPrevious(metric: MetricResult): string {
  if (metric.previous === null) return "tanpa pembanding"
  if (metric.unit === "ratio") return `sebelumnya ${(metric.previous * 100).toFixed(1)}%`
  if (metric.unit === "rupiah") {
    return `sebelumnya ${new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(metric.previous)}`
  }
  return `sebelumnya ${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 1,
  }).format(metric.previous)}`
}

export function StatsLive() {
  const [from, setFrom] = React.useState(() => {
    const now = Date.now()
    return toDateInput(now - 29 * 86_400_000)
  })
  const [to, setTo] = React.useState(() => toDateInput(Date.now()))
  const [definition, setDefinition] = React.useState<string | null>(null)
  const report = useQuery(api.stats.metrics, {
    from: fromDateInput(from),
    to: fromDateInput(to, true),
  })
  const history = useQuery(api.stats.metricHistory, {
    from: fromDateInput(from),
    to: fromDateInput(to, true),
  })
  const exportMetrics = useMutation(api.stats.exportMetrics)
  const [generatedAt, setGeneratedAt] = React.useState<number | null>(null)

  async function exportCsv() {
    try {
      const result = await exportMetrics({
        from: fromDateInput(from),
        to: fromDateInput(to, true),
        reason: "Ekspor dari halaman statistik",
      })
      downloadCsv("statistik-kalanidhi.csv", [
        ["kunci", "label", "nilai", "sebelumnya", "unit", "definisi", "rumus"],
        ...result.rows.map((metric) => [
          metric.key,
          metric.label,
          metric.value === null ? "" : metric.value,
          metric.previous === null ? "" : metric.previous,
          metric.unit,
          metric.definition,
          metric.formula,
        ]),
      ])
      setGeneratedAt(result.generatedAt)
      toast("Ekspor statistik tercatat")
    } catch (error) {
      toast("Ekspor gagal", {
        description: error instanceof Error ? error.message : "Coba lagi.",
      })
    }
  }

  const selected = report?.definitions.find((item) => item.key === definition)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Statistik"
        title="Angka dari catatan, bukan dari ingatan."
        description="Setiap metrik dihitung dari tabel nyata. Definisi dan rumus ditampilkan bersama nilainya; ketiadaan data dinyatakan sebagai belum ada data."
        meta={
          <span className="text-[10px] text-ink-muted">
            {report
              ? `${new Intl.DateTimeFormat("id-ID", {
                  timeZone: "Asia/Jakarta",
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(report.generatedAt))} · ${report.definitions.length} definisi`
              : "Memuat laporan"}
          </span>
        }
        actions={
          <Button variant="outline" onClick={() => void exportCsv()}>
            <Download aria-hidden="true" />
            Ekspor CSV
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3 border border-ink/20 bg-paper-2 p-3">
        <div>
          <Label htmlFor="stats-from">Dari</Label>
          <Input
            id="stats-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="mt-1 h-8 text-[11px]"
          />
        </div>
        <div>
          <Label htmlFor="stats-to">Sampai</Label>
          <Input
            id="stats-to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="mt-1 h-8 text-[11px]"
          />
        </div>
        <p className="pb-1 text-[10px] text-ink-muted">
          Zona waktu Asia/Jakarta. Pembanding memakai panjang periode yang sama.
        </p>
      </div>

      {report === undefined ? (
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse border border-ink/15 bg-panel/30" />
          ))}
        </div>
      ) : report.definitions.length === 0 ? (
        <EmptyState
          title="Belum ada definisi metrik"
          description="Tidak ada angka yang dikarang saat definisi belum tersedia."
        />
      ) : (
        <>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {report.definitions.map((metric) => (
              <button
                key={metric.key}
                type="button"
                onClick={() => setDefinition(metric.key)}
                className="border border-ink/20 bg-paper-2 p-3.5 text-left transition-colors hover:border-ink/40 hover:bg-panel/25"
              >
                <p className="text-[8.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                  {metric.label}
                </p>
                <p className="mt-1.5 font-heading text-2xl leading-none text-ink tabular-nums">
                  {formatMetric(metric)}
                </p>
                <p className="mt-1 text-[9.5px] text-ink-muted">
                  {formatPrevious(metric)}
                </p>
                {metric.emptyReason ? (
                  <p className="mt-1.5 text-[9px] leading-snug text-[#8a5a16]">
                    {metric.emptyReason}
                  </p>
                ) : null}
              </button>
            ))}
          </div>

          <Panel eyebrow="Corong" title="Dari lead ke penjualan berulang">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {report.funnel.map((step) => (
                <div key={step.key} className="border border-ink/15 bg-paper/40 p-2.5">
                  <p className="text-[8px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                    {step.label}
                  </p>
                  <p className="mt-1 font-heading text-xl leading-none text-ink tabular-nums">
                    {step.value === null ? "—" : step.value}
                  </p>
                  <p className="mt-1 text-[9px] leading-snug text-ink-muted">
                    {step.definition}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}

      <Panel eyebrow="Riwayat" title="Riwayat metrik">
        {history === undefined ? (
          <p className="text-[11px] text-ink-muted">Memuat riwayat metrik…</p>
        ) : history.definitions.length === 0 ? (
          <EmptyState
            title="Belum ada data"
            description="Definisi metrik aktif belum tersedia. Riwayat akan muncul setelah definisi dan agregat harian diisi."
          />
        ) : (
          <div className="space-y-3">
            {history.definitions.map((series) => (
              <div
                key={series.key}
                className="border border-ink/15 bg-paper/40 p-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink">
                    {series.label}
                  </p>
                  <p className="text-[9px] text-ink-muted">{series.formula}</p>
                </div>
                <p className="mt-1 text-[9.5px] leading-snug text-ink-muted">
                  {series.definition}
                </p>
                <div className="mt-2">
                  {series.points.length === 0 ? (
                    <p className="text-[10px] text-ink-muted">Belum ada data</p>
                  ) : (
                    <>
                      <MetricTrend points={series.points} />
                      <div className="mt-1 flex justify-between text-[8.5px] text-ink-muted">
                        <span>{series.points[0].date}</span>
                        <span>
                          {series.points[series.points.length - 1].date}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {selected ? (
        <Panel
          eyebrow="Definisi"
          title={selected.label}
          action={
            <Button size="sm" variant="ghost" onClick={() => setDefinition(null)}>
              Tutup
            </Button>
          }
        >
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                Definisi
              </dt>
              <dd className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                {selected.definition}
              </dd>
            </div>
            <div>
              <dt className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                Rumus
              </dt>
              <dd className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                {selected.formula}
              </dd>
            </div>
            <div>
              <dt className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                Nilai
              </dt>
              <dd className="mt-1 text-[12px] font-semibold text-ink">
                {formatMetric(selected)}
              </dd>
            </div>
            <div>
              <dt className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                Sumber
              </dt>
              <dd className="mt-1 text-[11.5px] text-ink-soft">
                {selected.numerator !== null && selected.denominator !== null
                  ? `${selected.numerator} dari ${selected.denominator}`
                  : "Agregat langsung dari catatan."}
              </dd>
            </div>
          </dl>
        </Panel>
      ) : null}

      {generatedAt ? (
        <p className="text-[10px] text-ink-muted">
          Ekspor terakhir dibuat pada{" "}
          {new Intl.DateTimeFormat("id-ID", {
            timeZone: "Asia/Jakarta",
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(generatedAt))}
          . Tersimpan di log audit.
        </p>
      ) : null}
    </div>
  )
}
