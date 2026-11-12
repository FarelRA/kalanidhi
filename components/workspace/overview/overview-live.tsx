"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle2, CircleDashed, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ActivityFeed } from "@/components/workspace/data/activity-feed"
import { EmptyState } from "@/components/workspace/data/empty-state"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import { api } from "@/convex/_generated/api"
import {
  INTEGRATION_STATUS_LABELS,
  INTEGRATION_STATUS_TONES,
} from "@/lib/settings/options"
import type { AdminOverview, LogRow } from "@/lib/admin/types"
import type { ActivityItem } from "@/lib/workspace/types"
import { useQuery } from "convex/react"

function formatJakarta(timestamp: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(timestamp))
}

function activityItem(row: LogRow, index: number): ActivityItem {
  const type: ActivityItem["type"] = row.action.startsWith("content.")
    ? "content"
    : row.action.startsWith("payments.")
      ? "payment"
      : row.action.startsWith("users.") || row.action.startsWith("people.")
        ? "auth"
        : "audit"
  return {
    id: `${row.id}-${index}`,
    actor: row.actor ?? "Sistem",
    action: row.action,
    target: row.entity,
    time: new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(row.createdAt)),
    type,
  }
}

function AdminLiveOverview({ data }: { data: AdminOverview }) {
  return (
    <>
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {data.queues.slice(0, 8).map((queue) => (
          <Link
            key={queue.key}
            href={queue.href}
            className="group border border-ink/20 bg-paper-2 p-3.5 transition-colors hover:border-ink/40 hover:bg-panel/30"
          >
            <p className="text-[8.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              {queue.label}
            </p>
            <p className="mt-1.5 font-heading text-2xl leading-none text-ink tabular-nums">
              {queue.count}
            </p>
            <p className="mt-1 flex items-center justify-between gap-2 text-[9.5px] text-ink-muted">
              <span>{queue.note}</span>
              <ArrowRight
                className="size-3 text-ink-muted transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-7"
          eyebrow="Antrean pengelola"
          title="Perlu keputusan"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/ruang/alur">
                Semua alur
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          }
        >
          {data.queues.length > 0 ? (
            <ul className="divide-y divide-ink/10">
              {data.queues.map((queue) => (
                <li key={queue.key}>
                  <Link
                    href={queue.href}
                    className="flex min-h-12 items-center justify-between gap-3 px-1 py-3 transition-colors hover:bg-panel/30"
                  >
                    <span className="min-w-0">
                      <span className="block text-[12px] font-semibold text-ink">
                        {queue.label}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-ink-muted">
                        {queue.note}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-heading text-lg tabular-nums text-ink">
                        {queue.count}
                      </span>
                      <StatusStamp
                        label={queue.count === 0 ? "Bersih" : "Terbuka"}
                        tone={queue.count === 0 ? "done" : queue.tone}
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Antrean kosong"
              description="Belum ada data operasional pada fase ini."
            />
          )}
        </Panel>

        <div className="space-y-4 xl:col-span-5">
          <Panel eyebrow="Konten" title="Landing publik">
            <dl className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[10.5px] text-ink-muted">Status</dt>
                <dd>
                  <StatusStamp
                    label={data.content.publishedAt ? "Terbit" : "Belum terbit"}
                    tone={data.content.publishedAt ? "done" : "wait"}
                  />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[10.5px] text-ink-muted">Draf</dt>
                <dd className="text-[11px] font-semibold text-ink">
                  {data.content.draftVersion
                    ? `v${data.content.draftVersion}`
                    : "Tidak ada draf"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[10.5px] text-ink-muted">Umur terbit</dt>
                <dd className="text-[11px] tabular-nums text-ink">
                  {data.content.freshnessDays === null
                    ? "—"
                    : `${data.content.freshnessDays} hari`}
                </dd>
              </div>
            </dl>
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href="/ruang/konten">Buka editor konten</Link>
            </Button>
          </Panel>

          <Panel eyebrow="Jejak audit" title="Aktivitas terakhir">
            {data.activity.length > 0 ? (
              <ActivityFeed
                items={data.activity.map((row, index) => activityItem(row, index))}
              />
            ) : (
              <p className="text-[12px] text-ink-muted">
                Belum ada aktivitas tercatat.
              </p>
            )}
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel eyebrow="Integrasi" title="Kesehatan sistem">
          {data.integrations.length > 0 ? (
            <ul className="divide-y divide-ink/10">
              {data.integrations.map((item) => (
                <li
                  key={item.integration}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="text-[11.5px] font-semibold text-ink">
                    {item.integration}
                  </span>
                  <StatusStamp
                    label={INTEGRATION_STATUS_LABELS[item.status]}
                    tone={INTEGRATION_STATUS_TONES[item.status]}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] leading-relaxed text-ink-muted">
              Belum ada laporan kesehatan integrasi. Tidak ada angka yang
              dikarang.
            </p>
          )}
        </Panel>

        <Panel eyebrow="Modul" title="Ketersediaan data">
          <ul className="space-y-3">
            {data.modules.map((module) => (
              <li key={module.key} className="flex items-start gap-2.5">
                {module.available ? (
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-moss" aria-hidden="true" />
                ) : (
                  <CircleDashed className="mt-0.5 size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                )}
                <div>
                  <p className="text-[11.5px] font-semibold text-ink">
                    {module.label}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-ink-muted">
                    {module.note}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel eyebrow="Pintasan" title="Tindakan cepat">
          <div className="grid gap-1.5">
            <QuickLink href="/ruang/orang" label="Undang pengelola" note="Peran dan sesi" />
            <QuickLink href="/ruang/konten" label="Terbitkan konten" note="Draf dan revisi" />
            <QuickLink href="/ruang/prospek" label="Hubungi lead" note="Antrean CRM" />
            <QuickLink href="/ruang/log" label="Buka log" note="Audit dan korelasi" />
          </div>
        </Panel>
      </div>
    </>
  )
}

function QuickLink({
  href,
  label,
  note,
}: {
  href: string
  label: string
  note: string
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center justify-between gap-2 border border-ink/15 px-2.5 py-2 transition-colors hover:border-ink/35 hover:bg-panel/35"
    >
      <span>
        <span className="block text-[11px] font-semibold leading-tight text-ink">
          {label}
        </span>
        <span className="mt-0.5 block text-[9.5px] text-ink-muted">{note}</span>
      </span>
      <ArrowRight className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
    </Link>
  )
}

export function OverviewLive() {
  const { can } = useViewer()

  if (!can("operate")) {
    return <RoleOverviewNotice />
  }

  return <AdminOverviewLive />
}

/**
 * Non-admin roles must not subscribe to the admin-only overview query: a
 * rejected subscription would surface as a render error in the workspace.
 */
function RoleOverviewNotice() {
  const { profile, viewer } = useViewer()

  return (
    <div className="space-y-6">
        <PageHeader
          eyebrow="Ruang kerja"
          title="Ringkasan belum tersambung untuk peran ini."
          description="Fase ini mewujudkan meja pengelola. Ringkasan peserta dan pengajar akan menyusul pada fase belajar; tidak ada data pratinjau yang ditampilkan di sesi langsung."
          meta={
            <span className="text-[10px] text-ink-muted">{profile.user.roleLabel}</span>
          }
        />
        <EmptyState
          title="Belum ada data ringkasan"
          description={
            viewer
              ? "Data nyata untuk peran ini belum memiliki kueri pada fase ini."
              : "Sesi belum terhubung ke Convex."
          }
        />
      </div>
    )
}

function AdminOverviewLive() {
  const { profile } = useViewer()
  const data = useQuery(api.stats.overview)

  if (data === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Hari ini" title="Memuat meja kerja." />
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse border border-ink/15 bg-panel/30"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${formatJakarta(data.generatedAt)} · ${profile.user.region}`}
        title="Hari ini di bangku."
        description="Antrean keputusan, kesehatan integrasi, dan aktivitas terakhir dari catatan nyata. Modul yang belum terhubung ditandai eksplisit."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusStamp label={profile.user.roleLabel} tone="open" />
            <span className="text-[10px] text-ink-muted">{profile.user.region}</span>
            {data.content.freshnessDays !== null ? (
              <span className="text-[10px] text-ink-muted">
                · Konten {data.content.freshnessDays} hari
              </span>
            ) : null}
          </div>
        }
        actions={
          <>
            <Button asChild>
              <Link href="/ruang/prospek">
                Buka antrean lead
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/ruang/log">Lihat log</Link>
            </Button>
          </>
        }
      />
      <AdminLiveOverview data={data} />
      {data.integrations.length === 0 ? (
        <p className="flex items-start gap-2 border border-ink/15 bg-panel/25 px-3 py-2 text-[10.5px] leading-relaxed text-ink-soft">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-[#8a5a16]" aria-hidden="true" />
          Kesehatan gateway, email, WhatsApp, dan LiveKit belum melaporkan status.
          Panel ini akan terisi dari tabel integrationHealth, bukan dari nilai tetap.
        </p>
      ) : null}
    </div>
  )
}
