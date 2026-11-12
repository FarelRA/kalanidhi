"use client"

import * as React from "react"
import Link from "next/link"
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Send,
  Trash2,
  Undo2,
} from "lucide-react"
import { toast } from "sonner"
import { useMutation, useQuery } from "convex/react"

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
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { StatusTone } from "@/lib/workspace/types"
import type {
  CohortOverview,
  CurriculumLesson,
  CurriculumMedia,
  CurriculumModule,
  CurriculumStatus,
  EnrollmentOverview,
  LessonAccessLevel,
  LessonKind,
  PathOverview,
} from "@/lib/workspace/phase2-types"
import {
  formatCompactIDR,
  formatWorkspaceDate,
} from "@/lib/workspace/format"

function iso(ms: number) {
  return new Date(ms).toISOString()
}

function cohortTone(status: CohortOverview["status"]): StatusTone {
  if (status === "active") return "progress"
  if (status === "completed") return "done"
  if (status === "cancelled") return "danger"
  if (status === "enrolling") return "open"
  return "muted"
}

function cohortLabel(status: CohortOverview["status"]) {
  if (status === "active") return "Berjalan"
  if (status === "completed") return "Selesai"
  if (status === "cancelled") return "Dibatalkan"
  if (status === "enrolling") return "Pendaftaran"
  return "Draf"
}

function enrollmentTone(status: EnrollmentOverview["status"]): StatusTone {
  if (status === "active") return "progress"
  if (status === "completed") return "done"
  if (status === "withdrawn") return "muted"
  return "wait"
}

function enrollmentLabel(status: EnrollmentOverview["status"]) {
  if (status === "active") return "Aktif"
  if (status === "completed") return "Selesai"
  if (status === "withdrawn") return "Keluar"
  return "Menunggu bayar"
}

export function LiveLearningBoard() {
  const { can } = useViewer()
  const [tab, setTab] = React.useState("jalur")
  const [cohortId, setCohortId] = React.useState<string | null>(null)
  const [enrollmentId, setEnrollmentId] = React.useState<string | null>(null)

  const paths = useQuery(api.learning.listPaths, {}) ?? []
  const cohorts = useQuery(api.learning.listCohorts, {}) ?? []
  const enrollments = useQuery(api.learning.listEnrollments, {}) ?? []

  const tabs = [
    (can("learn") || can("teach")) && { id: "jalur", label: "Jalur saya" },
    (can("teach") || can("operate")) && {
      id: "kohort",
      label: can("operate") ? "Semua kohort" : "Kohort saya",
      count: cohorts.length,
    },
    (can("teach") || can("operate")) && {
      id: "peserta",
      label: "Peserta",
      count: enrollments.length,
    },
    (can("teach") || can("operate")) && {
      id: "kurikulum",
      label: "Kurikulum",
      count: paths.length,
    },
    can("operate") && {
      id: "katalog",
      label: "Katalog jalur",
      count: paths.length,
    },
  ].filter(Boolean) as { id: string; label: string; count?: number }[]

  const activeTab = tabs.some((item) => item.id === tab) ? tab : tabs[0]?.id

  if (tabs.length === 0) {
    return (
      <EmptyState
        title="Belum ada jalur"
        description="Akun ini belum memiliki jalur belajar atau kohort yang dapat ditampilkan."
      />
    )
  }

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
            ? "Data jalur, kohort, kapasitas, dan peserta dibaca langsung dari Convex."
            : can("teach")
              ? "Roster, kapasitas, dan progres peserta pada kohort yang kamu ampu."
              : "Modul, tugas, dan langkah berikutnya pada jalur yang kamu ikuti."
        }
        actions={
          <Button asChild variant="outline">
            <Link href="/ruang/jadwal">Lihat jadwal</Link>
          </Button>
        }
      />

      <SegmentedTabs
        tabs={tabs}
        value={activeTab ?? "jalur"}
        onChange={setTab}
        ariaLabel="Pilih tampilan belajar"
      />

      {activeTab === "jalur" ? (
        <StudentPaths paths={paths} enrollments={enrollments} />
      ) : null}
      {activeTab === "kohort" ? (
        <CohortTable cohorts={cohorts} onSelect={(row) => setCohortId(row.id)} />
      ) : null}
      {activeTab === "peserta" ? (
        <EnrollmentTable
          enrollments={enrollments}
          onSelect={(row) => setEnrollmentId(row.id)}
        />
      ) : null}
      {activeTab === "kurikulum" ? <CurriculumBoard paths={paths} /> : null}
      {activeTab === "katalog" ? <PathCatalog paths={paths} /> : null}

      <CohortDrawer
        cohortId={cohortId}
        onClose={() => setCohortId(null)}
        onOpenEnrollment={(id) => {
          setCohortId(null)
          setEnrollmentId(id)
        }}
      />
      <EnrollmentDrawer
        enrollmentId={enrollmentId}
        onClose={() => setEnrollmentId(null)}
      />
    </div>
  )
}

function StudentPaths({
  paths,
  enrollments,
}: {
  paths: PathOverview[]
  enrollments: EnrollmentOverview[]
}) {
  if (paths.length === 0) {
    return (
      <EmptyState
        title="Belum ada jalur aktif"
        description="Pendaftaranmu akan muncul di sini setelah diaktifkan pengelola."
      />
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {paths.map((path) => {
        const enrollment = enrollments.find((item) => item.pathId === path.id)
        return (
          <article
            key={path.id}
            className="border border-ink/20 bg-paper-2 p-4 shadow-[3px_3px_0_rgba(32,19,13,0.06)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-copper-dark">
                  {path.code} · {path.teacherName}
                </p>
                <h2 className="mt-1 font-heading text-xl leading-tight text-ink">
                  {path.title}
                </h2>
                <p className="mt-1 text-[11px] text-ink-muted">{path.subtitle}</p>
              </div>
              <StatusStamp
                label={
                  enrollment
                    ? enrollmentLabel(enrollment.status)
                    : path.status === "open"
                      ? "Terbuka"
                      : "Disusun"
                }
                tone={
                  enrollment ? enrollmentTone(enrollment.status) : "open"
                }
              />
            </div>
            <div className="mt-4 border-y border-ink/15 py-3">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold uppercase tracking-[0.07em] text-ink-muted">
                  Progres {enrollment?.progress ?? 0}%
                </span>
                <span className="text-ink-muted">
                  {path.lessons > 0
                    ? `${path.lessons} pelajaran · ${path.modules} modul`
                    : "Kurikulum menyusul"}
                </span>
              </div>
              <div className="mt-2 flex gap-1" aria-hidden="true">
                {Array.from({ length: Math.max(1, path.modules) }).map(
                  (_, index) => (
                    <span
                      key={index}
                      className={`h-2 flex-1 border border-ink/15 ${
                        index * 100 < (enrollment?.progress ?? 0) * Math.max(1, path.modules)
                          ? "bg-copper-dark"
                          : "bg-panel/50"
                      }`}
                    />
                  ),
                )}
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <dt className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                  Langkah berikut
                </dt>
                <dd className="mt-1 text-[11px] font-semibold leading-snug text-ink">
                  {enrollment?.nextTask ?? "Menunggu aktivasi"}
                </dd>
              </div>
              <div>
                <dt className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                  Tenggat
                </dt>
                <dd className="mt-1 text-[11px] leading-snug text-ink">
                  {enrollment?.deadlineAt
                    ? formatWorkspaceDate(iso(enrollment.deadlineAt))
                    : "Belum ditetapkan"}
                </dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm" className="flex-1">
                <Link href="/ruang/tugas">Buka tugas</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/ruang/jadwal">Jadwal</Link>
              </Button>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function CohortTable({
  cohorts,
  onSelect,
}: {
  cohorts: CohortOverview[]
  onSelect: (row: CohortOverview) => void
}) {
  const columns: Column<CohortOverview>[] = [
    {
      id: "cohort",
      header: "Kohort",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.code}</p>
          <p className="mt-0.5 max-w-56 truncate text-[10px] text-ink">
            {row.title}
          </p>
          <p className="mt-0.5 max-w-56 truncate text-[10px] text-ink-muted">
            {row.pathTitle}
          </p>
        </div>
      ),
    },
    {
      id: "teacher",
      header: "Pengajar",
      cell: (row) => <span className="text-[11.5px]">{row.teacherName}</span>,
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
              style={{
                width: `${row.capacity ? Math.round((row.enrolled / row.capacity) * 100) : 0}%`,
              }}
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
      header: "Sesi berikutnya",
      cell: (row) => (
        <span className="text-[11px] text-ink-soft">
          {row.nextSessionAt
            ? formatWorkspaceDate(iso(row.nextSessionAt))
            : "Belum dijadwalkan"}
        </span>
      ),
      className: "hidden xl:table-cell",
      headClassName: "hidden xl:table-cell",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <StatusStamp
          label={cohortLabel(row.status)}
          tone={cohortTone(row.status)}
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
    <Panel eyebrow="Kohort" title="Kapasitas dan progres" bodyClassName="p-0">
      <DataTable
        rows={cohorts}
        columns={columns}
        caption="Daftar kohort dengan pengajar, kapasitas, dan status"
        searchPlaceholder="Cari kohort atau pengajar"
        getSearchText={(row) =>
          `${row.code} ${row.title} ${row.pathTitle} ${row.teacherName} ${row.status}`
        }
        emptyTitle="Belum ada kohort"
        emptyDescription="Kohort akan muncul setelah pengelola membuka pendaftaran."
        minWidth={820}
      />
    </Panel>
  )
}

function EnrollmentTable({
  enrollments,
  onSelect,
}: {
  enrollments: EnrollmentOverview[]
  onSelect: (row: EnrollmentOverview) => void
}) {
  const columns: Column<EnrollmentOverview>[] = [
    {
      id: "student",
      header: "Peserta",
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center border border-ink/20 bg-panel/40 font-heading text-[9px] font-semibold">
            {row.initials}
          </span>
          <div>
            <p className="font-semibold text-ink">{row.studentName}</p>
            <p className="mt-0.5 text-[10px] text-ink-muted">
              {row.cohortCode ?? "Tanpa kohort"}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "path",
      header: "Jalur",
      cell: (row) => (
        <span className="text-[11px] leading-snug text-ink-soft">
          {row.pathTitle}
        </span>
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
            <div
              className="h-full bg-copper-dark"
              style={{ width: `${row.progress}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      id: "next",
      header: "Langkah berikut",
      cell: (row) => (
        <span className="text-[11px] leading-snug text-ink-soft">
          {row.nextTask}
        </span>
      ),
      className: "hidden lg:table-cell",
      headClassName: "hidden lg:table-cell",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <StatusStamp
          label={enrollmentLabel(row.status)}
          tone={enrollmentTone(row.status)}
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
        rows={enrollments}
        columns={columns}
        caption="Daftar peserta dengan progres, langkah berikut, dan status"
        searchPlaceholder="Cari peserta atau kohort"
        getSearchText={(row) =>
          `${row.studentName} ${row.pathTitle} ${row.cohortCode ?? ""} ${row.status}`
        }
        emptyTitle="Belum ada peserta"
        emptyDescription="Peserta akan muncul setelah pendaftaran aktif."
        minWidth={760}
      />
    </Panel>
  )
}

function pathStatusLabel(status: PathOverview["status"]) {
  if (status === "open") return "Terbuka"
  if (status === "mapping") return "Sedang dipetakan"
  if (status === "archived") return "Diarsipkan"
  return "Direncanakan"
}

function pathStatusTone(status: PathOverview["status"]): StatusTone {
  if (status === "open") return "done"
  if (status === "mapping") return "progress"
  if (status === "archived") return "muted"
  return "muted"
}

function PathCatalog({ paths }: { paths: PathOverview[] }) {
  const [selected, setSelected] = React.useState<PathOverview | null>(null)

  const columns: Column<PathOverview>[] = [
    {
      id: "path",
      header: "Jalur",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.title}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">
            {row.code} · {row.teacherName}
          </p>
        </div>
      ),
    },
    {
      id: "level",
      header: "Tingkat",
      cell: (row) => (
        <span className="text-[11px] text-ink-soft">{row.level}</span>
      ),
      className: "hidden md:table-cell",
      headClassName: "hidden md:table-cell",
    },
    {
      id: "modules",
      header: "Modul",
      cell: (row) => (
        <span className="text-[11px] text-ink-soft">
          {row.lessons > 0
            ? `${row.modules} modul · ${row.lessons} pelajaran`
            : "Kurikulum menyusul"}
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
      id: "price",
      header: "Biaya",
      cell: (row) => (
        <span className="text-[11px] text-ink-soft">
          {row.priceLabel ?? (row.price !== null ? formatCompactIDR(row.price) : "Belum diisi")}
        </span>
      ),
      className: "hidden xl:table-cell",
      headClassName: "hidden xl:table-cell",
    },
    {
      id: "completion",
      header: "Penyelesaian",
      cell: (row) => (
        <div className="w-24">
          <p className="text-[11px] tabular-nums">{row.completion}%</p>
          <div className="mt-1 h-1.5 bg-panel">
            <div
              className="h-full bg-moss"
              style={{ width: `${row.completion}%` }}
            />
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
          label={pathStatusLabel(row.status)}
          tone={pathStatusTone(row.status)}
        />
      ),
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (row) => (
        <Button size="sm" variant="ghost" onClick={() => setSelected(row)}>
          Buka
        </Button>
      ),
    },
  ]

  return (
    <>
      <Panel eyebrow="Katalog" title="Jalur dan kesiapan" bodyClassName="p-0">
        <DataTable
          rows={paths}
          columns={columns}
          caption="Katalog jalur dengan tingkat, modul, kohort, dan penyelesaian"
          searchPlaceholder="Cari jalur atau pengajar"
          getSearchText={(row) =>
            `${row.title} ${row.teacherName} ${row.level} ${row.status}`
          }
          emptyTitle="Belum ada jalur"
          minWidth={900}
        />
      </Panel>
      <PathDrawer path={selected} onClose={() => setSelected(null)} />
    </>
  )
}

function PathDrawer({
  path,
  onClose,
}: {
  path: PathOverview | null
  onClose: () => void
}) {
  return (
    <DetailDrawer
      open={Boolean(path)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      eyebrow="Jalur"
      title={path?.title ?? "Jalur"}
      stamp={path ? pathStatusLabel(path.status) : undefined}
      tone={path ? pathStatusTone(path.status) : "muted"}
      description={path?.subtitle}
    >
      {path ? (
        <>
          <DetailGrid
            items={[
              { label: "Kode", value: path.code },
              { label: "Tingkat", value: path.level },
              { label: "Pengajar", value: path.teacherName },
              { label: "Peran pengajar", value: path.teacherRole },
              { label: "Wilayah", value: path.region },
              {
                label: "Biaya",
                value:
                  path.priceLabel ??
                  (path.price !== null
                    ? formatCompactIDR(path.price)
                    : "Belum diisi"),
              },
              { label: "Modul", value: `${path.modules} modul` },
              { label: "Pelajaran", value: `${path.lessons} pelajaran` },
              { label: "Durasi", value: `${path.weeks} minggu` },
              { label: "Tugas", value: `${path.tasks} tugas` },
            ]}
          />
          <DrawerSection title="Hasil belajar">
            <p className="text-[12px] leading-relaxed text-ink-soft">
              {path.outcome}
            </p>
          </DrawerSection>
          <DrawerSection title="Yang termasuk">
            {path.includes.length === 0 ? (
              <p className="text-[12px] text-ink-muted">Belum diisi.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-4 text-[12px] leading-relaxed text-ink-soft">
                {path.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </DrawerSection>
          <DrawerSection title="Tag">
            {path.tags.length === 0 ? (
              <p className="text-[12px] text-ink-muted">Belum diisi.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {path.tags.map((tag) => (
                  <span
                    key={tag}
                    className="border border-ink/20 bg-panel/40 px-2 py-1 text-[10px] text-ink-soft"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </DrawerSection>
        </>
      ) : null}
    </DetailDrawer>
  )
}

function CohortDrawer({
  cohortId,
  onClose,
  onOpenEnrollment,
}: {
  cohortId: string | null
  onClose: () => void
  onOpenEnrollment: (id: string) => void
}) {
  const detail = useQuery(
    api.learning.cohortDetail,
    cohortId ? { cohortId: cohortId as never } : "skip",
  )
  const cohort = detail?.cohort

  return (
    <DetailDrawer
      open={Boolean(cohortId)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      eyebrow="Kohort"
      title={
        cohort
          ? `${cohort.code} · ${cohort.pathTitle}`
          : detail === null
            ? "Kohort tidak ditemukan"
            : "Kohort"
      }
      stamp={cohort ? cohortLabel(cohort.status) : undefined}
      tone={cohort ? cohortTone(cohort.status) : "muted"}
      description={
        cohort
          ? `${cohort.teacherName} · ${cohort.enrolled} dari ${cohort.capacity} kursi terisi`
          : undefined
      }
    >
      {cohort ? (
        <>
          <DetailGrid
            items={[
              { label: "Judul kohort", value: cohort.title },
              { label: "Jalur", value: cohort.pathTitle },
              { label: "Pengajar", value: cohort.teacherName },
              { label: "Mulai", value: formatWorkspaceDate(iso(cohort.startDate)) },
              { label: "Selesai", value: formatWorkspaceDate(iso(cohort.endDate)) },
              { label: "Kursi", value: `${cohort.enrolled} / ${cohort.capacity}` },
              { label: "Selesai", value: `${cohort.completed} peserta` },
              { label: "Berisiko", value: `${cohort.atRisk} peserta` },
              {
                label: "Zona waktu",
                value: cohort.timezone,
              },
              {
                label: "Diperbarui",
                value: formatWorkspaceDate(iso(cohort.updatedAt)),
              },
            ]}
          />
          <DrawerSection title="Roster">
            {detail.roster.length === 0 ? (
              <p className="text-[12px] text-ink-muted">
                Kohort ini belum memiliki peserta.
              </p>
            ) : (
              <ul className="divide-y divide-ink/10 border-y border-ink/10">
                {detail.roster.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2.5 py-2.5"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center border border-ink/20 bg-panel/40 font-heading text-[9px] font-semibold">
                      {item.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11.5px] font-semibold text-ink">
                        {item.studentName}
                      </span>
                      <span className="mt-0.5 block text-[9.5px] text-ink-muted">
                        {item.progress}% · {item.nextTask}
                      </span>
                    </span>
                    <StatusStamp
                      label={enrollmentLabel(item.status)}
                      tone={enrollmentTone(item.status)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onOpenEnrollment(item.id)}
                    >
                      Buka
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </DrawerSection>
        </>
      ) : detail === null ? (
        <p className="text-[12px] leading-relaxed text-ink-muted">
          Kohort ini tidak tersedia untuk akun ini, atau sudah dipindahkan.
        </p>
      ) : null}
    </DetailDrawer>
  )
}

const LESSON_KIND_LABELS: Record<LessonKind, string> = {
  text: "Teks",
  video: "Video",
  audio: "Audio",
  file: "Berkas",
  practice: "Praktik",
}

const ACCESS_LABELS: Record<LessonAccessLevel, string> = {
  public: "Publik",
  enrolled: "Peserta",
  certified: "Bersertifikat",
}

function curriculumTone(status: CurriculumStatus): StatusTone {
  return status === "published" ? "done" : "muted"
}

function curriculumLabel(status: CurriculumStatus) {
  return status === "published" ? "Terbit" : "Draf"
}

function CurriculumBoard({ paths }: { paths: PathOverview[] }) {
  const [pathId, setPathId] = React.useState<string | null>(
    paths[0]?.id ?? null,
  )
  const [moduleDialog, setModuleDialog] = React.useState<{
    module?: CurriculumModule
  } | null>(null)
  const [lessonDialog, setLessonDialog] = React.useState<{
    moduleId: Id<"pathModules">
    lesson?: CurriculumLesson
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<{
    type: "module" | "lesson"
    id: string
    title: string
  } | null>(null)

  const activePathId =
    pathId && paths.some((path) => path.id === pathId)
      ? pathId
      : (paths[0]?.id ?? null)
  const curriculum = useQuery(
    api.learning.getCurriculum,
    activePathId ? { pathId: activePathId } : "skip",
  )
  const media = useQuery(api.learning.listCurriculumMedia, {}) ?? []

  const createModule = useMutation(api.learning.createModule)
  const updateModule = useMutation(api.learning.updateModule)
  const publishModule = useMutation(api.learning.publishModule)
  const unpublishModule = useMutation(api.learning.unpublishModule)
  const deleteModule = useMutation(api.learning.deleteModule)
  const createLesson = useMutation(api.learning.createLesson)
  const updateLesson = useMutation(api.learning.updateLesson)
  const publishLesson = useMutation(api.learning.publishLesson)
  const unpublishLesson = useMutation(api.learning.unpublishLesson)
  const deleteLesson = useMutation(api.learning.deleteLesson)
  const reorderModules = useMutation(api.learning.reorderModules)
  const reorderLessons = useMutation(api.learning.reorderLessons)

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action()
      toast(success)
    } catch (error) {
      toast("Tindakan gagal", {
        description: error instanceof Error ? error.message : "Coba lagi.",
      })
    }
  }

  function moveModule(index: number, direction: -1 | 1) {
    if (!curriculum) return
    const ids = curriculum.modules.map((pathModule) => pathModule.id)
    const target = index + direction
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    void run(
      () =>
        reorderModules({
          pathId: curriculum.path.id,
          moduleIds: ids,
        }),
      "Urutan modul diperbarui",
    )
  }

  function moveLesson(
    pathModule: CurriculumModule,
    index: number,
    direction: -1 | 1,
  ) {
    const ids = pathModule.lessons.map((lesson) => lesson.id)
    const target = index + direction
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    void run(
      () =>
        reorderLessons({
          moduleId: pathModule.id,
          lessonIds: ids,
        }),
      "Urutan pelajaran diperbarui",
    )
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      if (deleteTarget.type === "module") {
        await deleteModule({
          moduleId: deleteTarget.id as Id<"pathModules">,
        })
      } else {
        await deleteLesson({ lessonId: deleteTarget.id as Id<"lessons"> })
      }
      toast("Data kurikulum dihapus")
      setDeleteTarget(null)
    } catch (error) {
      toast("Gagal menghapus", {
        description: error instanceof Error ? error.message : "Coba lagi.",
      })
    }
  }

  if (paths.length === 0) {
    return (
      <EmptyState
        title="Belum ada jalur yang dapat disusun"
        description="Kurikulum muncul setelah akun ini terhubung ke jalur sebagai pengajar atau pengelola."
      />
    )
  }

  return (
    <>
      <Panel
        eyebrow="Kurikulum"
        title="Modul dan pelajaran"
        action={
          <Button
            size="sm"
            onClick={() => setModuleDialog({})}
            disabled={!activePathId}
          >
            <Plus aria-hidden="true" />
            Tambah modul
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2 border-b border-ink/10 pb-3">
          {paths.map((path) => (
            <Button
              key={path.id}
              size="sm"
              variant={path.id === activePathId ? "default" : "outline"}
              onClick={() => setPathId(path.id)}
            >
              {path.title}
            </Button>
          ))}
        </div>

        {curriculum === undefined ? (
          <p className="mt-4 text-[12px] text-ink-muted">Memuat kurikulum…</p>
        ) : curriculum === null ? (
          <p className="mt-4 text-[12px] leading-relaxed text-ink-muted">
            Kurikulum jalur ini tidak tersedia untuk akun ini.
          </p>
        ) : (
          <>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  label: "Modul",
                  value: `${curriculum.counts.publishedModules}/${curriculum.counts.modules} terbit`,
                },
                {
                  label: "Pelajaran",
                  value: `${curriculum.counts.publishedLessons}/${curriculum.counts.lessons} terbit`,
                },
                {
                  label: "Estimasi",
                  value: `${curriculum.counts.estimatedMinutes} menit`,
                },
                {
                  label: "Tugas jalur",
                  value: `${curriculum.path.tasks} tugas`,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="border border-ink/15 bg-paper/40 px-3 py-2"
                >
                  <dt className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-[11.5px] font-semibold text-ink">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>

            {curriculum.modules.length === 0 ? (
              <EmptyState
                className="mt-4"
                title="Belum ada modul"
                description="Tambahkan modul pertama, lalu isi pelajaran di dalamnya."
                action={
                  <Button size="sm" onClick={() => setModuleDialog({})}>
                    <Plus aria-hidden="true" />
                    Tambah modul
                  </Button>
                }
              />
            ) : (
              <div className="mt-4 space-y-3">
                {curriculum.modules.map((pathModule, moduleIndex) => (
                  <article
                    key={pathModule.id}
                    className="border border-ink/20 bg-paper/40"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-ink/10 p-3">
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-copper-dark">
                          Modul {pathModule.order}
                        </p>
                        <h3 className="mt-0.5 font-heading text-lg leading-tight text-ink">
                          {pathModule.title}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-ink-muted">
                          {pathModule.summary || "Belum ada ringkasan."}
                        </p>
                        <p className="mt-1 text-[10px] text-ink-muted">
                          {pathModule.estimatedMinutes} menit ·{" "}
                          {pathModule.lessonCount} pelajaran (
                          {pathModule.publishedLessonCount} terbit)
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <StatusStamp
                          label={curriculumLabel(pathModule.status)}
                          tone={curriculumTone(pathModule.status)}
                        />
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label="Naikkan modul"
                          disabled={moduleIndex === 0}
                          onClick={() => moveModule(moduleIndex, -1)}
                        >
                          <ChevronUp aria-hidden="true" />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label="Turunkan modul"
                          disabled={
                            moduleIndex === curriculum.modules.length - 1
                          }
                          onClick={() => moveModule(moduleIndex, 1)}
                        >
                          <ChevronDown aria-hidden="true" />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label="Ubah modul"
                          onClick={() => setModuleDialog({ module: pathModule })}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label={
                            pathModule.status === "published"
                              ? "Tarik modul ke draf"
                              : "Terbitkan modul"
                          }
                          onClick={() =>
                            void run(
                              () =>
                                pathModule.status === "published"
                                  ? unpublishModule({
                                      moduleId: pathModule.id,
                                    })
                                  : publishModule({
                                      moduleId: pathModule.id,
                                    }),
                              pathModule.status === "published"
                                ? "Modul ditarik ke draf"
                                : "Modul diterbitkan",
                            )
                          }
                        >
                          {pathModule.status === "published" ? (
                            <Undo2 aria-hidden="true" />
                          ) : (
                            <Send aria-hidden="true" />
                          )}
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label="Hapus modul"
                          onClick={() =>
                            setDeleteTarget({
                              type: "module",
                              id: pathModule.id,
                              title: pathModule.title,
                            })
                          }
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </div>

                    <div className="p-3">
                      {pathModule.lessons.length === 0 ? (
                        <p className="text-[11px] text-ink-muted">
                          Belum ada pelajaran pada modul ini.
                        </p>
                      ) : (
                        <ul className="divide-y divide-ink/10 border-y border-ink/10">
                          {pathModule.lessons.map((lesson, lessonIndex) => (
                            <li
                              key={lesson.id}
                              className="flex flex-wrap items-center gap-2 py-2"
                            >
                              <span className="w-5 text-[10px] tabular-nums text-ink-muted">
                                {lesson.order}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-[11.5px] font-semibold text-ink">
                                  {lesson.title}
                                </span>
                                <span className="mt-0.5 block truncate text-[9.5px] text-ink-muted">
                                  {LESSON_KIND_LABELS[lesson.kind]} ·{" "}
                                  {lesson.estimatedMinutes} menit ·{" "}
                                  {ACCESS_LABELS[lesson.accessLevel]} ·{" "}
                                  {lesson.media.length > 0
                                    ? lesson.media
                                        .map((asset) => asset.filename)
                                        .join(", ")
                                    : "Tanpa media"}
                                </span>
                              </span>
                              <StatusStamp
                                label={curriculumLabel(lesson.status)}
                                tone={curriculumTone(lesson.status)}
                              />
                              <div className="flex items-center gap-0.5">
                                <Button
                                  size="icon-xs"
                                  variant="ghost"
                                  aria-label="Naikkan pelajaran"
                                  disabled={lessonIndex === 0}
                                  onClick={() =>
                                    moveLesson(pathModule, lessonIndex, -1)
                                  }
                                >
                                  <ChevronUp aria-hidden="true" />
                                </Button>
                                <Button
                                  size="icon-xs"
                                  variant="ghost"
                                  aria-label="Turunkan pelajaran"
                                  disabled={
                                    lessonIndex ===
                                    pathModule.lessons.length - 1
                                  }
                                  onClick={() =>
                                    moveLesson(pathModule, lessonIndex, 1)
                                  }
                                >
                                  <ChevronDown aria-hidden="true" />
                                </Button>
                                <Button
                                  size="icon-xs"
                                  variant="ghost"
                                  aria-label="Ubah pelajaran"
                                  onClick={() =>
                                    setLessonDialog({
                                      moduleId: pathModule.id,
                                      lesson,
                                    })
                                  }
                                >
                                  <Pencil aria-hidden="true" />
                                </Button>
                                <Button
                                  size="icon-xs"
                                  variant="ghost"
                                  aria-label={
                                    lesson.status === "published"
                                      ? "Tarik pelajaran ke draf"
                                      : "Terbitkan pelajaran"
                                  }
                                  onClick={() =>
                                    void run(
                                      () =>
                                        lesson.status === "published"
                                          ? unpublishLesson({
                                              lessonId: lesson.id,
                                            })
                                          : publishLesson({
                                              lessonId: lesson.id,
                                            }),
                                      lesson.status === "published"
                                        ? "Pelajaran ditarik ke draf"
                                        : "Pelajaran diterbitkan",
                                    )
                                  }
                                >
                                  {lesson.status === "published" ? (
                                    <Undo2 aria-hidden="true" />
                                  ) : (
                                    <Send aria-hidden="true" />
                                  )}
                                </Button>
                                <Button
                                  size="icon-xs"
                                  variant="ghost"
                                  aria-label="Hapus pelajaran"
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: "lesson",
                                      id: lesson.id,
                                      title: lesson.title,
                                    })
                                  }
                                >
                                  <Trash2 aria-hidden="true" />
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() =>
                          setLessonDialog({ moduleId: pathModule.id })
                        }
                      >
                        <Plus aria-hidden="true" />
                        Tambah pelajaran
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </Panel>

      {activePathId && moduleDialog ? (
        <ModuleDialog
          key={moduleDialog.module?.id ?? "new-module"}
          open
          pathId={activePathId}
          module={moduleDialog.module}
          onClose={() => setModuleDialog(null)}
          onSaved={() => setModuleDialog(null)}
          createModule={createModule}
          updateModule={updateModule}
        />
      ) : null}

      {lessonDialog ? (
        <LessonDialog
          key={lessonDialog.lesson?.id ?? `new-${lessonDialog.moduleId}`}
          open
          moduleId={lessonDialog.moduleId}
          lesson={lessonDialog.lesson}
          media={media}
          onClose={() => setLessonDialog(null)}
          onSaved={() => setLessonDialog(null)}
          createLesson={createLesson}
          updateLesson={updateLesson}
        />
      ) : null}

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus {deleteTarget?.type === "module" ? "modul" : "pelajaran"}?</DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === "module"
                ? `Modul “${deleteTarget?.title}” hanya dapat dihapus jika tidak memiliki pelajaran.`
                : `Pelajaran “${deleteTarget?.title}” beserta catatan progresnya akan dihapus.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ModuleDialog({
  open,
  pathId,
  module,
  onClose,
  onSaved,
  createModule,
  updateModule,
}: {
  open: boolean
  pathId: string
  module?: CurriculumModule
  onClose: () => void
  onSaved: () => void
  createModule: (args: {
    pathId: string
    title: string
    summary: string
    estimatedMinutes: number
  }) => Promise<unknown>
  updateModule: (args: {
    moduleId: Id<"pathModules">
    title: string
    summary: string
    estimatedMinutes: number
  }) => Promise<unknown>
}) {
  const [title, setTitle] = React.useState(module?.title ?? "")
  const [summary, setSummary] = React.useState(module?.summary ?? "")
  const [estimatedMinutes, setEstimatedMinutes] = React.useState(
    String(module?.estimatedMinutes ?? 60),
  )
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const minutes = Number(estimatedMinutes)
    if (title.trim().length < 2) {
      setError("Judul modul wajib diisi minimal 2 karakter.")
      return
    }
    if (!Number.isInteger(minutes) || minutes < 0) {
      setError("Estimasi menit harus bilangan bulat 0 atau lebih.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (module) {
        await updateModule({
          moduleId: module.id,
          title: title.trim(),
          summary: summary.trim(),
          estimatedMinutes: minutes,
        })
      } else {
        await createModule({
          pathId,
          title: title.trim(),
          summary: summary.trim(),
          estimatedMinutes: minutes,
        })
      }
      onSaved()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Gagal menyimpan modul.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{module ? "Ubah modul" : "Tambah modul"}</DialogTitle>
            <DialogDescription>
              Modul baru tersimpan sebagai draf sampai diterbitkan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="module-title">Judul modul</Label>
            <Input
              id="module-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Alat dan bahan"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="module-summary">Ringkasan</Label>
            <Textarea
              id="module-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Apa yang dipelajari pada modul ini?"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="module-minutes">Estimasi menit</Label>
            <Input
              id="module-minutes"
              type="number"
              min={0}
              value={estimatedMinutes}
              onChange={(event) => setEstimatedMinutes(event.target.value)}
            />
          </div>
          {error ? (
            <p className="border border-[#9a3423]/30 bg-[#9a3423]/5 px-3 py-2 text-[11px] text-[#9a3423]">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan modul"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function LessonDialog({
  open,
  moduleId,
  lesson,
  media,
  onClose,
  onSaved,
  createLesson,
  updateLesson,
}: {
  open: boolean
  moduleId: Id<"pathModules"> | null
  lesson?: CurriculumLesson
  media: CurriculumMedia[]
  onClose: () => void
  onSaved: () => void
  createLesson: (args: {
    moduleId: Id<"pathModules">
    title: string
    kind: LessonKind
    body: string
    estimatedMinutes: number
    accessLevel: LessonAccessLevel
    mediaAssetIds: Id<"mediaAssets">[]
  }) => Promise<unknown>
  updateLesson: (args: {
    lessonId: Id<"lessons">
    title: string
    kind: LessonKind
    body: string
    estimatedMinutes: number
    accessLevel: LessonAccessLevel
    mediaAssetIds: Id<"mediaAssets">[]
  }) => Promise<unknown>
}) {
  const [title, setTitle] = React.useState(lesson?.title ?? "")
  const [kind, setKind] = React.useState<LessonKind>(lesson?.kind ?? "text")
  const [body, setBody] = React.useState(lesson?.body ?? "")
  const [estimatedMinutes, setEstimatedMinutes] = React.useState(
    String(lesson?.estimatedMinutes ?? 30),
  )
  const [accessLevel, setAccessLevel] = React.useState<LessonAccessLevel>(
    lesson?.accessLevel ?? "enrolled",
  )
  const [mediaAssetIds, setMediaAssetIds] = React.useState<
    Id<"mediaAssets">[]
  >(lesson?.mediaAssetIds ?? [])
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!moduleId) {
      setError("Modul tidak ditemukan.")
      return
    }
    const minutes = Number(estimatedMinutes)
    if (title.trim().length < 2) {
      setError("Judul pelajaran wajib diisi minimal 2 karakter.")
      return
    }
    if (!Number.isInteger(minutes) || minutes < 0) {
      setError("Estimasi menit harus bilangan bulat 0 atau lebih.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (lesson) {
        await updateLesson({
          lessonId: lesson.id,
          title: title.trim(),
          kind,
          body: body.trim(),
          estimatedMinutes: minutes,
          accessLevel,
          mediaAssetIds,
        })
      } else {
        await createLesson({
          moduleId,
          title: title.trim(),
          kind,
          body: body.trim(),
          estimatedMinutes: minutes,
          accessLevel,
          mediaAssetIds,
        })
      }
      onSaved()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Gagal menyimpan pelajaran.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {lesson ? "Ubah pelajaran" : "Tambah pelajaran"}
            </DialogTitle>
            <DialogDescription>
              Pelajaran baru tersimpan sebagai draf. Media diambil dari aset
              yang sudah diunggah, bukan dari folder publik.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="lesson-title">Judul pelajaran</Label>
            <Input
              id="lesson-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Mengenal canting"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lesson-kind">Jenis</Label>
              <select
                id="lesson-kind"
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as LessonKind)
                }
                className="h-11 w-full rounded-[2px] border border-input bg-transparent px-3 text-sm text-ink outline-none focus-visible:border-thread focus-visible:ring-2 focus-visible:ring-thread/15"
              >
                {Object.entries(LESSON_KIND_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lesson-access">Akses</Label>
              <select
                id="lesson-access"
                value={accessLevel}
                onChange={(event) =>
                  setAccessLevel(event.target.value as LessonAccessLevel)
                }
                className="h-11 w-full rounded-[2px] border border-input bg-transparent px-3 text-sm text-ink outline-none focus-visible:border-thread focus-visible:ring-2 focus-visible:ring-thread/15"
              >
                {Object.entries(ACCESS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lesson-body">Isi pelajaran</Label>
            <Textarea
              id="lesson-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Tulis ringkasan atau instruksi pelajaran."
              rows={4}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lesson-minutes">Estimasi menit</Label>
            <Input
              id="lesson-minutes"
              type="number"
              min={0}
              value={estimatedMinutes}
              onChange={(event) => setEstimatedMinutes(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Media</Label>
            {media.length === 0 ? (
              <p className="border border-dashed border-ink/25 bg-paper/40 px-3 py-2 text-[11px] text-ink-muted">
                Belum ada aset media aktif. Unggah aset lewat menu Konten
                terlebih dahulu.
              </p>
            ) : (
              <div className="max-h-40 space-y-1 overflow-y-auto border border-ink/15 bg-paper/40 p-2">
                {media.map((asset) => (
                  <label
                    key={asset.id}
                    className="flex items-center gap-2 text-[11px] text-ink-soft"
                  >
                    <input
                      type="checkbox"
                      checked={mediaAssetIds.includes(asset.id)}
                      onChange={(event) =>
                        setMediaAssetIds((current) =>
                          event.target.checked
                            ? [...current, asset.id]
                            : current.filter((id) => id !== asset.id),
                        )
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {asset.filename}
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.06em] text-ink-muted">
                      {asset.kind}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {error ? (
            <p className="border border-[#9a3423]/30 bg-[#9a3423]/5 px-3 py-2 text-[11px] text-[#9a3423]">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan pelajaran"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EnrollmentDrawer({
  enrollmentId,
  onClose,
}: {
  enrollmentId: string | null
  onClose: () => void
}) {
  const detail = useQuery(
    api.learning.enrollmentDetail,
    enrollmentId ? { enrollmentId: enrollmentId as never } : "skip",
  )
  const enrollment = detail?.enrollment

  return (
    <DetailDrawer
      open={Boolean(enrollmentId)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      eyebrow="Pendaftaran"
      title={
        enrollment?.studentName ??
        (detail === null ? "Pendaftaran tidak ditemukan" : "Pendaftaran")
      }
      description={enrollment?.pathTitle}
      stamp={enrollment ? enrollmentLabel(enrollment.status) : undefined}
      tone={enrollment ? enrollmentTone(enrollment.status) : "muted"}
    >
      {detail && enrollment ? (
        <>
          <DetailGrid
            items={[
              {
                label: "Kohort",
                value: enrollment.cohortCode ?? "Belum diisi",
              },
              { label: "Progres", value: `${enrollment.progress}%` },
              {
                label: "Aktivitas terakhir",
                value: enrollment.lastActiveAt
                  ? formatWorkspaceDate(iso(enrollment.lastActiveAt))
                  : "Belum diisi",
              },
              { label: "Langkah berikut", value: enrollment.nextTask },
              {
                label: "Sertifikat",
                value: detail.certificate
                  ? detail.certificate.serial
                  : "Belum terbit",
              },
              {
                label: "Selesai",
                value: enrollment.completedAt
                  ? formatWorkspaceDate(iso(enrollment.completedAt))
                  : "Belum diisi",
              },
              {
                label: "Ditarik",
                value: enrollment.withdrawnAt
                  ? formatWorkspaceDate(iso(enrollment.withdrawnAt))
                  : "Belum diisi",
              },
              {
                label: "Alasan penarikan",
                value: enrollment.withdrawReason ?? "Belum diisi",
              },
            ]}
          />
          <DrawerSection title="Modul dan pelajaran">
            {detail.modules.length === 0 ? (
              <p className="text-[12px] text-ink-muted">
                Kurikulum jalur ini belum terbit.
              </p>
            ) : (
              <div className="space-y-3">
                {detail.modules.map((module) => (
                  <div key={module.id}>
                    <p className="text-[11.5px] font-semibold text-ink">
                      {module.title}
                    </p>
                    <p className="mt-0.5 text-[9.5px] text-ink-muted">
                      Modul {module.order} · {module.estimatedMinutes} menit
                    </p>
                    <ul className="mt-1 divide-y divide-ink/10 border-y border-ink/10">
                      {module.lessons.map((lesson) => (
                        <li
                          key={lesson.id}
                          className="flex items-center gap-2 py-2"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-[11px] text-ink-soft">
                              {lesson.title}
                            </span>
                            <span className="mt-0.5 block text-[9px] text-ink-muted">
                              {LESSON_KIND_LABELS[lesson.kind]} ·{" "}
                              {lesson.estimatedMinutes} menit ·{" "}
                              {ACCESS_LABELS[lesson.accessLevel]}
                              {lesson.media.length > 0
                                ? ` · ${lesson.media.length} media`
                                : ""}
                            </span>
                          </span>
                          <StatusStamp
                            label={
                              lesson.state === "completed"
                                ? "Selesai"
                                : lesson.state === "in_progress"
                                  ? "Berjalan"
                                  : "Belum"
                            }
                            tone={
                              lesson.state === "completed"
                                ? "done"
                                : lesson.state === "in_progress"
                                  ? "progress"
                                  : "muted"
                            }
                          />
                          {lesson.attendance ? (
                            <StatusStamp
                              label={
                                lesson.attendance === "present"
                                  ? "Hadir"
                                  : lesson.attendance === "excused"
                                    ? "Izin"
                                    : "Absen"
                              }
                              tone={
                                lesson.attendance === "present"
                                  ? "done"
                                  : lesson.attendance === "excused"
                                    ? "wait"
                                    : "danger"
                              }
                            />
                          ) : null}
                          {lesson.completedAt ? (
                            <span className="text-[9.5px] text-ink-muted">
                              {formatWorkspaceDate(iso(lesson.completedAt))}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </DrawerSection>
          <DrawerSection title="Tugas">
            {detail.submissions.length === 0 ? (
              <p className="text-[12px] text-ink-muted">
                Belum ada tugas pada pendaftaran ini.
              </p>
            ) : (
              <ul className="divide-y divide-ink/10 border-y border-ink/10">
                {detail.submissions.map((submission) => (
                  <li key={submission.id} className="py-2.5">
                    <p className="text-[11.5px] font-semibold text-ink">
                      {submission.code} · {submission.taskTitle}
                    </p>
                    <p className="mt-0.5 text-[9.5px] text-ink-muted">
                      {submission.status} · tenggat{" "}
                      {formatWorkspaceDate(iso(submission.dueAt))}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </DrawerSection>
        </>
      ) : detail === null ? (
        <p className="text-[12px] leading-relaxed text-ink-muted">
          Pendaftaran ini tidak tersedia untuk akun ini, atau sudah dipindahkan.
        </p>
      ) : null}
    </DetailDrawer>
  )
}
