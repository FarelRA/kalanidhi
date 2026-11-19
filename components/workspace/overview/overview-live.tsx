"use client"

import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  ShoppingBag,
  TriangleAlert,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ActivityFeed } from "@/components/workspace/data/activity-feed"
import { EmptyState } from "@/components/workspace/data/empty-state"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import { api } from "@/convex/_generated/api"
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  WORK_STATUS_LABELS,
  WORK_STATUS_TONES,
} from "@/lib/commerce/options"
import {
  INTEGRATION_STATUS_LABELS,
  INTEGRATION_STATUS_TONES,
} from "@/lib/settings/options"
import type { AdminOverview, LogRow } from "@/lib/admin/types"
import type { ActivityItem } from "@/lib/workspace/types"
import type {
  OverviewEarnings,
  OverviewSession,
  OverviewWork,
  SellerOverview,
  StudentOverview,
  TeacherOverview,
  ViewerOverview,
} from "@/lib/workspace/overview-types"
import {
  formatCompactIDR,
  formatWorkspaceDate,
  formatWorkspaceDateTime,
} from "@/lib/workspace/format"
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
              description="Belum ada antrean operasional yang perlu ditindak."
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
                    ? "-"
                    : `${data.content.freshnessDays} hari`}
                </dd>
              </div>
            </dl>
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href="/ruang/konten">Buka editor konten</Link>
            </Button>
          </Panel>

          <Panel eyebrow="Riwayat audit" title="Aktivitas terakhir">
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

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}

function iso(ms: number): string {
  return new Date(ms).toISOString()
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Hari ini" title="Memuat ringkasan." />
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="h-64 animate-pulse border border-ink/15 bg-panel/30 xl:col-span-7" />
        <div className="space-y-4 xl:col-span-5">
          <div className="h-28 animate-pulse border border-ink/15 bg-panel/30" />
          <div className="h-28 animate-pulse border border-ink/15 bg-panel/30" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse border border-ink/15 bg-panel/30"
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Role-aware overview. The admin query stays operator-only, so every other
 * role reads its own bounded summary instead of a shared table scan.
 */
function RoleOverviewNotice() {
  const data = useQuery(api.overview.viewerOverview)

  if (data === undefined) return <OverviewSkeleton />
  if (data.role === "operator") return <AdminOverviewLive />
  if (data.role === "teacher") return <TeacherOverviewLive data={data} />
  if (data.role === "seller") return <SellerOverviewLive data={data} />
  return <StudentOverviewLive data={data} />
}

function SessionRows({ sessions }: { sessions: OverviewSession[] }) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        title="Belum ada sesi terjadwal"
        description="Jadwal kohort muncul di sini setelah pengajar menetapkan waktunya."
        className="border-0 bg-transparent px-0 py-8"
      />
    )
  }

  return (
    <ul className="divide-y divide-ink/10">
      {sessions.map((session) => (
        <li key={session.id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11.5px] font-semibold leading-snug text-ink">
                {session.title}
              </p>
              <p className="mt-0.5 text-[10px] text-ink-muted">
                {session.cohortCode} · {session.cohortTitle}
              </p>
            </div>
            <span className="shrink-0 text-[10px] font-semibold tabular-nums text-ink-soft">
              {formatWorkspaceDateTime(iso(session.startsAt))}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

function EarningsLines({ earnings }: { earnings: OverviewEarnings }) {
  return (
    <dl className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <dt className="text-[10.5px] text-ink-muted">Sudah dibayar</dt>
        <dd className="text-[12px] font-semibold tabular-nums text-ink">
          {formatCompactIDR(earnings.paid)}
        </dd>
      </div>
      <div className="flex items-center justify-between gap-3">
        <dt className="text-[10.5px] text-ink-muted">Menunggu pencairan</dt>
        <dd className="text-[12px] font-semibold tabular-nums text-ink">
          {formatCompactIDR(earnings.due)}
        </dd>
      </div>
    </dl>
  )
}

function WorkRows({ works }: { works: OverviewWork[] }) {
  if (works.length === 0) {
    return (
      <p className="text-[11px] leading-relaxed text-ink-muted">
        Belum ada karya atas namamu. Karya muncul setelah Kartu Karya lolos
        tinjauan.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-ink/10">
      {works.slice(0, 5).map((work) => (
        <li
          key={work.id}
          className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="truncate text-[11.5px] font-semibold text-ink">
              {work.title}
            </p>
            <p className="mt-0.5 text-[10px] text-ink-muted">
              {work.orderCount} pesanan · {formatCompactIDR(work.price)}
            </p>
          </div>
          <StatusStamp
            label={WORK_STATUS_LABELS[work.status]}
            tone={WORK_STATUS_TONES[work.status]}
          />
        </li>
      ))}
    </ul>
  )
}

function InboxLines({ data }: { data: ViewerOverview }) {
  return (
    <>
      <dl className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[10.5px] text-ink-muted">Pesan belum dibaca</dt>
          <dd className="text-[12px] font-semibold tabular-nums text-ink">
            {data.unreadMessages}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[10.5px] text-ink-muted">Dukungan terbuka</dt>
          <dd className="text-[12px] font-semibold tabular-nums text-ink">
            {data.openTickets}
          </dd>
        </div>
      </dl>
      <div className="mt-3 grid gap-1.5">
        <QuickLink
          href="/ruang/pesan"
          label="Buka pesan"
          note="Percakapan dan dukungan"
        />
        {data.openTickets > 0 ? (
          <QuickLink
            href="/ruang/dukungan"
            label="Lihat dukungan"
            note="Tiket yang masih terbuka"
          />
        ) : null}
      </div>
    </>
  )
}

function StudentOverviewLive({ data }: { data: ViewerOverview }) {
  const student: StudentOverview | null = data.student
  if (!student) return <OverviewSkeleton />

  const active = student.enrollments.filter(
    (enrollment) => enrollment.status === "active",
  )
  const completed = student.enrollments.filter(
    (enrollment) => enrollment.status === "completed",
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${formatJakarta(data.generatedAt)} · ${data.region}`}
        title={`Selamat datang, ${firstName(data.viewerName)}.`}
        description="Progres kelas, tugas terdekat, dan sesi kohortmu dalam satu halaman. Semua angka diambil dari catatan belajar dan pesananmu."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusStamp label={data.roleLabel} tone="open" />
            <span className="text-[10px] text-ink-muted">{data.region}</span>
          </div>
        }
        actions={
          <>
            <Button asChild>
              <Link href="/ruang/belajar">
                Buka belajar
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/ruang/tugas">Lihat tugas</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-7"
          eyebrow="Kelas"
          title="Progres belajar"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/ruang/belajar">
                Semua kelas
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          }
        >
          {student.enrollments.length === 0 ? (
            <EmptyState
              title="Belum ada kelas aktif"
              description="Pendaftaranmu muncul setelah pembayaran dikonfirmasi."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/ruang/pesanan">Lihat pesanan</Link>
                </Button>
              }
              className="border-0 bg-transparent px-0 py-8"
            />
          ) : (
            <ul className="divide-y divide-ink/10">
              {[...active, ...completed].map((enrollment) => (
                <li
                  key={enrollment.id}
                  className="py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-ink">
                        {enrollment.pathTitle}
                      </p>
                      <p className="mt-0.5 text-[10px] text-ink-muted">
                        {enrollment.cohortCode
                          ? `${enrollment.cohortCode} · ${enrollment.cohortTitle}`
                          : "Belum masuk kohort"}
                      </p>
                    </div>
                    <StatusStamp
                      label={
                        enrollment.status === "active" ? "Aktif" : "Selesai"
                      }
                      tone={enrollment.status === "active" ? "progress" : "done"}
                    />
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 bg-ink/10">
                      <div
                        className="h-full bg-copper"
                        style={{ width: `${enrollment.progress}%` }}
                      />
                    </div>
                    <span className="w-9 text-right text-[10px] font-semibold tabular-nums text-ink-soft">
                      {enrollment.progress}%
                    </span>
                  </div>
                  <p className="mt-1.5 text-[10px] leading-snug text-ink-muted">
                    {enrollment.totalLessons === 0
                      ? "Kurikulum kelas ini belum diterbitkan."
                      : enrollment.nextLesson
                        ? `Berikutnya, ${enrollment.nextLesson}`
                        : "Semua pelajaran selesai."}
                    {enrollment.deadlineAt
                      ? ` · Batas ${formatWorkspaceDate(iso(enrollment.deadlineAt))}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-4 xl:col-span-5">
          <Panel
            eyebrow="Jadwal"
            title="Sesi berikutnya"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/ruang/jadwal">Jadwal</Link>
              </Button>
            }
          >
            <SessionRows sessions={data.upcomingSessions} />
          </Panel>

          <Panel eyebrow="Tugas" title="Menunggu">
            <dl className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[10.5px] text-ink-muted">Perlu dikirim</dt>
                <dd className="text-[12px] font-semibold tabular-nums text-ink">
                  {student.pendingSubmissions}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[10.5px] text-ink-muted">
                  Menunggu penilaian
                </dt>
                <dd className="text-[12px] font-semibold tabular-nums text-ink">
                  {student.awaitingAssessment}
                </dd>
              </div>
            </dl>
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href="/ruang/tugas">
                <ClipboardCheck aria-hidden="true" />
                Buka tugas
              </Link>
            </Button>
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          eyebrow="Kredensial"
          title="Sertifikat"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/ruang/kredensial">Semua</Link>
            </Button>
          }
        >
          {student.latestCertificate ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">
                {student.latestCertificate.pathTitle}
              </p>
              <p className="mt-1 font-heading text-xl text-ink">
                {student.latestCertificate.publicCode}
              </p>
              <p className="mt-1 text-[10.5px] text-ink-muted">
                Terbit{" "}
                {formatWorkspaceDate(iso(student.latestCertificate.issuedAt))}
              </p>
              <p className="mt-3 text-[10.5px] leading-relaxed text-ink-soft">
                {student.issuedCertificates} sertifikat terbit atas namamu.
              </p>
            </>
          ) : (
            <EmptyState
              title="Belum ada sertifikat"
              description="Sertifikat terbit setelah penilaian akhir disetujui."
              className="border-0 bg-transparent px-0 py-6"
            />
          )}
        </Panel>

        <Panel
          eyebrow="Pesanan"
          title="Pembelian terakhir"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/ruang/pesanan">Semua</Link>
            </Button>
          }
        >
          {student.recentOrders.length === 0 ? (
            <p className="text-[11px] leading-relaxed text-ink-muted">
              Belum ada pembelian. Pesanan kelas dan karya muncul di sini.
            </p>
          ) : (
            <ul className="divide-y divide-ink/10">
              {student.recentOrders.map((order) => (
                <li key={order.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] font-semibold text-ink">
                        {order.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-ink-muted">
                        {order.code} ·{" "}
                        {formatWorkspaceDate(iso(order.createdAt))}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-semibold tabular-nums text-ink">
                        {formatCompactIDR(order.amount)}
                      </p>
                      <StatusStamp
                        label={ORDER_STATUS_LABELS[order.status]}
                        tone={ORDER_STATUS_TONES[order.status]}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel eyebrow="Kotak masuk" title="Pesan & dukungan">
          <InboxLines data={data} />
        </Panel>
      </div>
    </div>
  )
}

function TeacherOverviewLive({ data }: { data: ViewerOverview }) {
  const teacher: TeacherOverview | null = data.teacher
  if (!teacher) return <OverviewSkeleton />

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${formatJakarta(data.generatedAt)} · ${data.region}`}
        title={`Hari mengajar, ${firstName(data.viewerName)}.`}
        description="Kohort yang kamu ampu, tugas yang menunggu penilaian, dan pendapatan dari karya serta bagi hasil pengajaran."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusStamp label={data.roleLabel} tone="open" />
            <span className="text-[10px] text-ink-muted">{data.region}</span>
          </div>
        }
        actions={
          <>
            <Button asChild>
              <Link href="/ruang/tugas">
                Nilai tugas
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/ruang/belajar">Buka kohort</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-7"
          eyebrow="Kohort"
          title="Kohort yang diampu"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/ruang/belajar">
                Semua kohort
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          }
        >
          {teacher.cohorts.length === 0 ? (
            <EmptyState
              title="Belum ada kohort"
              description="Kohort muncul setelah pengelola menetapkan kelas dan jadwal untukmu."
              className="border-0 bg-transparent px-0 py-8"
            />
          ) : (
            <ul className="divide-y divide-ink/10">
              {teacher.cohorts.map((cohort) => (
                <li
                  key={cohort.id}
                  className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-ink">
                      {cohort.code} · {cohort.title}
                    </p>
                    <p className="mt-0.5 text-[10px] text-ink-muted">
                      {cohort.pathTitle} · {cohort.studentCount} peserta
                    </p>
                    <p className="mt-1 text-[10px] text-ink-muted">
                      {cohort.nextSessionAt
                        ? `Sesi berikutnya ${formatWorkspaceDateTime(
                            iso(cohort.nextSessionAt),
                          )}`
                        : "Belum ada sesi berikutnya"}
                    </p>
                  </div>
                  <StatusStamp
                    label={
                      cohort.status === "active"
                        ? "Berjalan"
                        : cohort.status === "enrolling"
                          ? "Pendaftaran"
                          : cohort.status === "completed"
                            ? "Selesai"
                            : cohort.status === "draft"
                              ? "Draf"
                              : "Dibatalkan"
                    }
                    tone={
                      cohort.status === "active"
                        ? "progress"
                        : cohort.status === "enrolling"
                          ? "open"
                          : cohort.status === "completed"
                            ? "done"
                            : "muted"
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-4 xl:col-span-5">
          <Panel eyebrow="Penilaian" title="Menunggu penilaian">
            <p className="font-heading text-3xl leading-none text-ink tabular-nums">
              {teacher.awaitingAssessment}
            </p>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-muted">
              {teacher.completedAssessmentsThisMonth} penilaian selesai bulan
              ini.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href="/ruang/tugas">
                <ClipboardCheck aria-hidden="true" />
                Buka penilaian
              </Link>
            </Button>
          </Panel>

          <Panel
            eyebrow="Jadwal"
            title="Sesi berikutnya"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/ruang/jadwal">Jadwal</Link>
              </Button>
            }
          >
            <SessionRows sessions={data.upcomingSessions} />
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          eyebrow="Pendapatan"
          title="Bagi hasil"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/ruang/pesanan/payout">Rincian</Link>
            </Button>
          }
        >
          <EarningsLines earnings={teacher.earnings} />
          <p className="mt-3 text-[10px] leading-relaxed text-ink-muted">
            Dihitung dari alokasi payout untuk karya dan kelas yang kamu ampu.
          </p>
        </Panel>

        <Panel
          eyebrow="Karya"
          title="Karya atas namamu"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/ruang/karya">Semua</Link>
            </Button>
          }
        >
          <WorkRows works={teacher.works} />
        </Panel>

        <Panel eyebrow="Kotak masuk" title="Pesan & dukungan">
          <InboxLines data={data} />
        </Panel>
      </div>
    </div>
  )
}

function SellerOverviewLive({ data }: { data: ViewerOverview }) {
  const seller: SellerOverview | null = data.seller
  if (!seller) return <OverviewSkeleton />

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${formatJakarta(data.generatedAt)} · ${data.region}`}
        title={`Karya dan pesanan, ${firstName(data.viewerName)}.`}
        description="Karya yang kamu terbitkan, pesanan yang masuk, dan pendapatan yang sudah dibayar atau masih menunggu pencairan."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusStamp label={data.roleLabel} tone="open" />
            <span className="text-[10px] text-ink-muted">{data.region}</span>
          </div>
        }
        actions={
          <>
            <Button asChild>
              <Link href="/ruang/karya">
                Kelola karya
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/ruang/pesanan">Lihat pesanan</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-7"
          eyebrow="Karya"
          title="Karya yang dijual"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/ruang/karya">
                Semua karya
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          }
        >
          {seller.works.length === 0 ? (
            <EmptyState
              title="Belum ada karya"
              description="Karya muncul di sini setelah Kartu Karya lolos tinjauan."
              className="border-0 bg-transparent px-0 py-8"
            />
          ) : (
            <WorkRows works={seller.works} />
          )}
        </Panel>

        <div className="space-y-4 xl:col-span-5">
          <Panel
            eyebrow="Pesanan"
            title="Pesanan karya"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/ruang/pesanan">Semua</Link>
              </Button>
            }
          >
            <p className="font-heading text-3xl leading-none text-ink tabular-nums">
              {seller.workOrders}
            </p>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-muted">
              Pesanan yang tercatat untuk karya atas namamu.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href="/ruang/pesanan">
                <ShoppingBag aria-hidden="true" />
                Buka pesanan
              </Link>
            </Button>
          </Panel>

          <Panel
            eyebrow="Pendapatan"
            title="Bagi hasil"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/ruang/pesanan/payout">Rincian</Link>
              </Button>
            }
          >
            <EarningsLines earnings={seller.earnings} />
            <p className="mt-3 text-[10px] leading-relaxed text-ink-muted">
              Dihitung dari alokasi payout setiap pesanan yang dibayar.
            </p>
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel eyebrow="Kotak masuk" title="Pesan & dukungan">
          <InboxLines data={data} />
        </Panel>
        <Panel eyebrow="Pintasan" title="Langkah berikutnya">
          <div className="grid gap-1.5">
            <QuickLink
              href="/ruang/karya"
              label="Perbarui karya"
              note="Kartu Karya dan status terbit"
            />
            <QuickLink
              href="/ruang/pesanan"
              label="Cek pesanan"
              note="Pembayaran dan pengiriman"
            />
            <QuickLink
              href="/ruang/pesanan/payout"
              label="Lihat pendapatan"
              note="Payout dan riwayat pencairan"
            />
          </div>
        </Panel>
        <Panel eyebrow="Kelas" title="Belajar lagi">
          <p className="text-[11px] leading-relaxed text-ink-soft">
            Kelas yang selesai membuka karya baru. Sertifikat terbit setelah
            penilaian akhir disetujui.
          </p>
          <div className="mt-3 grid gap-1.5">
            <QuickLink
              href="/ruang/belajar"
              label="Buka kelas"
              note="Kurikulum dan kohort"
            />
            <QuickLink
              href="/ruang/kredensial"
              label="Lihat kredensial"
              note="Sertifikat yang terbit"
            />
          </div>
        </Panel>
      </div>
    </div>
  )
}


function AdminOverviewLive() {
  const { profile } = useViewer()
  const data = useQuery(api.stats.overview)

  if (data === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Hari ini" title="Memuat ringkasan." />
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
        title="Ringkasan hari ini."
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
