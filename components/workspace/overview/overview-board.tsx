"use client"

import Link from "next/link"
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  FileText,
  MessageSquare,
  Store,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ActivityFeed } from "@/components/workspace/data/activity-feed"
import { MetricStrip } from "@/components/workspace/data/metric-ruler"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { QueueList } from "@/components/workspace/data/queue-list"
import { RoleTag } from "@/components/workspace/data/role-tag"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import {
  activityFeed,
  adminMetrics,
  adminQueues,
  certificates,
  cohorts,
  enrollments,
  gatewayHealth,
  paths,
  payouts,
  scheduleSessions,
  studentMetrics,
  studentQueues,
  submissions,
  teacherMetrics,
  teacherQueues,
  works,
} from "@/lib/workspace/mock-data"
import { formatIDR } from "@/lib/format"
import { cn } from "cn"

export function OverviewBoard() {
  const { can, profile } = useViewer()
  const admin = can("operate")
  const teacher = can("teach")
  const learner = can("learn")

  const title = admin
    ? "Hari ini di bangku."
    : teacher && learner
      ? "Mengajar dan belajar hari ini."
      : teacher
        ? "Kelas yang kamu pegang."
        : "Bangku belajarmu."

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rabu, 11 November 2026 · Yogyakarta"
        title={title}
        description={
          admin
            ? "Satu meja kerja untuk seluruh operasi: antrean keputusan, kesehatan gerbang, dan aktivitas terakhir."
            : teacher
              ? "Antrean penilaian, sesi terdekat, peserta yang perlu ditemui, dan pendapatan berjalan."
              : "Lanjutkan jalur, kirim tugas, cek kredensial, dan siapkan karya berikutnya."
        }
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <RoleTag
              role={admin ? "pengelola" : teacher ? "pengajar" : "peserta"}
              label={profile.user.roleLabel}
            />
            <span className="text-[10px] text-ink-muted">
              {profile.user.region}
            </span>
            {can("sell") ? (
              <span className="text-[10px] text-ink-muted">
                · Penjual aktif
              </span>
            ) : null}
          </div>
        }
        actions={
          <>
            {admin ? (
              <Button asChild>
                <Link href="/ruang/pesanan/pembayaran">
                  Rekonsiliasi pembayaran
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : teacher ? (
              <Button asChild>
                <Link href="/ruang/tugas">
                  Buka antrean penilaian
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/ruang/tugas">
                  Lanjutkan tugas
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/ruang/pesan">Pesan</Link>
            </Button>
          </>
        }
      />

      {admin ? <AdminOverview /> : null}
      {teacher ? <TeacherOverview /> : null}
      {learner ? <StudentOverview /> : null}
    </div>
  )
}

function AdminOverview() {
  return (
    <>
      <MetricStrip metrics={adminMetrics} />

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-7"
          title="Perlu keputusan"
          eyebrow="Antrean pengelola"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/ruang/alur">
                Semua alur
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          }
        >
          <QueueList items={adminQueues} />
        </Panel>

        <div className="space-y-4 xl:col-span-5">
          <Panel
            title="Kesehatan sistem"
            eyebrow="Integrasi"
            action={
              <StatusStamp label="1 peringatan" tone="wait" />
            }
          >
            <ul className="divide-y divide-ink/10">
              {gatewayHealth.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-semibold text-ink">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-[10px] text-ink-muted">
                      {item.note}
                    </p>
                  </div>
                  <StatusStamp label={item.status} tone={item.tone} />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Aktivitas terakhir"
            eyebrow="Jejak audit"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/ruang/log">Lihat log</Link>
              </Button>
            }
          >
            <ActivityFeed items={activityFeed.slice(0, 5)} />
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel eyebrow="Hari ini" title="Antrean operasi">
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Lead baru" value="2" note="1 institusi" />
            <MiniStat label="Tugas lewat SLA" value="4" note="2 jalur" tone="danger" />
            <MiniStat label="Karya menunggu" value="2" note="satu lintas jalur" tone="wait" />
            <MiniStat label="Payout jatuh tempo" value="3" note="Rp12,7 jt" />
          </div>
        </Panel>
        <Panel eyebrow="Keuangan" title="Ringkas bulan ini">
          <dl className="space-y-2.5">
            <Row label="GMV" value="Rp38.400.000" />
            <Row label="Refund" value="−Rp2.500.000" />
            <Row label="Biaya gerbang" value="−Rp1.800.000" />
            <Row label="Payout menunggu" value="Rp12.685.000" strong />
          </dl>
          <Button asChild variant="outline" size="sm" className="mt-4 w-full">
            <Link href="/ruang/pesanan/payout">Buka ledger 70/15/15</Link>
          </Button>
        </Panel>
        <Panel eyebrow="Pintasan" title="Tindakan cepat">
          <div className="grid gap-1.5">
            <QuickLink href="/ruang/orang" icon={<Users />} label="Undang pengelola" note="MFA wajib" />
            <QuickLink href="/ruang/konten" icon={<FileText />} label="Terbitkan konten" note="Draf v18" />
            <QuickLink href="/ruang/pesanan/pembayaran" icon={<CreditCard />} label="Cocokkan transfer" note="2 antrean" />
            <QuickLink href="/ruang/prospek" icon={<Store />} label="Hubungi lead" note="1 institusi" />
          </div>
        </Panel>
      </div>
    </>
  )
}

function TeacherOverview() {
  const myCohorts = cohorts.filter((cohort) => cohort.teacher === "Bambang Hardjono")
  const atRisk = enrollments.filter(
    (item) => item.status === "at_risk" && item.cohortId.startsWith("c-batik"),
  )
  const upcoming = scheduleSessions.filter(
    (item) => item.teacher === "Bambang Hardjono",
  )
  const duePayout = payouts.find((item) => item.id === "po-310")

  return (
    <section aria-labelledby="mengajar-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="mengajar-heading" className="heading-quiet">
          Meja mengajar
        </h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          {myCohorts.length} kohort · {upcoming.length} sesi terdekat
        </p>
      </div>
      <MetricStrip metrics={teacherMetrics} />

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-7"
          eyebrow="Penilaian"
          title="Antrean yang menunggu"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/ruang/tugas">
                Buka penilaian
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          }
        >
          <QueueList items={teacherQueues.slice(0, 4)} />
        </Panel>

        <div className="space-y-4 xl:col-span-5">
          <Panel eyebrow="Jadwal" title="Sesi terdekat">
            <ul className="divide-y divide-ink/10">
              {upcoming.slice(0, 3).map((session) => (
                <li key={session.id} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex w-14 shrink-0 flex-col items-center justify-center border border-ink/20 bg-panel/40 px-1 py-1.5 text-center">
                    <span className="text-[8px] font-bold uppercase tracking-[0.06em] text-ink-muted">
                      {session.day}
                    </span>
                    <span className="font-heading text-base leading-tight text-ink">
                      {session.time}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-semibold leading-snug text-ink">
                      {session.title}
                    </p>
                    <p className="mt-0.5 text-[10px] text-ink-muted">
                      {session.cohort} · {session.duration} · {session.mode}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" size="sm" className="mt-3 w-full">
              <Link href="/ruang/jadwal">Atur ketersediaan</Link>
            </Button>
          </Panel>

          <Panel eyebrow="Peserta" title="Perlu ditemui">
            {atRisk.length ? (
              <ul className="divide-y divide-ink/10">
                {atRisk.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-semibold text-ink">
                        {item.student}
                      </p>
                      <p className="mt-0.5 text-[10px] text-ink-muted">
                        {item.nextTask}
                      </p>
                    </div>
                    <StatusStamp label="Berisiko" tone="danger" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] text-ink-muted">
                Semua peserta aktif dalam 7 hari terakhir.
              </p>
            )}
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel eyebrow="Kohort" title="Roster dan progres">
          <ul className="divide-y divide-ink/10">
            {myCohorts.map((cohort) => (
              <li key={cohort.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold text-ink">
                    {cohort.code} · {cohort.pathTitle}
                  </p>
                  <StatusStamp label={cohort.statusLabel} tone={cohort.status} />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="h-1.5 flex-1 bg-panel">
                    <span
                      className="block h-full bg-copper-dark"
                      style={{ width: `${Math.round((cohort.enrolled / cohort.capacity) * 100)}%` }}
                    />
                  </span>
                  <span className="text-[9.5px] tabular-nums text-ink-muted">
                    {cohort.enrolled}/{cohort.capacity} · {cohort.atRisk} berisiko
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel eyebrow="Pendapatan" title="70% dari penjualan">
          <p className="font-heading text-3xl leading-none text-ink">
            {formatIDR(duePayout?.teacherShare ?? 0)}
          </p>
          <p className="mt-1.5 text-[11px] text-ink-muted">
            {duePayout?.period} · {duePayout?.orders} pesanan
          </p>
          <dl className="mt-4 grid grid-cols-3 gap-2 border-y border-ink/15 py-3 text-center">
            <div>
              <dt className="text-[8px] font-bold uppercase tracking-[0.06em] text-ink-muted">Pengajar</dt>
              <dd className="mt-1 text-[12px] font-semibold text-ink">70%</dd>
            </div>
            <div>
              <dt className="text-[8px] font-bold uppercase tracking-[0.06em] text-ink-muted">Platform</dt>
              <dd className="mt-1 text-[12px] font-semibold text-ink">15%</dd>
            </div>
            <div>
              <dt className="text-[8px] font-bold uppercase tracking-[0.06em] text-ink-muted">Komunitas</dt>
              <dd className="mt-1 text-[12px] font-semibold text-ink">15%</dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/ruang/pesanan/payout">Lihat statement</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/ruang/pesanan">Pesanan</Link>
            </Button>
          </div>
        </Panel>
      </div>
    </section>
  )
}

function StudentOverview() {
  const certificate = certificates.find((item) => item.student === "Anisa Rahmawati")
  const myWorks = works.filter((item) => item.maker === "Anisa Rahmawati")
  const openTasks = submissions.filter(
    (item) => item.student === "Anisa Rahmawati" && !["approved", "rejected"].includes(item.status),
  )

  return (
    <section aria-labelledby="belajar-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="belajar-heading" className="heading-quiet">
          Meja belajar
        </h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          Batik Tulis Soga · BTG-06
        </p>
      </div>
      <MetricStrip metrics={studentMetrics} />

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-7"
          eyebrow="Langkah berikutnya"
          title="Hari ini"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/ruang/tugas">Semua tugas</Link>
            </Button>
          }
        >
          <QueueList items={studentQueues} />
        </Panel>

        <div className="space-y-4 xl:col-span-5">
          <Panel eyebrow="Kredensial" title="Sertifikat dan Kartu Karya">
            {certificate ? (
              <>
                <div className="border border-ink/25 bg-panel/35 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-copper-dark">
                        Sertifikat platform
                      </p>
                      <p className="mt-1 font-heading text-[1.15rem] leading-tight text-ink">
                        {certificate.pathTitle}
                      </p>
                    </div>
                    <StatusStamp label={certificate.statusLabel} tone={certificate.tone} />
                  </div>
                  <p className="mt-2 text-[10px] text-ink-muted">
                    {certificate.serial} · {certificate.workCard}
                  </p>
                  <div className="mt-2 border-t border-ink/15 pt-2 text-[10px] text-ink-soft">
                    Kode verifikasi:{" "}
                    <span className="font-semibold text-ink">
                      {certificate.publicCode}
                    </span>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                  <Link href="/ruang/kredensial">Buka kredensial</Link>
                </Button>
              </>
            ) : (
              <p className="text-[12px] text-ink-muted">
                Sertifikat terbit setelah tugas terakhir disetujui.
              </p>
            )}
          </Panel>

          <Panel eyebrow="Penjualan" title="Karya dan pesanan">
            {myWorks.length ? (
              <ul className="divide-y divide-ink/10">
                {myWorks.map((work) => (
                  <li key={work.id} className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] font-semibold text-ink">
                        {work.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-ink-muted">
                        {formatIDR(work.price)} · {work.workCard}
                      </p>
                    </div>
                    <StatusStamp label={work.statusLabel} tone={work.tone} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] text-ink-muted">
                Belum ada karya. Sertifikat membuka ruang penjual.
              </p>
            )}
            <Button asChild variant="outline" size="sm" className="mt-3 w-full">
              <Link href="/ruang/karya">
                {openTasks.length ? "Buka karya" : "Mulai karya pertama"}
              </Link>
            </Button>
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel eyebrow="Jalur" title="Progres belajar">
          <div className="space-y-3">
            {paths
              .filter((path) => path.status === "Terbuka")
              .map((path) => (
                <div key={path.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11.5px] font-semibold text-ink">
                      {path.title}
                    </p>
                    <span className="text-[10px] font-bold tabular-nums text-ink-muted">
                      {path.id === "batik-tulis-soga" ? "82%" : "68%"}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 bg-panel">
                    <div
                      className="h-full bg-copper-dark"
                      style={{ width: path.id === "batik-tulis-soga" ? "82%" : "68%" }}
                    />
                  </div>
                </div>
              ))}
          </div>
          <Button asChild variant="outline" size="sm" className="mt-4 w-full">
            <Link href="/ruang/belajar">Buka jalur</Link>
          </Button>
        </Panel>
        <Panel eyebrow="Jadwal" title="Sesi terdekat">
          <ul className="space-y-3">
            {scheduleSessions.slice(0, 3).map((session) => (
              <li key={session.id} className="flex items-start gap-2.5">
                <CalendarDays className="mt-0.5 size-3.5 shrink-0 text-copper-dark" aria-hidden="true" />
                <div>
                  <p className="text-[11px] font-semibold leading-snug text-ink">
                    {session.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-ink-muted">
                    {session.day}, {session.time} · {session.mode}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel eyebrow="Bantuan" title="Butuh ditemani?">
          <p className="text-[12px] leading-relaxed text-ink-soft">
            Tanya pengajar lewat pesan, kirim catatan suara, atau jadwalkan
            panggilan pada jam kantor.
          </p>
          <div className="mt-3 grid gap-1.5">
            <QuickLink href="/ruang/pesan" icon={<MessageSquare />} label="Buka pesan" note="2 belum dibaca" />
            <QuickLink href="/ruang/panggilan" icon={<CalendarDays />} label="Jadwalkan panggilan" note="16.00 tersedia" />
          </div>
        </Panel>
      </div>
    </section>
  )
}

function MiniStat({
  label,
  value,
  note,
  tone,
}: {
  label: string
  value: string
  note: string
  tone?: "danger" | "wait"
}) {
  return (
    <div className="border border-ink/15 bg-paper/50 p-2.5">
      <p className="text-[8px] font-bold uppercase tracking-[0.07em] text-ink-muted">
        {label}
      </p>
      <p className={cn("mt-1 font-heading text-xl leading-none text-ink", tone === "danger" && "text-[#9a3423]", tone === "wait" && "text-[#8a5a16]")}>
        {value}
      </p>
      <p className="mt-1 text-[9px] leading-snug text-ink-muted">{note}</p>
    </div>
  )
}

function Row({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={cn("text-[10.5px]", strong ? "font-semibold text-ink" : "text-ink-muted")}>
        {label}
      </dt>
      <dd className={cn("text-[11px] tabular-nums", strong ? "font-semibold text-ink" : "text-ink-soft")}>
        {value}
      </dd>
    </div>
  )
}

function QuickLink({
  href,
  icon,
  label,
  note,
}: {
  href: string
  icon: React.ReactNode
  label: string
  note: string
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center gap-2.5 border border-ink/15 px-2.5 py-2 transition-colors hover:border-ink/35 hover:bg-panel/35"
    >
      <span className="flex size-7 shrink-0 items-center justify-center border border-ink/15 text-copper-dark [&_svg]:size-3.5">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold leading-tight text-ink">
          {label}
        </span>
        <span className="mt-0.5 block text-[9.5px] text-ink-muted">{note}</span>
      </span>
      <ArrowRight className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
    </Link>
  )
}
