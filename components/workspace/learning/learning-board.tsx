"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Clock3 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import {
  certificates,
  cohorts,
  enrollments,
  paths,
} from "@/lib/workspace/mock-data"
import type { Cohort, Enrollment } from "@/lib/workspace/types"
import { formatIDR } from "@/lib/format"
import { formatWorkspaceDate } from "@/lib/workspace/format"

export function LearningBoard() {
  const { can } = useViewer()
  const [tab, setTab] = React.useState("jalur")
  const [cohort, setCohort] = React.useState<Cohort | null>(null)
  const [enrollment, setEnrollment] = React.useState<Enrollment | null>(null)

  const tabs = [
    can("learn") && { id: "jalur", label: "Jalur saya" },
    (can("teach") || can("operate")) && {
      id: "kohort",
      label: can("operate") ? "Semua kohort" : "Kohort saya",
      count: can("operate") ? cohorts.length : 3,
    },
    (can("teach") || can("operate")) && {
      id: "peserta",
      label: "Peserta",
      count: enrollments.length,
    },
    can("operate") && {
      id: "katalog",
      label: "Katalog jalur",
      count: paths.length,
    },
  ].filter(Boolean) as { id: string; label: string; count?: number }[]

  const activeTab = tabs.some((item) => item.id === tab) ? tab : tabs[0]?.id

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Belajar & mengajar"
        title={
          can("operate")
            ? "Jalur, kohort, dan peserta."
            : can("teach")
              ? "Kohort yang kamu pegang."
              : "Jalur yang sedang kamu jalani."
        }
        description={
          can("operate")
            ? "Satu pandangan atas katalog, kohort berjalan, kapasitas, dan peserta yang perlu perhatian."
            : can("teach")
              ? "Roster, kapasitas, sesi berikutnya, dan peserta yang perlu ditemui."
              : "Modul, tugas, kehadiran, dan langkah berikutnya di setiap jalur."
        }
        actions={
          can("operate") ? (
            <Button onClick={() => toast("Kohort baru", { description: "Formulir kohort baru dibuka." })}>
              Buat kohort
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/ruang/jadwal">Lihat jadwal</Link>
            </Button>
          )
        }
      />

      <SegmentedTabs
        tabs={tabs}
        value={activeTab ?? "jalur"}
        onChange={setTab}
        ariaLabel="Pilih tampilan belajar"
      />

      {activeTab === "jalur" ? <StudentPaths /> : null}
      {activeTab === "kohort" ? (
        <CohortTable onSelect={setCohort} />
      ) : null}
      {activeTab === "peserta" ? (
        <EnrollmentTable onSelect={setEnrollment} />
      ) : null}
      {activeTab === "katalog" ? <PathCatalog /> : null}

      <DetailDrawer
        open={Boolean(cohort)}
        onOpenChange={(open) => {
          if (!open) setCohort(null)
        }}
        eyebrow="Kohort"
        title={cohort ? `${cohort.code} · ${cohort.pathTitle}` : ""}
        stamp={cohort?.statusLabel}
        tone={cohort?.status}
        description={
          cohort
            ? `${cohort.teacher} · ${cohort.enrolled} dari ${cohort.capacity} kursi terisi`
            : undefined
        }
        footer={
          cohort ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" className="flex-1">
                <Link href="/ruang/pesan">Pesan kohort</Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  toast("Roster dikirim", {
                    description: "Tautan roster kohort disalin untuk pengajar.",
                  })
                }
              >
                Salin roster
              </Button>
            </div>
          ) : undefined
        }
      >
        {cohort ? (
          <>
            <DetailGrid
              items={[
                { label: "Jalur", value: cohort.pathTitle },
                { label: "Pengajar", value: cohort.teacher },
                { label: "Mulai", value: formatWorkspaceDate(cohort.startDate) },
                { label: "Selesai", value: formatWorkspaceDate(cohort.endDate) },
                { label: "Kursi", value: `${cohort.enrolled} / ${cohort.capacity}` },
                { label: "Selesai", value: `${cohort.completed} peserta` },
                { label: "Sesi berikutnya", value: cohort.nextSession },
                { label: "Peserta berisiko", value: `${cohort.atRisk} peserta` },
              ]}
            />
            <DrawerSection title="Roster">
              <ul className="divide-y divide-ink/10 border-y border-ink/10">
                {enrollments
                  .filter((item) => item.cohortId === cohort.id)
                  .map((item) => (
                    <li key={item.id} className="flex items-center gap-2.5 py-2.5">
                      <span className="flex size-7 shrink-0 items-center justify-center border border-ink/20 bg-panel/40 font-heading text-[9px] font-semibold">
                        {item.initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11.5px] font-semibold text-ink">
                          {item.student}
                        </span>
                        <span className="mt-0.5 block text-[9.5px] text-ink-muted">
                          {item.progress}% · {item.nextTask}
                        </span>
                      </span>
                      <StatusStamp
                        label={item.status === "at_risk" ? "Berisiko" : item.status === "completed" ? "Selesai" : "Aktif"}
                        tone={item.status === "at_risk" ? "danger" : item.status === "completed" ? "done" : "progress"}
                      />
                    </li>
                  ))}
              </ul>
              {enrollments.filter((item) => item.cohortId === cohort.id).length === 0 ? (
                <p className="mt-3 text-[12px] text-ink-muted">
                  Roster lengkap tersedia di modul peserta. Kohort ini belum memiliki
                  pendaftaran pada kohort ini.
                </p>
              ) : null}
            </DrawerSection>
          </>
        ) : null}
      </DetailDrawer>

      <DetailDrawer
        open={Boolean(enrollment)}
        onOpenChange={(open) => {
          if (!open) setEnrollment(null)
        }}
        eyebrow="Pendaftaran"
        title={enrollment?.student ?? ""}
        description={enrollment ? enrollment.pathTitle : undefined}
        stamp={enrollment?.status === "at_risk" ? "Berisiko" : undefined}
        tone="danger"
      >
        {enrollment ? (
          <>
            <DetailGrid
              items={[
                { label: "Kohort", value: enrollment.cohortId },
                { label: "Progres", value: `${enrollment.progress}%` },
                { label: "Aktivitas terakhir", value: formatWorkspaceDate(enrollment.lastActive) },
                { label: "Langkah berikut", value: enrollment.nextTask },
                {
                  label: "Sertifikat",
                  value: enrollment.certificateId
                    ? certificates.find((item) => item.id === enrollment.certificateId)?.serial ?? "Terbit"
                    : "Belum terbit",
                },
              ]}
            />
            <DrawerSection title="Tindakan">
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href="/ruang/pesan">Kirim pesan</Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toast("Pengingat dikirim", {
                      description: `${enrollment.student} menerima pengingat tugas lewat WhatsApp.`,
                    })
                  }
                >
                  Kirim pengingat
                </Button>
              </div>
            </DrawerSection>
          </>
        ) : null}
      </DetailDrawer>
    </div>
  )
}

function StudentPaths() {
  const myCerts = certificates.filter((item) => item.student === "Anisa Rahmawati")
  const active = [
    {
      path: paths[0],
      progress: 82,
      next: "Tugas 03 · Pewarnaan soga",
      due: "Batas 12 November",
      session: "Kamis, 12 Nov · 19.30",
      completed: 6,
      modules: 8,
    },
    {
      path: paths[1],
      progress: 68,
      next: "Tugas 02 · Susunan acara",
      due: "Batas 16 November",
      session: "Sabtu, 14 Nov · 10.00",
      completed: 4,
      modules: 6,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {active.map((item) => (
          <article
            key={item.path.id}
            className="group border border-ink/20 bg-paper-2 shadow-[3px_3px_0_rgba(32,19,13,0.06)]"
          >
            <div className="relative h-36 overflow-hidden border-b border-ink/20 bg-panel">
              <Image
                src={item.path.image}
                alt={item.path.title}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-ink/85 p-3">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-brass">
                    {item.path.code}
                  </p>
                  <h2 className="mt-0.5 font-heading text-xl leading-tight text-paper">
                    {item.path.title}
                  </h2>
                </div>
                <StatusStamp
                  label={item.progress === 100 ? "Selesai" : "Berjalan"}
                  tone={item.progress === 100 ? "done" : "progress"}
                  className="border-paper/40 bg-paper/10 text-paper"
                />
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <span className="font-bold uppercase tracking-[0.07em] text-ink-muted">
                  Progres {item.progress}%
                </span>
                <span className="text-ink-muted">
                  {item.completed}/{item.modules} modul
                </span>
              </div>
              <div className="mt-1.5 flex gap-1" aria-hidden="true">
                {Array.from({ length: item.modules }).map((_, index) => (
                  <span
                    key={index}
                    className={`h-2 flex-1 border border-ink/15 ${
                      index < item.completed ? "bg-copper-dark" : "bg-panel/50"
                    }`}
                  />
                ))}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-ink/15 py-3">
                <div>
                  <dt className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                    Langkah berikut
                  </dt>
                  <dd className="mt-1 text-[11px] font-semibold leading-snug text-ink">
                    {item.next}
                  </dd>
                </div>
                <div>
                  <dt className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                    Sesi
                  </dt>
                  <dd className="mt-1 text-[11px] leading-snug text-ink">
                    {item.session}
                  </dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" className="flex-1">
                  <Link href="/ruang/tugas">
                    Buka tugas
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/ruang/jadwal">Jadwal</Link>
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel eyebrow="Modul" title="Peta Batik Tulis Soga" className="lg:col-span-2">
          <ol className="divide-y divide-ink/10">
            {[
              ["01", "Alat, bahan, dan keselamatan", "Selesai", "done"],
              ["02", "Canting dan malam", "Selesai", "done"],
              ["03", "Pola dan garis tepi", "Selesai", "done"],
              ["04", "Pewarnaan soga pertama", "Dinilai", "progress"],
              ["05", "Pencucian dan fiksasi", "Sedang berjalan", "open"],
              ["06", "Pewarnaan kedua", "Terkunci", "muted"],
              ["07", "Penyelesaian tepi", "Terkunci", "muted"],
              ["08", "Kartu Karya dan presentasi", "Terkunci", "muted"],
            ].map(([code, label, status, tone], index) => (
              <li key={code} className="flex items-center gap-3 py-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center border border-ink/20 bg-panel/35 font-heading text-[10px]">
                  {code}
                </span>
                <span className="min-w-0 flex-1 text-[12px] font-medium text-ink">
                  {label}
                </span>
                <StatusStamp
                  label={status}
                  tone={tone as "done" | "progress" | "open" | "muted"}
                />
                {index === 4 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toast("Modul dibuka", {
                        description: "Materi modul 05 siap dibaca. Progres tersimpan.",
                      })
                    }
                  >
                    Lanjut
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>
        </Panel>
        <div className="space-y-4">
          <Panel eyebrow="Kredensial" title="Terhubung ke jalur">
            {myCerts.map((cert) => (
              <div key={cert.id} className="border border-ink/20 bg-panel/30 p-3">
                <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-copper-dark">
                  {cert.serial}
                </p>
                <p className="mt-1 font-heading text-lg leading-tight text-ink">
                  {cert.pathTitle}
                </p>
                <p className="mt-1 text-[10px] text-ink-muted">
                  Kartu Karya {cert.workCard} · nilai {cert.assessmentScore}
                </p>
                <Button asChild size="sm" variant="outline" className="mt-2 w-full">
                  <Link href="/ruang/kredensial">Lihat sertifikat</Link>
                </Button>
              </div>
            ))}
          </Panel>
          <Panel eyebrow="Kehadiran" title="Rekap kohort">
            <dl className="space-y-2.5">
              <div className="flex items-center justify-between">
                <dt className="text-[11px] text-ink-muted">Hadir</dt>
                <dd className="text-[11px] font-semibold text-ink">9 sesi</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[11px] text-ink-muted">Izin</dt>
                <dd className="text-[11px] font-semibold text-ink">1 sesi</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[11px] text-ink-muted">Terlewat</dt>
                <dd className="text-[11px] font-semibold text-ink">0 sesi</dd>
              </div>
            </dl>
            <p className="mt-3 flex items-center gap-1.5 border-t border-ink/15 pt-2.5 text-[10px] text-ink-muted">
              <Clock3 className="size-3" aria-hidden="true" />
              Rata-rata belajar 4,2 jam per pekan
            </p>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function CohortTable({ onSelect }: { onSelect: (cohort: Cohort) => void }) {
  const columns: Column<Cohort>[] = [
    {
      id: "cohort",
      header: "Kohort",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.code}</p>
          <p className="mt-0.5 max-w-56 truncate text-[10px] text-ink-muted">
            {row.pathTitle}
          </p>
        </div>
      ),
    },
    {
      id: "teacher",
      header: "Pengajar",
      cell: (row) => <span className="text-[11.5px]">{row.teacher}</span>,
    },
    {
      id: "seats",
      header: "Kursi",
      cell: (row) => (
        <div className="w-28">
          <p className="text-[11px] tabular-nums text-ink">
            {row.enrolled}/{row.capacity}
          </p>
          <div className="mt-1 h-1.5 bg-panel">
            <div
              className="h-full bg-copper-dark"
              style={{ width: `${Math.round((row.enrolled / row.capacity) * 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      id: "completed",
      header: "Selesai",
      cell: (row) => (
        <span className="text-[11px] tabular-nums text-ink-soft">
          {row.completed} peserta
        </span>
      ),
      className: "hidden md:table-cell",
      headClassName: "hidden md:table-cell",
    },
    {
      id: "risk",
      header: "Berisiko",
      cell: (row) =>
        row.atRisk ? (
          <StatusStamp label={`${row.atRisk} peserta`} tone="danger" />
        ) : (
          <span className="text-[11px] text-ink-muted">—</span>
        ),
      className: "hidden lg:table-cell",
      headClassName: "hidden lg:table-cell",
    },
    {
      id: "next",
      header: "Berikutnya",
      cell: (row) => (
        <span className="text-[11px] text-ink-soft">{row.nextSession}</span>
      ),
      className: "hidden xl:table-cell",
      headClassName: "hidden xl:table-cell",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusStamp label={row.statusLabel} tone={row.status} />,
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (row) => (
        <Button type="button" size="sm" variant="ghost" onClick={() => onSelect(row)}>
          Buka
        </Button>
      ),
    },
  ]

  return (
    <Panel eyebrow="Kohort" title="Kapasitas dan progres" bodyClassName="p-0">
      <DataTable
        rows={cohorts}
        columns={columns}
        caption="Daftar kohort dengan pengajar, kapasitas, dan status"
        searchPlaceholder="Cari kohort atau pengajar"
        getSearchText={(row) =>
          `${row.code} ${row.pathTitle} ${row.teacher} ${row.statusLabel}`
        }
        filters={[
          {
            id: "status",
            label: "Status",
            options: [
              { value: "all", label: "Semua", count: cohorts.length },
              { value: "Berjalan", label: "Berjalan", count: 2 },
              { value: "Pendaftaran", label: "Pendaftaran", count: 1 },
              { value: "Selesai", label: "Selesai", count: 2 },
            ],
          },
        ]}
        filterRow={(row, values) =>
          !values.status ||
          values.status === "all" ||
          row.statusLabel === values.status
        }
        minWidth={820}
      />
    </Panel>
  )
}

function EnrollmentTable({
  onSelect,
}: {
  onSelect: (enrollment: Enrollment) => void
}) {
  const currentCapabilities = useViewer().capabilities
  const canSeeAll = currentCapabilities.includes("operate")
  const rows = canSeeAll
    ? enrollments
    : enrollments.filter((item) => item.cohortId.startsWith("c-batik"))

  const columns: Column<Enrollment>[] = [
    {
      id: "student",
      header: "Peserta",
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center border border-ink/20 bg-panel/40 font-heading text-[9px] font-semibold">
            {row.initials}
          </span>
          <div>
            <p className="font-semibold text-ink">{row.student}</p>
            <p className="mt-0.5 text-[10px] text-ink-muted">{row.cohortId}</p>
          </div>
        </div>
      ),
    },
    {
      id: "path",
      header: "Jalur",
      cell: (row) => (
        <span className="text-[11px] leading-snug text-ink-soft">{row.pathTitle}</span>
      ),
      className: "hidden md:table-cell",
      headClassName: "hidden md:table-cell",
    },
    {
      id: "progress",
      header: "Progres",
      cell: (row) => (
        <div className="w-24">
          <p className="text-[11px] tabular-nums">{row.progress}%</p>
          <div className="mt-1 h-1.5 bg-panel">
            <div className="h-full bg-copper-dark" style={{ width: `${row.progress}%` }} />
          </div>
        </div>
      ),
    },
    {
      id: "next",
      header: "Langkah berikut",
      cell: (row) => (
        <span className="text-[11px] leading-snug text-ink-soft">{row.nextTask}</span>
      ),
      className: "hidden lg:table-cell",
      headClassName: "hidden lg:table-cell",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <StatusStamp
          label={
            row.status === "at_risk"
              ? "Berisiko"
              : row.status === "completed"
                ? "Selesai"
                : row.status === "withdrawn"
                  ? "Keluar"
                  : "Aktif"
          }
          tone={
            row.status === "at_risk"
              ? "danger"
              : row.status === "completed"
                ? "done"
                : row.status === "withdrawn"
                  ? "muted"
                  : "progress"
          }
        />
      ),
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (row) => (
        <Button size="sm" variant="ghost" onClick={() => onSelect(row)}>
          Buka
        </Button>
      ),
    },
  ]

  return (
    <Panel eyebrow="Peserta" title="Progres per pendaftaran" bodyClassName="p-0">
      <DataTable
        rows={rows}
        columns={columns}
        caption="Daftar peserta dengan progres, langkah berikut, dan status"
        searchPlaceholder="Cari peserta atau kohort"
        getSearchText={(row) =>
          `${row.student} ${row.pathTitle} ${row.cohortId} ${row.status}`
        }
        filters={[
          {
            id: "status",
            label: "Status",
            options: [
              { value: "all", label: "Semua", count: rows.length },
              { value: "active", label: "Aktif" },
              { value: "at_risk", label: "Berisiko" },
              { value: "completed", label: "Selesai" },
            ],
          },
        ]}
        filterRow={(row, values) =>
          !values.status || values.status === "all" || row.status === values.status
        }
        minWidth={760}
      />
    </Panel>
  )
}

function PathCatalog() {
  const columns: Column<(typeof paths)[number]>[] = [
    {
      id: "path",
      header: "Jalur",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.title}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">
            {row.code} · {row.teacher}
          </p>
        </div>
      ),
    },
    {
      id: "price",
      header: "Harga",
      cell: (row) => (
        <span className="text-[11px] tabular-nums">
          {row.price ? formatIDR(row.price) : "—"}
        </span>
      ),
    },
    {
      id: "modules",
      header: "Modul",
      cell: (row) => (
        <span className="text-[11px] text-ink-soft">
          {row.modules} modul · {row.weeks} pekan
        </span>
      ),
      className: "hidden md:table-cell",
      headClassName: "hidden md:table-cell",
    },
    {
      id: "cohorts",
      header: "Kohort aktif",
      cell: (row) => (
        <span className="text-[11px] tabular-nums">{row.activeCohorts}</span>
      ),
      align: "center",
    },
    {
      id: "students",
      header: "Peserta",
      cell: (row) => (
        <span className="text-[11px] tabular-nums">{row.students}</span>
      ),
      align: "center",
      className: "hidden lg:table-cell",
      headClassName: "hidden lg:table-cell",
    },
    {
      id: "completion",
      header: "Penyelesaian",
      cell: (row) => (
        <div className="w-24">
          <p className="text-[11px] tabular-nums">{row.completion}%</p>
          <div className="mt-1 h-1.5 bg-panel">
            <div className="h-full bg-moss" style={{ width: `${row.completion}%` }} />
          </div>
        </div>
      ),
      className: "hidden xl:table-cell",
      headClassName: "hidden xl:table-cell",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <StatusStamp
          label={row.status}
          tone={row.status === "Terbuka" ? "done" : row.status === "Sedang dipetakan" ? "progress" : "muted"}
        />
      ),
    },
  ]

  return (
    <Panel eyebrow="Katalog" title="Jalur dan kesiapan" bodyClassName="p-0">
      <DataTable
        rows={paths}
        columns={columns}
        caption="Katalog jalur dengan harga, modul, kohort, dan penyelesaian"
        searchPlaceholder="Cari jalur atau pengajar"
        getSearchText={(row) => `${row.title} ${row.teacher} ${row.status}`}
        minWidth={780}
      />
    </Panel>
  )
}
