"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery } from "convex/react"
import {
  AlertTriangle,
  Check,
  Eye,
  ImagePlus,
  Pause,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
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
import type { Viewer } from "@/lib/access/viewer"
import { formatIDR } from "@/lib/format"
import { formatCommerceDate } from "@/lib/commerce/format"
import {
  WORK_ACCESS_LEVEL_LABELS,
  WORK_CATEGORIES,
  WORK_CATEGORY_LABELS,
  WORK_KINDS,
  WORK_KIND_LABELS,
  WORK_READINESS_LABELS,
  WORK_STAGES,
  WORK_STATUSES,
  WORK_STATUS_LABELS,
  WORK_STATUS_TONES,
} from "@/lib/commerce/options"
import { SPLIT_PERCENTAGES } from "@/lib/commerce/money"
import type { WorkListingView, WorkReadiness } from "@/lib/commerce/types"
import type { StatusTone } from "@/lib/workspace/types"

function workStamp(work: WorkListingView): { label: string; tone: StatusTone } {
  if (work.status === "paused") {
    return { label: WORK_STATUS_LABELS.paused, tone: WORK_STATUS_TONES.paused }
  }
  if (work.status === "sold_out") {
    return {
      label: WORK_STATUS_LABELS.sold_out,
      tone: WORK_STATUS_TONES.sold_out,
    }
  }
  if (work.status === "published") {
    return {
      label: WORK_STATUS_LABELS.published,
      tone: WORK_STATUS_TONES.published,
    }
  }
  if (work.cardStatus === "submitted") {
    return { label: "Menunggu konfirmasi pengajar", tone: "wait" }
  }
  if (
    work.cardStatus === "teacher_confirmed" ||
    work.cardStatus === "admin_review"
  ) {
    return { label: "Menunggu peninjauan admin", tone: "progress" }
  }
  return { label: WORK_STATUS_LABELS.draft, tone: WORK_STATUS_TONES.draft }
}

function nextActionLabel(work: WorkListingView): string {
  if (work.status === "paused") return "Menunggu admin menerbitkan ulang."
  if (work.status === "sold_out") return "Karya ditandai habis."
  if (work.cardStatus === "draft") return "Kirim untuk ditinjau."
  if (work.cardStatus === "submitted") return "Menunggu konfirmasi pengajar."
  if (work.cardStatus === "teacher_confirmed") {
    return "Menunggu peninjauan admin."
  }
  if (work.cardStatus === "admin_review") return "Menunggu keputusan terbit."
  if (work.cardStatus === "published") return "Terbit dan dapat dipesan."
  return "Lengkapi Kartu Karya."
}

function errorData(
  error: unknown,
): { message?: string; missing?: string[] } | undefined {
  if (typeof error === "object" && error && "data" in error) {
    return (error as { data?: { message?: string; missing?: string[] } }).data
  }
  return undefined
}

function errorMessage(error: unknown): string {
  return errorData(error)?.message ?? "Periksa kembali data dan coba lagi."
}

function sellerBlockReason(viewer: Viewer | null): string | null {
  if (!viewer) return "Masuk untuk mengelola karya."
  if (!viewer.sellerProfile) {
    return "Profil penjual belum dibuat. Ajukan profil penjual melalui halaman kredensial."
  }
  if (viewer.sellerProfile.status === "pending") {
    return "Profil penjual masih menunggu aktivasi pengelola."
  }
  if (viewer.sellerProfile.status === "suspended") {
    return "Profil penjual sedang ditangguhkan. Hubungi pengelola."
  }
  if (viewer.sellScopes.length === 0) {
    return "Belum ada sertifikat terbit atau cakupan pengajar yang membuka ruang jual."
  }
  return null
}

function isTeacherPath(viewer: Viewer | null, pathId: string): boolean {
  return Boolean(
    viewer?.entitlements.teach && viewer.teachScopes.includes(pathId),
  )
}

function certificatesForPath(viewer: Viewer | null, pathId: string) {
  return (viewer?.certificates ?? []).filter(
    (certificate) =>
      certificate.status === "issued" && certificate.pathId === pathId,
  )
}

function isPathEligible(viewer: Viewer | null, pathId: string): boolean {
  return (
    isTeacherPath(viewer, pathId) ||
    certificatesForPath(viewer, pathId).length > 0
  )
}

function accessLevelLabel(level: WorkListingView["accessLevel"]): string {
  if (!level) return "Belum diisi"
  return WORK_ACCESS_LEVEL_LABELS[level]
}

type ReasonAction =
  | { kind: "publish"; work: WorkListingView }
  | { kind: "pause"; work: WorkListingView }
  | { kind: "resume"; work: WorkListingView }
  | { kind: "bulk"; pathId: string }

type WorkFormValues = {
  title: string
  kind: "product" | "service"
  category: "batik" | "layanan"
  pathId: string
  certificateId: string
  price: string
  priceLabel: string
  unit: string
  technique: string
  techniqueNote: string
  description: string
  permission: string
  provenance: string
  materials: string
  region: string
  imageAssetId: string | null
  imageUrl: string
}

function initialValues(
  work: WorkListingView | null,
  viewer: Viewer | null,
): WorkFormValues {
  return {
    title: work?.title ?? "",
    kind: work?.kind ?? "product",
    category: work?.category ?? "batik",
    pathId: work?.pathId ?? viewer?.sellScopes[0] ?? "",
    certificateId: work?.certificateId ?? "",
    price: work ? String(work.price) : "",
    priceLabel: work?.priceLabel ?? "",
    unit: work?.unit ?? "",
    technique: work?.technique ?? "",
    techniqueNote: work?.techniqueNote ?? "",
    description: work?.description ?? "",
    permission: work?.permission ?? "",
    provenance: work?.provenance ?? "",
    materials: work?.materials ?? "",
    region: work?.region ?? viewer?.region ?? "",
    imageAssetId: work?.image ? (work.imageAssetId ?? null) : null,
    imageUrl: work?.image ?? "",
  }
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-[10px] text-[#9a3423]">{message}</p>
}

export function WorksLive() {
  const { can, viewer } = useViewer()
  const works = useQuery(api.commerce.listWorks, {})
  const site = useQuery(api.content.getSite)
  const submitWork = useMutation(api.commerce.submitWork)
  const confirmWork = useMutation(api.commerce.confirmWork)
  const beginReview = useMutation(api.commerce.beginWorkReview)
  const publishWork = useMutation(api.commerce.publishWork)
  const pauseWork = useMutation(api.commerce.pauseWork)
  const resumeWork = useMutation(api.commerce.resumeWork)
  const soldOut = useMutation(api.commerce.markWorkSoldOut)
  const bulkPause = useMutation(api.commerce.bulkPauseWorks)

  const [tab, setTab] = React.useState(can("works.moderate") ? "review" : "mine")
  const [selected, setSelected] = React.useState<WorkListingView | null>(null)
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<WorkListingView | null>(null)
  const [action, setAction] = React.useState<ReasonAction | null>(null)
  const [reason, setReason] = React.useState("")
  const [pending, setPending] = React.useState(false)

  const detail = useQuery(
    api.commerce.getWorkDetail,
    selected ? { workId: selected.id as Id<"works"> } : "skip",
  )
  const current = detail ?? selected

  const rows = works ?? []
  const pathTitles = new Map(
    (site?.paths ?? []).map((path) => [path.slug, path.title] as const),
  )
  const pathTitle = (pathId: string) => pathTitles.get(pathId) ?? pathId
  const myWorks = rows.filter((work) => work.makerId === viewer?.userId)
  const reviewWorks = rows.filter((work) =>
    can("works.moderate")
      ? (work.cardStatus !== null &&
          ["submitted", "teacher_confirmed", "admin_review", "review"].includes(
            work.cardStatus,
          )) ||
        work.status === "review"
      : work.canReview &&
        work.cardStatus !== null &&
        ["submitted", "teacher_confirmed"].includes(work.cardStatus),
  )

  const eligible = Boolean(
    viewer?.entitlements.sellActive && (viewer?.sellScopes.length ?? 0) > 0,
  )
  const blockReason = sellerBlockReason(viewer)

  const tabs = [
    (can("works.own") || can("works.review")) && {
      id: "mine",
      label: can("works.review") ? "Karya peserta" : "Karya saya",
      count: myWorks.length,
    },
    (can("works.review") || can("works.moderate")) && {
      id: "review",
      label: "Menunggu tinjauan",
      count: reviewWorks.length,
    },
    can("works.moderate") && {
      id: "catalog",
      label: "Semua karya",
      count: rows.length,
    },
  ].filter(Boolean) as { id: string; label: string; count?: number }[]

  const active = tabs.some((item) => item.id === tab) ? tab : tabs[0]?.id ?? "mine"
  const visible =
    active === "mine" ? myWorks : active === "review" ? reviewWorks : rows

  async function run(task: () => Promise<unknown>, message: string): Promise<boolean> {
    setPending(true)
    try {
      await task()
      toast(message)
      setAction(null)
      setReason("")
      return true
    } catch (error) {
      const data = errorData(error)
      toast("Tindakan belum dapat dijalankan", {
        description: data?.missing?.length
          ? `Lengkapi: ${data.missing.join(", ")}.`
          : data?.message ?? "Periksa status karya dan coba lagi.",
      })
      return false
    } finally {
      setPending(false)
    }
  }

  function openReason(next: ReasonAction) {
    setAction(next)
    setReason("")
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(work: WorkListingView) {
    setEditing(work)
    setFormOpen(true)
  }

  const needsReason = action?.kind !== "pause" || can("works.moderate")
  const publishBlocked =
    action?.kind === "publish" && !action.work.readiness.ready

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Karya & Kartu Karya"
        title={
          can("works.moderate")
            ? "Moderasi karya dan jasa."
            : can("works.review")
              ? "Karya peserta yang kamu ampu."
              : "Karya yang kamu bawa ke pembeli."
        }
        description={`Setiap karya membawa jalur, sertifikat, izin sumber budaya, dan bagi hasil ${SPLIT_PERCENTAGES.teacher}/${SPLIT_PERCENTAGES.platform}/${SPLIT_PERCENTAGES.community}. Data berasal dari catatan Convex.`}
        actions={
          eligible ? (
            <Button onClick={openCreate}>
              <Plus aria-hidden="true" />
              Buat karya
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/ruang/kredensial">Cek cakupan penjual</Link>
            </Button>
          )
        }
      />

      <SegmentedTabs
        tabs={tabs}
        value={active}
        onChange={setTab}
        ariaLabel="Pilih tampilan karya"
      />

      {active === "mine" && !eligible && can("works.own") ? (
        <Panel eyebrow="Ruang jual" title="Ruang jual belum terbuka">
          <div className="flex items-start gap-2.5">
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-[#9a3423]"
              aria-hidden="true"
            />
            <div>
              <p className="text-[11.5px] leading-relaxed text-ink-soft">
                {blockReason}
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href="/ruang/kredensial">Buka kredensial penjual</Link>
              </Button>
            </div>
          </div>
        </Panel>
      ) : null}

      {works === undefined ? (
        <Panel eyebrow="Karya" title="Memuat catatan karya">
          <p className="text-[11.5px] text-ink-soft">Mengambil data Convex…</p>
        </Panel>
      ) : visible.length === 0 ? (
        active === "mine" && !eligible && can("works.own") ? null : (
          <EmptyState
            title={
              active === "review"
                ? "Tidak ada karya menunggu tinjauan"
                : "Belum ada karya"
            }
            description={
              active === "review"
                ? "Karya yang diajukan penjual akan muncul di sini."
                : eligible
                  ? "Sertifikatmu membuka ruang jual untuk jalur tertentu. Mulai dari satu karya lengkap dengan izin sumber."
                  : "Karya muncul setelah sertifikat platform terbit dan profil penjual aktif."
            }
            action={
              eligible && active === "mine" ? (
                <Button size="sm" onClick={openCreate}>
                  Buat karya pertama
                </Button>
              ) : undefined
            }
          />
        )
      ) : (
        <Panel
          eyebrow={active === "review" ? "Antrean" : "Karya"}
          title={
            active === "mine"
              ? "Karya dalam cakupanmu"
              : active === "review"
                ? "Menunggu konfirmasi dan moderasi"
                : "Semua karya dan jasa"
          }
          bodyClassName="p-0"
        >
          <DataTable
            rows={visible}
            columns={workColumns(
              setSelected,
              {
                confirm: (work) =>
                  run(
                    () => confirmWork({ workId: work.id as Id<"works"> }),
                    "Karya dikonfirmasi",
                  ),
                review: (work) =>
                  run(
                    () => beginReview({ workId: work.id as Id<"works"> }),
                    "Karya masuk moderasi",
                  ),
                publish: (work) => openReason({ kind: "publish", work }),
                pause: (work) => openReason({ kind: "pause", work }),
                resume: (work) => openReason({ kind: "resume", work }),
                submit: (work) =>
                  run(
                    () => submitWork({ workId: work.id as Id<"works"> }),
                    "Karya diajukan",
                  ),
                soldOut: (work) =>
                  run(
                    () => soldOut({ workId: work.id as Id<"works"> }),
                    "Karya ditandai habis",
                  ),
                edit: openEdit,
              },
            )}
            caption="Karya dengan pembuat, jalur, harga, status, dan tindakan"
            searchPlaceholder="Cari karya, pembuat, atau Kartu Karya"
            getSearchText={(row) =>
              `${row.title} ${row.maker} ${row.workCard} ${row.pathId ?? ""} ${row.status}`
            }
            filters={[
              {
                id: "status",
                label: "Status",
                options: [
                  { value: "all", label: "Semua", count: visible.length },
                  ...WORK_STATUSES.map((status) => ({
                    value: status,
                    label: WORK_STATUS_LABELS[status],
                  })),
                ],
              },
            ]}
            filterRow={(row, values) =>
              !values.status || values.status === "all" || row.status === values.status
            }
            minWidth={920}
            toolbar={
              can("works.moderate") ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    openReason({
                      kind: "bulk",
                      pathId: viewer?.sellScopes[0] ?? "",
                    })
                  }
                >
                  Jeda massal
                </Button>
              ) : undefined
            }
          />
        </Panel>
      )}

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        eyebrow="Kartu Karya"
        title={current?.title ?? ""}
        stamp={current ? workStamp(current).label : undefined}
        tone={current ? workStamp(current).tone : undefined}
        description={
          current
            ? `${current.maker} · ${current.pathId ?? "tanpa jalur"}`
            : undefined
        }
        footer={
          current ? (
            <WorkDrawerActions
              work={current}
              can={can}
              pending={pending}
              onEdit={() => openEdit(current)}
              onSubmit={() =>
                run(
                  () => submitWork({ workId: current.id as Id<"works"> }),
                  "Karya diajukan",
                )
              }
              onConfirm={() =>
                run(
                  () => confirmWork({ workId: current.id as Id<"works"> }),
                  "Karya dikonfirmasi",
                )
              }
              onReview={() =>
                run(
                  () => beginReview({ workId: current.id as Id<"works"> }),
                  "Karya masuk moderasi",
                )
              }
              onPublish={() => openReason({ kind: "publish", work: current })}
              onPause={() => openReason({ kind: "pause", work: current })}
              onResume={() => openReason({ kind: "resume", work: current })}
              onSoldOut={() =>
                run(
                  () => soldOut({ workId: current.id as Id<"works"> }),
                  "Karya ditandai habis",
                )
              }
            />
          ) : undefined
        }
      >
        {current ? <WorkDetail work={current} /> : null}
      </DetailDrawer>

      {formOpen ? (
        <WorkFormDialog
          work={editing}
          viewer={viewer}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      ) : null}

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
              {action?.kind === "publish"
                ? "Terbitkan karya"
                : action?.kind === "resume"
                  ? "Terbitkan ulang"
                  : action?.kind === "bulk"
                    ? "Jeda massal"
                    : "Jeda karya"}{" "}
              {action?.kind === "publish" ||
              action?.kind === "pause" ||
              action?.kind === "resume"
                ? action.work.title
                : ""}
            </DialogTitle>
            <DialogDescription>
              {action?.kind === "pause" && !can("works.moderate")
                ? "Karya yang dijeda tidak dapat dipesan. Pesanan yang sudah dibayar tetap diproses."
                : "Tindakan moderasi memerlukan alasan, aktor, dan waktu. Karya yang dijeda tidak dapat dipesan; pesanan yang sudah dibayar tetap diproses."}
            </DialogDescription>
          </DialogHeader>
          {action?.kind === "bulk" ? (
            <div>
              <Label htmlFor="bulk-path">Jalur</Label>
              <select
                id="bulk-path"
                value={action.pathId}
                onChange={(event) =>
                  setAction({ kind: "bulk", pathId: event.target.value })
                }
                className="mt-1.5 min-h-11 w-full border border-ink/25 bg-paper-2 px-2 text-[11px]"
              >
                <option value="">Pilih jalur</option>
                {Array.from(
                  new Set(rows.map((work) => work.pathId).filter(Boolean)),
                ).map((pathId) => (
                  <option key={String(pathId)} value={String(pathId)}>
                    {pathTitle(String(pathId))}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {publishBlocked ? (
            <div className="border border-[#9a3423]/40 bg-[#9a3423]/5 p-3">
              <p className="text-[11px] font-semibold text-[#9a3423]">
                Karya belum siap terbit
              </p>
              <ul className="mt-1 list-disc pl-4 text-[10.5px] leading-relaxed text-ink-soft">
                {action?.kind === "publish"
                  ? action.work.readiness.missing.map((item) => (
                      <li key={item}>{item}</li>
                    ))
                  : null}
              </ul>
            </div>
          ) : null}
          <div>
            <Label htmlFor="work-reason">Alasan</Label>
            <Textarea
              id="work-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1.5 min-h-24"
              placeholder="Misalnya: dokumen izin sumber budaya perlu diperbarui."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>
              Batal
            </Button>
            <Button
              disabled={
                pending ||
                publishBlocked ||
                (needsReason && reason.trim().length < 8)
              }
              onClick={() => {
                if (!action) return
                const task =
                  action.kind === "publish"
                    ? () =>
                        publishWork({
                          workId: action.work.id as Id<"works">,
                          reason,
                        })
                    : action.kind === "resume"
                      ? () =>
                          resumeWork({
                            workId: action.work.id as Id<"works">,
                            reason,
                          })
                      : action.kind === "bulk"
                        ? () =>
                            bulkPause({
                              pathId: action.pathId || undefined,
                              reason,
                            })
                        : () =>
                            pauseWork({
                              workId: action.work.id as Id<"works">,
                              reason: reason || undefined,
                            })
                void run(
                  task,
                  action.kind === "publish"
                    ? "Karya diterbitkan"
                    : action.kind === "resume"
                      ? "Karya diterbitkan ulang"
                      : action.kind === "bulk"
                        ? "Karya pada jalur dijeda"
                        : "Karya dijeda",
                )
              }}
            >
              {action?.kind === "publish" || action?.kind === "resume" ? (
                <Check aria-hidden="true" />
              ) : (
                <Pause aria-hidden="true" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function WorkFormDialog({
  work,
  viewer,
  onClose,
}: {
  work: WorkListingView | null
  viewer: Viewer | null
  onClose: () => void
}) {
  const createWork = useMutation(api.commerce.createWork)
  const updateWork = useMutation(api.commerce.updateWork)
  const generateUploadUrl = useMutation(api.media.generateWorkImageUploadUrl)
  const saveWorkImage = useMutation(api.media.saveWorkImage)
  const site = useQuery(api.content.getSite)

  const [values, setValues] = React.useState<WorkFormValues>(() =>
    initialValues(work, viewer),
  )
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [pending, setPending] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)

  const blockReason = sellerBlockReason(viewer)
  const pathOptions = React.useMemo(() => {
    const scopes = viewer?.sellScopes ?? []
    const currentPath = work?.pathId
    return currentPath && !scopes.includes(currentPath)
      ? [...scopes, currentPath]
      : scopes
  }, [viewer, work])
  const pathTitles = React.useMemo(
    () =>
      new Map(
        (site?.paths ?? []).map((path) => [path.slug, path.title] as const),
      ),
    [site],
  )
  const pathTitle = (pathId: string) => pathTitles.get(pathId) ?? pathId
  const pathCertificates = certificatesForPath(viewer, values.pathId)
  const teacherPath = isTeacherPath(viewer, values.pathId)
  const pathEligible = isPathEligible(viewer, values.pathId)
  const isService = values.kind === "service"

  function update<K extends keyof WorkFormValues>(
    key: K,
    value: WorkFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function handleKind(kind: "product" | "service") {
    setValues((current) => ({
      ...current,
      kind,
      category: kind === "service" ? "layanan" : "batik",
    }))
  }

  function handlePath(pathId: string) {
    setValues((current) => ({
      ...current,
      pathId,
      certificateId: pathId === current.pathId ? current.certificateId : "",
    }))
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setErrors((current) => ({
        ...current,
        image: "Berkas harus berupa gambar.",
      }))
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors((current) => ({
        ...current,
        image: "Ukuran foto maksimal 10 MB.",
      }))
      return
    }
    setUploading(true)
    setErrors((current) => {
      const next = { ...current }
      delete next.image
      return next
    })
    try {
      const uploadUrl = await generateUploadUrl({})
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!response.ok) throw new Error("Unggahan foto gagal.")
      const payload = (await response.json()) as { storageId?: string }
      if (!payload.storageId) {
        throw new Error("Unggahan tidak mengembalikan berkas.")
      }
      const saved = await saveWorkImage({
        storageId: payload.storageId as Id<"_storage">,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        alt: values.title.trim() || file.name,
      })
      setValues((current) => ({
        ...current,
        imageAssetId: saved.assetId,
        imageUrl: saved.url,
      }))
      toast("Foto karya terunggah")
    } catch (error) {
      setErrors((current) => ({ ...current, image: errorMessage(error) }))
    } finally {
      setUploading(false)
    }
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {}
    if (values.title.trim().length < 3) {
      next.title = "Judul minimal 3 karakter."
    }
    if (!values.pathId) {
      next.pathId = "Pilih jalur."
    } else if (!pathEligible) {
      next.pathId =
        "Jalur ini tidak memiliki sertifikat terbit atau cakupan pengajar."
    }
    if (!teacherPath && values.pathId && !values.certificateId) {
      next.certificateId = "Pilih sertifikat terbit untuk jalur ini."
    }
    if (!values.price || Number(values.price) <= 0) {
      next.price = "Harga harus lebih dari 0."
    }
    if (!values.unit.trim()) {
      next.unit = isService
        ? "Cakupan layanan wajib diisi."
        : "Satuan wajib diisi."
    }
    if (!values.technique.trim()) {
      next.technique = isService
        ? "Pendekatan layanan wajib diisi."
        : "Teknik wajib diisi."
    }
    if (!values.description.trim()) {
      next.description = "Deskripsi wajib diisi."
    }
    if (!values.imageAssetId) next.image = "Unggah foto karya."
    if (!values.region.trim()) next.region = "Wilayah wajib diisi."
    return next
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (blockReason) {
      toast("Ruang jual belum terbuka", { description: blockReason })
      return
    }
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast("Periksa formulir", {
        description: "Beberapa kolom belum lengkap.",
      })
      return
    }
    setPending(true)
    try {
      const payload = {
        title: values.title.trim(),
        pathId: values.pathId,
        certificateId: values.certificateId
          ? (values.certificateId as Id<"certificates">)
          : undefined,
        price: Number(values.price),
        priceLabel: values.priceLabel.trim() || undefined,
        unit: values.unit.trim(),
        technique: values.technique.trim(),
        techniqueNote: values.techniqueNote.trim() || undefined,
        description: values.description.trim(),
        imageAssetId: values.imageAssetId as Id<"mediaAssets">,
        kind: values.kind,
        category: values.category,
        permission: values.permission.trim(),
        provenance: values.provenance.trim(),
        materials: values.materials.trim(),
        region: values.region.trim(),
      }
      if (work) {
        await updateWork({ workId: work.id as Id<"works">, ...payload })
        toast("Karya diperbarui")
      } else {
        await createWork(payload)
        toast("Karya dibuat sebagai draf")
      }
      onClose()
    } catch (error) {
      const data = errorData(error)
      toast("Karya belum dapat disimpan", {
        description: data?.missing?.length
          ? `Lengkapi: ${data.missing.join(", ")}.`
          : data?.message ?? "Periksa kembali formulir.",
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{work ? "Ubah karya" : "Buat karya"}</DialogTitle>
          <DialogDescription>
            {work
              ? "Perbarui data karya selama masih draf atau dalam tinjauan. Foto disimpan di Convex storage."
              : "Karya baru masuk draf. Unggah foto, lengkapi izin dan provenans, lalu kirim untuk ditinjau."}
          </DialogDescription>
        </DialogHeader>

        {blockReason ? (
          <div className="border border-[#9a3423]/40 bg-[#9a3423]/5 p-3">
            <p className="text-[11px] font-semibold text-[#9a3423]">
              Ruang jual belum terbuka
            </p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-ink-soft">
              {blockReason}
            </p>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link href="/ruang/kredensial">Buka kredensial penjual</Link>
            </Button>
          </div>
        ) : null}

        <form id="work-form" className="grid gap-3" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="work-title">Judul karya</Label>
            <Input
              id="work-title"
              value={values.title}
              onChange={(event) => update("title", event.target.value)}
              aria-invalid={Boolean(errors.title)}
              className="mt-1.5"
            />
            <FieldError message={errors.title} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="work-kind">Jenis</Label>
              <select
                id="work-kind"
                value={values.kind}
                onChange={(event) =>
                  handleKind(event.target.value as "product" | "service")
                }
                className="mt-1.5 min-h-11 w-full border border-ink/25 bg-paper-2 px-2 text-[11px]"
              >
                {WORK_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {WORK_KIND_LABELS[kind]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="work-category">Kategori</Label>
              <select
                id="work-category"
                value={values.category}
                onChange={(event) =>
                  update(
                    "category",
                    event.target.value as "batik" | "layanan",
                  )
                }
                className="mt-1.5 min-h-11 w-full border border-ink/25 bg-paper-2 px-2 text-[11px]"
              >
                {WORK_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {WORK_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="work-path">Jalur bersertifikat</Label>
              <select
                id="work-path"
                value={values.pathId}
                onChange={(event) => handlePath(event.target.value)}
                aria-invalid={Boolean(errors.pathId)}
                className="mt-1.5 min-h-11 w-full border border-ink/25 bg-paper-2 px-2 text-[11px]"
              >
                <option value="" disabled>
                  Pilih jalur
                </option>
                {pathOptions.map((pathId) => (
                  <option key={pathId} value={pathId}>
                    {pathTitle(pathId)}
                  </option>
                ))}
              </select>
              <FieldError message={errors.pathId} />
            </div>
            <div>
              <Label htmlFor="work-certificate">Sertifikat</Label>
              <select
                id="work-certificate"
                value={values.certificateId}
                onChange={(event) =>
                  update("certificateId", event.target.value)
                }
                aria-invalid={Boolean(errors.certificateId)}
                className="mt-1.5 min-h-11 w-full border border-ink/25 bg-paper-2 px-2 text-[11px]"
              >
                <option value="">
                  {teacherPath
                    ? "Opsional untuk pengajar"
                    : "Pilih sertifikat terbit"}
                </option>
                {values.certificateId &&
                !pathCertificates.some(
                  (certificate) => certificate.id === values.certificateId,
                ) ? (
                  <option value={values.certificateId}>
                    Sertifikat lama (perlu diperbarui)
                  </option>
                ) : null}
                {pathCertificates.map((certificate) => (
                  <option key={certificate.id} value={certificate.id}>
                    {certificate.publicCode} · {certificate.pathId}
                  </option>
                ))}
              </select>
              <FieldError message={errors.certificateId} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="work-price">Harga (rupiah)</Label>
              <Input
                id="work-price"
                type="number"
                min={1}
                step={1}
                value={values.price}
                onChange={(event) => update("price", event.target.value)}
                aria-invalid={Boolean(errors.price)}
                className="mt-1.5"
              />
              <FieldError message={errors.price} />
            </div>
            <div>
              <Label htmlFor="work-price-label">Label harga</Label>
              <Input
                id="work-price-label"
                value={values.priceLabel}
                onChange={(event) => update("priceLabel", event.target.value)}
                placeholder="Opsional"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="work-unit">
                {isService ? "Cakupan layanan" : "Satuan"}
              </Label>
              <Input
                id="work-unit"
                value={values.unit}
                onChange={(event) => update("unit", event.target.value)}
                aria-invalid={Boolean(errors.unit)}
                placeholder={isService ? "per sesi / per paket" : "per helai"}
                className="mt-1.5"
              />
              <FieldError message={errors.unit} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="work-technique">
                {isService ? "Pendekatan layanan" : "Teknik"}
              </Label>
              <Input
                id="work-technique"
                value={values.technique}
                onChange={(event) => update("technique", event.target.value)}
                aria-invalid={Boolean(errors.technique)}
                className="mt-1.5"
              />
              <FieldError message={errors.technique} />
            </div>
            <div>
              <Label htmlFor="work-technique-note">Catatan teknik</Label>
              <Input
                id="work-technique-note"
                value={values.techniqueNote}
                onChange={(event) =>
                  update("techniqueNote", event.target.value)
                }
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="work-description">
              {isService ? "Deskripsi layanan" : "Deskripsi karya"}
            </Label>
            <Textarea
              id="work-description"
              value={values.description}
              onChange={(event) => update("description", event.target.value)}
              aria-invalid={Boolean(errors.description)}
              className="mt-1.5 min-h-20"
            />
            <FieldError message={errors.description} />
          </div>

          <div>
            <Label htmlFor="work-image">Foto karya</Label>
            <div className="mt-1.5 flex flex-wrap items-start gap-3">
              {values.imageUrl ? (
                <div className="space-y-1">
                  <div className="relative border border-ink/20 bg-panel/30 p-1">
                    {/* Convex storage URL; remote patterns are not configured. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={values.imageUrl}
                      alt="Pratinjau foto karya"
                      className="h-28 w-40 object-cover"
                    />
                    <button
                      type="button"
                      aria-label="Hapus foto"
                      onClick={() =>
                        setValues((current) => ({
                          ...current,
                          imageAssetId: null,
                          imageUrl: "",
                        }))
                      }
                      className="absolute -right-2 -top-2 flex size-6 items-center justify-center border border-ink/30 bg-paper text-ink hover:bg-panel"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-1 text-[10px] font-semibold text-thread">
                    Ganti foto
                    <input
                      id="work-image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void handleFile(file)
                        event.target.value = ""
                      }}
                    />
                  </label>
                </div>
              ) : (
                <label className="flex h-28 w-40 cursor-pointer flex-col items-center justify-center gap-1.5 border border-dashed border-ink/30 text-ink-muted hover:bg-panel/30">
                  <ImagePlus className="size-5" aria-hidden="true" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">
                    Pilih foto
                  </span>
                  <input
                    id="work-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) void handleFile(file)
                      event.target.value = ""
                    }}
                  />
                </label>
              )}
              <div className="max-w-[220px] text-[10px] leading-relaxed text-ink-muted">
                <p>JPG, PNG, WebP, AVIF, atau GIF. Maksimal 10 MB.</p>
                {uploading ? (
                  <p className="mt-1 font-semibold text-thread">
                    Mengunggah ke Convex…
                  </p>
                ) : values.imageUrl ? (
                  <p className="mt-1 text-moss">
                    Foto tersimpan di Convex storage.
                  </p>
                ) : null}
              </div>
            </div>
            <FieldError message={errors.image} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="work-permission">Izin sumber</Label>
              <Input
                id="work-permission"
                value={values.permission}
                onChange={(event) => update("permission", event.target.value)}
                aria-invalid={Boolean(errors.permission)}
                className="mt-1.5"
              />
              <FieldError message={errors.permission} />
            </div>
            <div>
              <Label htmlFor="work-provenance">Provenans</Label>
              <Input
                id="work-provenance"
                value={values.provenance}
                onChange={(event) => update("provenance", event.target.value)}
                aria-invalid={Boolean(errors.provenance)}
                className="mt-1.5"
              />
              <FieldError message={errors.provenance} />
            </div>
            <div>
              <Label htmlFor="work-materials">
                {isService ? "Alat & bahan" : "Bahan"}
              </Label>
              <Input
                id="work-materials"
                value={values.materials}
                onChange={(event) => update("materials", event.target.value)}
                aria-invalid={Boolean(errors.materials)}
                className="mt-1.5"
              />
              <FieldError message={errors.materials} />
            </div>
          </div>
          <p className="-mt-1 text-[9.5px] text-ink-muted">
            Izin sumber, provenans, dan bahan wajib lengkap sebelum karya
            diajukan. Draf tetap dapat disimpan lebih dulu.
          </p>

          <div>
            <Label htmlFor="work-region">Wilayah</Label>
            <Input
              id="work-region"
              value={values.region}
              onChange={(event) => update("region", event.target.value)}
              aria-invalid={Boolean(errors.region)}
              className="mt-1.5"
            />
            <FieldError message={errors.region} />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            form="work-form"
            disabled={pending || uploading || Boolean(blockReason)}
          >
            {work ? "Simpan perubahan" : "Simpan draf"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function WorkDrawerActions({
  work,
  can,
  pending,
  onEdit,
  onSubmit,
  onConfirm,
  onReview,
  onPublish,
  onPause,
  onResume,
  onSoldOut,
}: {
  work: WorkListingView
  can: (capability: "works.moderate" | "works.review" | "sell") => boolean
  pending: boolean
  onEdit: () => void
  onSubmit: () => void
  onConfirm: () => void
  onReview: () => void
  onPublish: () => void
  onPause: () => void
  onResume: () => void
  onSoldOut: () => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href="/ruang/kredensial">Sertifikat asal</Link>
      </Button>
      {work.canEdit ? (
        <Button size="sm" variant="outline" onClick={onEdit}>
          Ubah
        </Button>
      ) : null}
      {work.canEdit && work.cardStatus === "draft" ? (
        <Button
          size="sm"
          disabled={pending || !work.readiness.ready}
          title={
            work.readiness.ready
              ? undefined
              : `Lengkapi: ${work.readiness.missing.join(", ")}`
          }
          onClick={onSubmit}
        >
          Kirim untuk ditinjau
        </Button>
      ) : null}
      {work.canReview && work.cardStatus === "submitted" ? (
        <Button size="sm" disabled={pending} onClick={onConfirm}>
          <Check aria-hidden="true" />
          Konfirmasi pengajar
        </Button>
      ) : null}
      {work.canModerate && work.cardStatus === "teacher_confirmed" ? (
        <Button size="sm" disabled={pending} onClick={onReview}>
          Mulai moderasi
        </Button>
      ) : null}
      {work.canModerate && work.cardStatus === "admin_review" ? (
        <Button
          size="sm"
          disabled={pending || !work.readiness.ready}
          title={
            work.readiness.ready
              ? undefined
              : `Lengkapi: ${work.readiness.missing.join(", ")}`
          }
          onClick={onPublish}
        >
          Terbitkan
        </Button>
      ) : null}
      {work.status === "published" && (work.isOwner || work.canModerate) ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={onPause}>
          <Pause aria-hidden="true" />
          Jeda
        </Button>
      ) : null}
      {work.status === "published" && work.isOwner ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={onSoldOut}>
          Tandai habis
        </Button>
      ) : null}
      {work.status === "paused" && work.canModerate ? (
        <Button size="sm" disabled={pending} onClick={onResume}>
          Terbitkan ulang
        </Button>
      ) : null}
      {work.status === "published" && can("sell") && work.isOwner ? (
        <span className="self-center text-[10px] text-ink-muted">
          Karya tayang dan dapat dipesan.
        </span>
      ) : null}
    </div>
  )
}

function WorkDetail({ work }: { work: WorkListingView }) {
  return (
    <>
      <DrawerSection title="Status alur">
        <WorkStatusFlow work={work} />
        <p className="mt-2 text-[10.5px] text-ink-muted">
          Langkah berikutnya: {nextActionLabel(work)}
        </p>
      </DrawerSection>

      <DrawerSection title="Foto karya">
        {work.image ? (
          <div className="border border-ink/20 bg-panel/30 p-1">
            {/* Convex storage URL; remote patterns are not configured. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={work.image}
              alt={`Foto ${work.title}`}
              className="max-h-64 w-full object-cover"
            />
          </div>
        ) : (
          <p className="border border-dashed border-ink/25 px-3 py-6 text-center text-[11px] text-ink-muted">
            Belum diisi
          </p>
        )}
      </DrawerSection>

      <DrawerSection title="Identitas karya">
        <DetailGrid
          items={[
            { label: "Serial", value: work.workCard },
            { label: "Judul", value: work.title },
            { label: "Pembuat", value: work.maker },
            { label: "Peran", value: work.makerRole },
            { label: "Pengajar", value: work.teacher || "Belum diisi" },
            { label: "Jalur", value: work.pathId ?? "Belum diisi" },
            {
              label: "Sertifikat",
              value: work.certificateCode ?? work.certificateId ?? "Belum diisi",
            },
            { label: "Wilayah", value: work.region || "Belum diisi" },
            { label: "Harga", value: formatIDR(work.price) },
            { label: "Satuan", value: work.unit || "Belum diisi" },
            { label: "Dibuat", value: formatCommerceDate(work.createdAt) },
          ]}
        />
      </DrawerSection>

      <DrawerSection title="Kartu Karya">
        <div className="border border-ink/25 bg-panel/30 p-3">
          <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-copper-dark">
            {work.workCard}
          </p>
          <dl className="mt-2 space-y-1.5 text-[11px]">
            <div>
              <dt className="font-bold uppercase tracking-[0.05em] text-ink-muted">
                Teknik
              </dt>
              <dd>{work.technique || "Belum diisi"}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-[0.05em] text-ink-muted">
                Bahan
              </dt>
              <dd>{work.materials || "Belum diisi"}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-[0.05em] text-ink-muted">
                Provenans
              </dt>
              <dd>{work.provenance || "Belum diisi"}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-[0.05em] text-ink-muted">
                Izin
              </dt>
              <dd>{work.permission || "Belum diisi"}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-[0.05em] text-ink-muted">
                Akses
              </dt>
              <dd>{accessLevelLabel(work.accessLevel)}</dd>
            </div>
          </dl>
        </div>
      </DrawerSection>

      <DrawerSection title="Kesiapan terbit">
        <ReadinessChecklist readiness={work.readiness} />
      </DrawerSection>

      <DrawerSection title="Pratinjau bagi hasil">
        {work.split ? (
          <>
            <div className="flex h-6 border border-ink/25" aria-hidden="true">
              <span
                className="h-full bg-copper-dark"
                style={{ width: `${SPLIT_PERCENTAGES.teacher}%` }}
              />
              <span
                className="h-full bg-ink"
                style={{ width: `${SPLIT_PERCENTAGES.platform}%` }}
              />
              <span
                className="h-full bg-moss"
                style={{ width: `${SPLIT_PERCENTAGES.community}%` }}
              />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-[9.5px]">
              <p>
                <span className="block font-bold uppercase tracking-[0.05em] text-ink-muted">
                  Pengrajin
                </span>
                <span className="mt-0.5 block font-semibold tabular-nums">
                  {formatIDR(work.split.teacherShare)}
                </span>
              </p>
              <p>
                <span className="block font-bold uppercase tracking-[0.05em] text-ink-muted">
                  Platform
                </span>
                <span className="mt-0.5 block font-semibold tabular-nums">
                  {formatIDR(work.split.platformShare)}
                </span>
              </p>
              <p>
                <span className="block font-bold uppercase tracking-[0.05em] text-ink-muted">
                  Komunitas
                </span>
                <span className="mt-0.5 block font-semibold tabular-nums">
                  {formatIDR(work.split.communityShare)}
                </span>
              </p>
            </div>
          </>
        ) : (
          <p className="text-[11px] text-ink-muted">
            Harga belum sah untuk menghitung bagi hasil.
          </p>
        )}
      </DrawerSection>

      {work.permission ? (
        <p className="mt-4 flex items-start gap-2 text-[10px] text-ink-muted">
          <ShieldCheck className="mt-0.5 size-3.5 text-moss" aria-hidden="true" />
          {work.permission}
        </p>
      ) : null}
    </>
  )
}

function WorkStatusFlow({ work }: { work: WorkListingView }) {
  const special = work.status === "paused" || work.status === "sold_out"
  const currentIndex = work.cardStatus
    ? WORK_STAGES.findIndex((stage) => stage.id === work.cardStatus)
    : 0

  return (
    <div>
      <ol className="flex flex-wrap gap-1.5">
        {WORK_STAGES.map((stage, index) => {
          const done =
            work.cardStatus === "published" ||
            (currentIndex >= 0 && index < currentIndex)
          const active = !special && index === currentIndex
          return (
            <li
              key={stage.id}
              className={`flex items-center gap-1.5 border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.06em] ${
                active
                  ? "border-thread bg-thread/10 text-thread"
                  : done
                    ? "border-moss/40 bg-moss/10 text-moss"
                    : "border-ink/20 text-ink-muted"
              }`}
            >
              <span className="tabular-nums">{index + 1}</span>
              {stage.label}
            </li>
          )
        })}
      </ol>
      {special ? (
        <p className="mt-2 text-[10.5px] font-semibold text-[#8a5a16]">
          Status khusus:{" "}
          {work.status
            ? WORK_STATUS_LABELS[work.status]
            : "Tidak diketahui"}
        </p>
      ) : null}
    </div>
  )
}

function ReadinessChecklist({ readiness }: { readiness: WorkReadiness }) {
  return (
    <ul className="space-y-2">
      {Object.values(WORK_READINESS_LABELS).map((item) => {
        const done = !readiness.missing.includes(item)
        return (
          <li key={item} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 flex size-4 shrink-0 items-center justify-center border ${
                done
                  ? "border-moss bg-moss text-paper"
                  : "border-ink/30 text-transparent"
              }`}
            >
              <Check className="size-2.5" aria-hidden="true" />
            </span>
            <span
              className={`text-[11px] ${
                done ? "text-ink-soft" : "font-semibold text-[#9a3423]"
              }`}
            >
              {item}
            </span>
            {!done ? (
              <span className="ml-auto text-[9px] font-bold uppercase tracking-[0.06em] text-[#9a3423]">
                Belum diisi
              </span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function workColumns(
  onSelect: (work: WorkListingView) => void,
  actions: {
    confirm: (work: WorkListingView) => void
    review: (work: WorkListingView) => void
    publish: (work: WorkListingView) => void
    pause: (work: WorkListingView) => void
    resume: (work: WorkListingView) => void
    submit: (work: WorkListingView) => void
    soldOut: (work: WorkListingView) => void
    edit: (work: WorkListingView) => void
  },
): Column<WorkListingView>[] {
  return [
    {
      id: "work",
      header: "Karya",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.title}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">{row.workCard}</p>
        </div>
      ),
    },
    {
      id: "maker",
      header: "Pembuat",
      cell: (row) => (
        <div>
          <p className="text-[11.5px]">{row.maker}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">
            {row.pathId ?? "—"}
          </p>
        </div>
      ),
    },
    {
      id: "price",
      header: "Harga",
      cell: (row) => (
        <span className="text-[11px] tabular-nums">{formatIDR(row.price)}</span>
      ),
      align: "right",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => {
        const stamp = workStamp(row)
        return <StatusStamp label={stamp.label} tone={stamp.tone} />
      },
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-0.5">
          {row.canEdit ? (
            <Button size="sm" variant="ghost" onClick={() => actions.edit(row)}>
              Ubah
            </Button>
          ) : null}
          {row.canEdit && row.cardStatus === "draft" ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={!row.readiness.ready}
              title={
                row.readiness.ready
                  ? undefined
                  : `Lengkapi: ${row.readiness.missing.join(", ")}`
              }
              onClick={() => actions.submit(row)}
            >
              Kirim
            </Button>
          ) : null}
          {row.canReview && row.cardStatus === "submitted" ? (
            <Button size="sm" variant="ghost" onClick={() => actions.confirm(row)}>
              Konfirmasi
            </Button>
          ) : null}
          {row.canModerate && row.cardStatus === "teacher_confirmed" ? (
            <Button size="sm" variant="ghost" onClick={() => actions.review(row)}>
              Moderasi
            </Button>
          ) : null}
          {row.canModerate && row.cardStatus === "admin_review" ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={!row.readiness.ready}
              title={
                row.readiness.ready
                  ? undefined
                  : `Lengkapi: ${row.readiness.missing.join(", ")}`
              }
              onClick={() => actions.publish(row)}
            >
              Terbitkan
            </Button>
          ) : null}
          {row.status === "published" && (row.isOwner || row.canModerate) ? (
            <Button size="sm" variant="ghost" onClick={() => actions.pause(row)}>
              Jeda
            </Button>
          ) : null}
          {row.status === "published" && row.isOwner ? (
            <Button size="sm" variant="ghost" onClick={() => actions.soldOut(row)}>
              Habis
            </Button>
          ) : null}
          {row.status === "paused" && row.canModerate ? (
            <Button size="sm" variant="ghost" onClick={() => actions.resume(row)}>
              Terbitkan ulang
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => onSelect(row)}>
            <Eye aria-hidden="true" />
            Buka
          </Button>
        </div>
      ),
    },
  ]
}
