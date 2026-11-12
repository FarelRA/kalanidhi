"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery } from "convex/react"
import { Check, Eye, Pause, Plus, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/convex/_generated/api"
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
import { formatIDR } from "@/lib/format"
import { formatCommerceDate } from "@/lib/commerce/format"
import type { WorkListingView } from "@/lib/commerce/types"
import type { StatusTone } from "@/lib/workspace/types"

function workStamp(work: WorkListingView): { label: string; tone: StatusTone } {
  if (work.status === null) return { label: "Belum diisi", tone: "muted" }
  if (work.status === "published") return { label: "Tayang", tone: "done" }
  if (work.status === "paused") return { label: "Dijeda", tone: "wait" }
  if (work.status === "sold_out") return { label: "Habis", tone: "muted" }
  if (work.status === "review") {
    if (work.cardStatus === "submitted") return { label: "Diajukan", tone: "wait" }
    if (work.cardStatus === "teacher_confirmed") {
      return { label: "Konfirmasi pengajar", tone: "progress" }
    }
    if (work.cardStatus === "admin_review") {
      return { label: "Moderasi", tone: "progress" }
    }
    return { label: "Tinjauan", tone: "wait" }
  }
  return { label: "Draf", tone: "muted" }
}

type ReasonAction =
  | { kind: "publish"; work: WorkListingView }
  | { kind: "pause"; work: WorkListingView }
  | { kind: "resume"; work: WorkListingView }
  | { kind: "bulk"; pathId: string }

export function WorksLive() {
  const { can, viewer } = useViewer()
  const works = useQuery(api.commerce.listWorks, {})
  const createWork = useMutation(api.commerce.createWork)
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
  const [createOpen, setCreateOpen] = React.useState(false)
  const [action, setAction] = React.useState<ReasonAction | null>(null)
  const [reason, setReason] = React.useState("")
  const [pending, setPending] = React.useState(false)

  const rows = works ?? []
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
      setSelected(null)
      setAction(null)
      setReason("")
      return true
    } catch (error) {
      const data =
        typeof error === "object" && error && "data" in error
          ? (error as { data?: { message?: string } }).data
          : undefined
      toast("Tindakan belum dapat dijalankan", {
        description: data?.message ?? "Periksa status karya dan coba lagi.",
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

  const needsReason = action?.kind !== "pause" || can("works.moderate")

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
        description="Setiap karya membawa jalur, sertifikat, izin sumber budaya, dan bagi hasil 70/15/15. Data berasal dari catatan Convex."
        actions={
          can("sell") ? (
            <Button onClick={() => setCreateOpen(true)}>
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

      {works === undefined ? (
        <Panel eyebrow="Karya" title="Memuat catatan karya">
          <p className="text-[11.5px] text-ink-soft">Mengambil data Convex…</p>
        </Panel>
      ) : visible.length === 0 ? (
        <EmptyState
          title={
            active === "review"
              ? "Tidak ada karya menunggu tinjauan"
              : "Belum ada karya"
          }
          description={
            active === "review"
              ? "Karya yang diajukan penjual akan muncul di sini."
              : can("sell")
                ? "Sertifikatmu membuka ruang jual untuk jalur tertentu. Mulai dari satu karya lengkap dengan izin sumber."
                : "Karya muncul setelah sertifikat platform terbit dan profil penjual aktif."
          }
          action={
            can("sell") && active === "mine" ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                Buat karya pertama
              </Button>
            ) : undefined
          }
        />
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
                    () => confirmWork({ workId: work.id as never }),
                    "Karya dikonfirmasi",
                  ),
                review: (work) =>
                  run(
                    () => beginReview({ workId: work.id as never }),
                    "Karya masuk moderasi",
                  ),
                publish: (work) => openReason({ kind: "publish", work }),
                pause: (work) => openReason({ kind: "pause", work }),
                resume: (work) => openReason({ kind: "resume", work }),
                submit: (work) =>
                  run(
                    () => submitWork({ workId: work.id as never }),
                    "Karya diajukan",
                  ),
                soldOut: (work) =>
                  run(
                    () => soldOut({ workId: work.id as never }),
                    "Karya ditandai habis",
                  ),
              },
              can,
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
                  { value: "published", label: "Tayang" },
                  { value: "review", label: "Tinjauan" },
                  { value: "paused", label: "Dijeda" },
                  { value: "draft", label: "Draf" },
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
        title={selected?.title ?? ""}
        stamp={selected ? workStamp(selected).label : undefined}
        tone={selected ? workStamp(selected).tone : undefined}
        description={
          selected ? `${selected.maker} · ${selected.pathId ?? "tanpa jalur"}` : undefined
        }
        footer={
          selected ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/ruang/kredensial">Sertifikat asal</Link>
              </Button>
              {selected.canEdit && selected.cardStatus === "draft" ? (
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => submitWork({ workId: selected.id as never }),
                      "Karya diajukan",
                    )
                  }
                >
                  Ajukan karya
                </Button>
              ) : null}
              {selected.canReview && selected.cardStatus === "submitted" ? (
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => confirmWork({ workId: selected.id as never }),
                      "Karya dikonfirmasi",
                    )
                  }
                >
                  <Check aria-hidden="true" />
                  Konfirmasi pengajar
                </Button>
              ) : null}
              {selected.canModerate && selected.cardStatus === "teacher_confirmed" ? (
                <Button
                  size="sm"
                  onClick={() =>
                    run(
                      () => beginReview({ workId: selected.id as never }),
                      "Karya masuk moderasi",
                    )
                  }
                >
                  Mulai moderasi
                </Button>
              ) : null}
              {selected.canModerate && selected.cardStatus === "admin_review" ? (
                <Button
                  size="sm"
                  onClick={() => openReason({ kind: "publish", work: selected })}
                >
                  Terbitkan
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
                { label: "Pembuat", value: selected.maker },
                { label: "Peran", value: selected.makerRole },
                { label: "Pengajar", value: selected.teacher },
                { label: "Jalur", value: selected.pathId ?? "—" },
                { label: "Teknik", value: selected.technique },
                { label: "Harga", value: formatIDR(selected.price) },
                { label: "Satuan", value: selected.unit },
                { label: "Dibuat", value: formatCommerceDate(selected.createdAt) },
              ]}
            />
            <DrawerSection title="Kartu Karya">
              <div className="border border-ink/25 bg-panel/30 p-3">
                <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-copper-dark">
                  {selected.workCard}
                </p>
                <dl className="mt-2 space-y-1.5 text-[11px]">
                  <div>
                    <dt className="font-bold uppercase tracking-[0.05em] text-ink-muted">
                      Izin
                    </dt>
                    <dd>{selected.permission || "Belum diisi"}</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase tracking-[0.05em] text-ink-muted">
                      Provenans
                    </dt>
                    <dd>{selected.provenance || "Belum diisi"}</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase tracking-[0.05em] text-ink-muted">
                      Bahan
                    </dt>
                    <dd>{selected.materials || "Belum diisi"}</dd>
                  </div>
                </dl>
              </div>
            </DrawerSection>
            <DrawerSection title="Pratinjau bagi hasil">
              {selected.split ? (
                <>
                  <div className="flex h-6 border border-ink/25" aria-hidden="true">
                    <span className="h-full bg-copper-dark" style={{ width: "70%" }} />
                    <span className="h-full bg-ink" style={{ width: "15%" }} />
                    <span className="h-full bg-moss" style={{ width: "15%" }} />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[9.5px]">
                    <p>
                      <span className="block font-bold uppercase tracking-[0.05em] text-ink-muted">
                        Pengrajin
                      </span>
                      <span className="mt-0.5 block font-semibold tabular-nums">
                        {formatIDR(selected.split.teacherShare)}
                      </span>
                    </p>
                    <p>
                      <span className="block font-bold uppercase tracking-[0.05em] text-ink-muted">
                        Platform
                      </span>
                      <span className="mt-0.5 block font-semibold tabular-nums">
                        {formatIDR(selected.split.platformShare)}
                      </span>
                    </p>
                    <p>
                      <span className="block font-bold uppercase tracking-[0.05em] text-ink-muted">
                        Komunitas
                      </span>
                      <span className="mt-0.5 block font-semibold tabular-nums">
                        {formatIDR(selected.split.communityShare)}
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
            {selected.permission ? (
              <p className="mt-4 flex items-start gap-2 text-[10px] text-ink-muted">
                <ShieldCheck className="mt-0.5 size-3.5 text-moss" aria-hidden="true" />
                {selected.permission}
              </p>
            ) : null}
          </>
        ) : null}
      </DetailDrawer>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat karya</DialogTitle>
            <DialogDescription>
              Karya baru masuk draf. Lengkapi izin, provenans, dan foto sebelum
              diajukan agar dapat dikonfirmasi pengajar dan dimoderasi.
            </DialogDescription>
          </DialogHeader>
          <form
            id="create-work"
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              const pathId = String(form.get("pathId") ?? "")
              const certificateId = String(form.get("certificateId") ?? "")
              const certificate = viewer?.certificates.find(
                (item) => item.id === certificateId && item.status === "issued",
              )
              void run(
                () =>
                  createWork({
                    title: String(form.get("title") ?? ""),
                    pathId,
                    certificateId: certificate?.id as never,
                    price: Number(form.get("price") ?? 0),
                    unit: String(form.get("unit") ?? ""),
                    technique: String(form.get("technique") ?? ""),
                    techniqueNote: String(form.get("techniqueNote") ?? ""),
                    description: String(form.get("description") ?? ""),
                    image: String(form.get("image") ?? ""),
                    kind: String(form.get("kind") ?? "product") as "product" | "service",
                    category: String(form.get("category") ?? "batik") as
                      | "batik"
                      | "layanan",
                    permission: String(form.get("permission") ?? ""),
                    provenance: String(form.get("provenance") ?? ""),
                    materials: String(form.get("materials") ?? ""),
                  }),
                "Karya dibuat sebagai draf",
              ).then((ok) => {
                if (ok) setCreateOpen(false)
              })
            }}
          >
            <div>
              <Label htmlFor="work-title">Judul karya</Label>
              <Input id="work-title" name="title" required minLength={3} className="mt-1.5" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="work-path">Jalur bersertifikat</Label>
                <select
                  id="work-path"
                  name="pathId"
                  required
                  defaultValue=""
                  className="mt-1.5 min-h-11 w-full border border-ink/25 bg-paper-2 px-2 text-[11px]"
                >
                  <option value="" disabled>
                    Pilih jalur
                  </option>
                  {(viewer?.sellScopes ?? []).map((pathId) => (
                    <option key={pathId} value={pathId}>
                      {pathId}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="work-certificate">Sertifikat</Label>
                <select
                  id="work-certificate"
                  name="certificateId"
                  defaultValue=""
                  className="mt-1.5 min-h-11 w-full border border-ink/25 bg-paper-2 px-2 text-[11px]"
                >
                  <option value="">Opsional untuk pengajar</option>
                  {(viewer?.certificates ?? [])
                    .filter((item) => item.status === "issued")
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.publicCode} · {item.pathId}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="work-price">Harga (rupiah)</Label>
                <Input
                  id="work-price"
                  name="price"
                  type="number"
                  min={1}
                  step={1}
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="work-unit">Satuan</Label>
                <Input id="work-unit" name="unit" required className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="work-kind">Jenis</Label>
                <select
                  id="work-kind"
                  name="kind"
                  defaultValue="product"
                  className="mt-1.5 min-h-11 w-full border border-ink/25 bg-paper-2 px-2 text-[11px]"
                >
                  <option value="product">Barang</option>
                  <option value="service">Jasa</option>
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="work-technique">Teknik</Label>
                <Input id="work-technique" name="technique" required className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="work-technique-note">Catatan teknik</Label>
                <Input id="work-technique-note" name="techniqueNote" className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label htmlFor="work-description">Deskripsi</Label>
              <Textarea
                id="work-description"
                name="description"
                required
                className="mt-1.5 min-h-20"
              />
            </div>
            <div>
              <Label htmlFor="work-image">URL foto karya</Label>
              <Input
                id="work-image"
                name="image"
                className="mt-1.5"
                placeholder="URL foto dari Convex storage"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="work-permission">Izin sumber</Label>
                <Input id="work-permission" name="permission" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="work-provenance">Provenans</Label>
                <Input id="work-provenance" name="provenance" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="work-materials">Bahan</Label>
                <Input id="work-materials" name="materials" className="mt-1.5" />
              </div>
            </div>
            <input type="hidden" name="category" value="batik" />
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="create-work" disabled={pending}>
              Simpan draf
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              {action?.kind === "publish" || action?.kind === "pause" || action?.kind === "resume"
                ? action.work.title
                : ""}
            </DialogTitle>
            <DialogDescription>
              Tindakan moderasi memerlukan alasan, aktor, dan waktu. Karya yang
              dijeda tidak dapat dipesan; pesanan yang sudah dibayar tetap
              diproses.
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
                    {pathId}
                  </option>
                ))}
              </select>
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
              disabled={pending || (needsReason && reason.trim().length < 8)}
              onClick={() => {
                if (!action) return
                const task =
                  action.kind === "publish"
                    ? () =>
                        publishWork({
                          workId: action.work.id as never,
                          reason,
                        })
                    : action.kind === "resume"
                      ? () =>
                          resumeWork({
                            workId: action.work.id as never,
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
                              workId: action.work.id as never,
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
              <Pause aria-hidden="true" />
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
  },
  can: (capability: "works.moderate" | "sell") => boolean,
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
          <p className="mt-0.5 text-[10px] text-ink-muted">{row.pathId ?? "—"}</p>
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
          {row.canEdit && row.cardStatus === "draft" ? (
            <Button size="sm" variant="ghost" onClick={() => actions.submit(row)}>
              Ajukan
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
            <Button size="sm" variant="ghost" onClick={() => actions.publish(row)}>
              Terbitkan
            </Button>
          ) : null}
          {row.canModerate && row.status === "published" ? (
            <Button size="sm" variant="ghost" onClick={() => actions.pause(row)}>
              Jeda
            </Button>
          ) : null}
          {row.canModerate && row.status === "paused" ? (
            <Button size="sm" variant="ghost" onClick={() => actions.resume(row)}>
              Terbitkan ulang
            </Button>
          ) : null}
          {can("sell") && row.makerId && row.status === "draft" ? (
            <Button size="sm" variant="ghost" onClick={() => actions.submit(row)}>
              Ajukan
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
