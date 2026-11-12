"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "convex/react"

import { Button } from "@/components/ui/button"
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
import type { StatusTone } from "@/lib/workspace/types"
import type {
  CohortOverview,
  EnrollmentOverview,
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
                    <ul className="mt-1 divide-y divide-ink/10 border-y border-ink/10">
                      {module.lessons.map((lesson) => (
                        <li
                          key={lesson.id}
                          className="flex items-center gap-2 py-2"
                        >
                          <span className="min-w-0 flex-1 text-[11px] text-ink-soft">
                            {lesson.title}
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
