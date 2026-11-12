"use client"

import * as React from "react"
import {
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  History,
  Plus,
  Save,
  Send,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DetailDrawer } from "@/components/workspace/data/detail-drawer"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { MediaAssetView } from "@/lib/admin/types"
import type { SiteData } from "@/lib/content/types"
import { validateSiteData } from "@/lib/validation/content"
import { useMutation, useQuery } from "convex/react"
import { cn } from "cn"

const GROUPS: { id: string; label: string; path: string[] }[] = [
  { id: "hero", label: "Hero", path: ["hero"] },
  { id: "traction", label: "Capaian", path: ["traction"] },
  { id: "loop", label: "Lingkaran", path: ["loop"] },
  { id: "catalog", label: "Rak bahan", path: ["catalog"] },
  { id: "mangsa", label: "Musim", path: ["mangsa"] },
  { id: "ethics", label: "Etika dan bagi hasil", path: ["ethics"] },
  { id: "institution", label: "Institusi", path: ["institution"] },
  { id: "sections", label: "Copy bagian", path: ["sections"] },
  { id: "footer", label: "Footer dan newsletter", path: ["footer"] },
  { id: "navigation", label: "Navigasi", path: ["navigation"] },
  { id: "overlays", label: "Overlay", path: ["overlays"] },
  { id: "header", label: "Header", path: ["header"] },
  { id: "search", label: "Pencarian", path: ["search"] },
  { id: "mobileCta", label: "CTA ponsel", path: ["mobileCta"] },
  { id: "leadDialogs", label: "Dialog lead", path: ["leadDialogs"] },
  { id: "metadata", label: "Metadata dan SEO", path: ["metadata"] },
]

const ENTITY_GROUPS: { id: string; label: string; path: string[] }[] = [
  { id: "fields", label: "Bidang katalog", path: ["catalog", "fields"] },
  { id: "paths", label: "Jalur belajar", path: ["paths"] },
  { id: "teachers", label: "Pengajar publik", path: ["teachers"] },
  { id: "works", label: "Karya dan jasa", path: ["works"] },
  { id: "testimonials", label: "Catatan peserta", path: ["testimonials"] },
  { id: "faqs", label: "Pertanyaan umum", path: ["faqs"] },
]

function getValue(root: unknown, path: string[]): unknown {
  let current = root
  for (const key of path) {
    if (current === null || current === undefined) return undefined
    if (Array.isArray(current)) {
      current = current[Number(key)]
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }
  return current
}

function setValue(root: unknown, path: string[], value: unknown): unknown {
  if (path.length === 0) return value
  const [head, ...rest] = path
  if (Array.isArray(root)) {
    const next = [...root]
    next[Number(head)] = setValue(next[Number(head)], rest, value)
    return next
  }
  const record = {
    ...((root && typeof root === "object" ? root : {}) as Record<string, unknown>),
  }
  record[head] = setValue(record[head], rest, value)
  return record
}

function templateFor(path: string[]): unknown {
  const key = path.join(".")
  const templates: Record<string, unknown> = {
    "catalog.fields": {
      name: "Bidang baru",
      region: "Yogyakarta",
      status: "Direncanakan",
      note: "",
    },
    paths: {
      slug: "jalur-baru",
      code: "Jalur baru",
      title: "Jalur baru",
      subtitle: "",
      teacher: "",
      teacherRole: "Pengajar",
      region: "Yogyakarta",
      level: "Pemula",
      modules: 1,
      weeks: 1,
      tasks: 1,
      price: null,
      image: "",
      tags: [],
      outcome: "",
      includes: [],
    },
    teachers: {
      slug: "pengajar-baru",
      name: "Pengajar baru",
      initials: "PB",
      specialty: "",
      region: "Yogyakarta",
      experience: "",
      quote: "",
      focus: "",
      path: "",
      community: "",
      image: "",
      verified: false,
    },
    works: {
      slug: "karya-baru",
      title: "Karya baru",
      category: "batik",
      kind: "product",
      maker: "",
      makerRole: "Peserta",
      teacher: "",
      region: "Yogyakarta",
      price: 0,
      unit: "buah",
      technique: "",
      techniqueNote: "",
      workCard: "",
      description: "",
      image: "",
    },
    testimonials: {
      quote: "",
      name: "",
      role: "Peserta",
      city: "Yogyakarta",
      initials: "PN",
    },
    faqs: { question: "", answer: "" },
    "traction.figures": { value: "", label: "" },
    "loop.stages": { code: "06", title: "", description: "" },
    "ethics.principles": { title: "", description: "" },
    "ethics.accessLevels": { label: "", note: "" },
    "ethics.share": { label: "", value: 0, note: "" },
    "ethics.attribution.sources": { initials: "", name: "", field: "" },
    "institution.segments": "",
    "institution.points": "",
    "institution.brief": ["", ""],
    "footer.columns": { title: "", links: [{ label: "", href: "#" }] },
    navigation: { label: "", href: "#" },
    "search.pages": { label: "", description: "", href: "/" },
    "mangsa.activities": "",
  }
  return structuredClone(templates[key] ?? "")
}

function FieldLabel({ path }: { path: string[] }) {
  return (
    <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-ink-muted">
      {path.join(".")}
    </span>
  )
}

function FieldNode({
  value,
  path,
  onChange,
  depth = 0,
}: {
  value: unknown
  path: string[]
  onChange: (path: string[], value: unknown) => void
  depth?: number
}) {
  if (Array.isArray(value)) {
    return (
      <div className={cn("space-y-2", depth > 0 && "border-l border-ink/15 pl-3")}>
        <div className="flex items-center justify-between gap-2">
          <FieldLabel path={path} />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange(path, [...value, templateFor(path)])}
          >
            <Plus aria-hidden="true" />
            Tambah
          </Button>
        </div>
        {value.length === 0 ? (
          <p className="text-[10px] text-ink-muted">Daftar kosong.</p>
        ) : null}
        {value.map((item, index) => (
          <div
            key={`${path.join(".")}-${index}`}
            className="border border-ink/15 bg-paper/40 p-2.5"
          >
            <div className="mb-2 flex items-center justify-between gap-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-copper-dark">
                #{index + 1}
              </span>
              <div className="flex gap-0.5">
                <button
                  type="button"
                  className="flex size-8 items-center justify-center border border-ink/15 text-ink-muted hover:text-ink"
                  aria-label="Naikkan"
                  onClick={() => {
                    if (index === 0) return
                    const next = [...value]
                    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                    onChange(path, next)
                  }}
                >
                  <ChevronUp className="size-3" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="flex size-8 items-center justify-center border border-ink/15 text-ink-muted hover:text-ink"
                  aria-label="Turunkan"
                  onClick={() => {
                    if (index === value.length - 1) return
                    const next = [...value]
                    ;[next[index + 1], next[index]] = [next[index], next[index + 1]]
                    onChange(path, next)
                  }}
                >
                  <ChevronDown className="size-3" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="flex size-8 items-center justify-center border border-ink/15 text-[#9a3423] hover:bg-panel/40"
                  aria-label="Hapus"
                  onClick={() => onChange(path, value.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-3" aria-hidden="true" />
                </button>
              </div>
            </div>
            <FieldNode
              value={item}
              path={[...path, String(index)]}
              onChange={onChange}
              depth={depth + 1}
            />
          </div>
        ))}
      </div>
    )
  }

  if (typeof value === "string") {
    const long = value.length > 70 || /description|note|quote|body|answer|blurb/.test(path.at(-1) ?? "")
    return (
      <div>
        <FieldLabel path={path} />
        {long ? (
          <Textarea
            value={value}
            onChange={(event) => onChange(path, event.target.value)}
            className="mt-1 min-h-20 text-[12px] leading-relaxed"
          />
        ) : (
          <Input
            value={value}
            onChange={(event) => onChange(path, event.target.value)}
            className="mt-1 h-8 text-[12px]"
          />
        )}
      </div>
    )
  }

  if (typeof value === "number") {
    return (
      <div>
        <FieldLabel path={path} />
        <Input
          type="number"
          value={value}
          onChange={(event) => onChange(path, Number(event.target.value))}
          className="mt-1 h-8 text-[12px] tabular-nums"
        />
      </div>
    )
  }

  if (typeof value === "boolean") {
    return (
      <label className="flex items-center gap-2 text-[11px] text-ink-soft">
        <input
          type="checkbox"
          checked={value}
          onChange={(event) => onChange(path, event.target.checked)}
          className="size-4 accent-[#a9552c]"
        />
        <FieldLabel path={path} />
      </label>
    )
  }

  if (value === null) {
    return (
      <div className="flex items-center gap-2">
        <FieldLabel path={path} />
        <span className="text-[10px] text-ink-muted">null</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onChange(path, 0)}
        >
          Isi angka
        </Button>
      </div>
    )
  }

  if (value && typeof value === "object") {
    return (
      <div className="space-y-2.5">
        {Object.entries(value as Record<string, unknown>).map(([key, child]) => (
          <FieldNode
            key={`${path.join(".")}.${key}`}
            value={child}
            path={[...path, key]}
            onChange={onChange}
            depth={depth + 1}
          />
        ))}
      </div>
    )
  }

  return null
}

function MediaPanel() {
  const assets = useQuery(api.media.listAssets)
  const generateUploadUrl = useMutation(api.media.generateUploadUrl)
  const saveAsset = useMutation(api.media.saveAsset)
  const [file, setFile] = React.useState<File | null>(null)
  const [alt, setAlt] = React.useState("")
  const [credit, setCredit] = React.useState("")
  const [permission, setPermission] = React.useState("")
  const [externalUrl, setExternalUrl] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  async function upload() {
    if (!file && !externalUrl.trim()) {
      toast("Pilih berkas atau isi URL")
      return
    }
    if (!alt.trim()) {
      toast("Teks alternatif wajib")
      return
    }
    setBusy(true)
    try {
      let storageId: string | undefined
      if (file) {
        const url = await generateUploadUrl()
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        })
        const payload = (await response.json()) as { storageId?: string }
        storageId = payload.storageId
        if (!storageId) throw new Error("Upload tidak mengembalikan storageId.")
      }
      await saveAsset({
        kind: file
          ? file.type.startsWith("image/")
            ? "image"
            : file.type.startsWith("audio/")
              ? "audio"
              : file.type.startsWith("video/")
                ? "video"
                : "document"
          : "image",
        storageId: storageId as Id<"_storage"> | undefined,
        externalUrl: storageId ? undefined : externalUrl.trim(),
        filename: file?.name ?? externalUrl.split("/").at(-1) ?? "asset.png",
        mimeType: file?.type ?? "image/png",
        size: file?.size ?? 1_024,
        alt,
        credit: credit || undefined,
        permission: permission || undefined,
      })
      toast("Aset disimpan")
      setFile(null)
      setAlt("")
      setCredit("")
      setPermission("")
      setExternalUrl("")
    } catch (error) {
      toast("Aset gagal disimpan", {
        description: error instanceof Error ? error.message : "Coba lagi.",
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <div>
          <Label htmlFor="media-file">Berkas</Label>
          <Input
            id="media-file"
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="mt-1 text-[11px]"
          />
        </div>
        <div>
          <Label htmlFor="media-url">Atau URL eksternal</Label>
          <Input
            id="media-url"
            value={externalUrl}
            onChange={(event) => setExternalUrl(event.target.value)}
            placeholder="https://..."
            className="mt-1 text-[12px]"
          />
        </div>
        <div>
          <Label htmlFor="media-alt">Teks alternatif</Label>
          <Input
            id="media-alt"
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
            className="mt-1 text-[12px]"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={credit}
            onChange={(event) => setCredit(event.target.value)}
            placeholder="Kredit"
            className="text-[12px]"
          />
          <Input
            value={permission}
            onChange={(event) => setPermission(event.target.value)}
            placeholder="Izin"
            className="text-[12px]"
          />
        </div>
        <Button size="sm" onClick={() => void upload()} disabled={busy}>
          <Upload aria-hidden="true" />
          {busy ? "Mengunggah" : "Simpan aset"}
        </Button>
      </div>
      <ul className="divide-y divide-ink/10">
        {(assets ?? []).slice(0, 8).map((asset: MediaAssetView) => (
          <MediaRow key={asset.id} asset={asset} />
        ))}
      </ul>
    </div>
  )
}

function MediaRow({ asset }: { asset: MediaAssetView }) {
  const usage = useQuery(api.media.getUsage, {
    id: asset.id as Id<"mediaAssets">,
  })
  return (
    <li className="py-2.5 first:pt-0 last:pb-0">
      <p className="truncate text-[11px] font-semibold text-ink">
        {asset.filename}
      </p>
      <p className="mt-0.5 text-[9.5px] text-ink-muted">
        {asset.mimeType} · {Math.round(asset.size / 1024)} KB ·{" "}
        {asset.credit ?? "tanpa kredit"}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[9.5px] text-ink-soft">
        alt: {asset.alt}
      </p>
      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.05em] text-ink-muted">
        {usage?.inUse
          ? `Dipakai di ${usage.references.map((item) => item.label).join(", ")}`
          : "Belum dipakai"}
      </p>
    </li>
  )
}

export function ContentCmsLive() {
  const state = useQuery(api.content.getAdminState)
  const saveDraft = useMutation(api.content.saveDraft)
  const publish = useMutation(api.content.publish)
  const rollback = useMutation(api.content.rollback)
  const acquireLock = useMutation(api.content.acquireLock)
  const releaseLock = useMutation(api.content.releaseLock)
  const [draft, setDraft] = React.useState<SiteData | null>(null)
  const [activeGroup, setActiveGroup] = React.useState("hero")
  const [note, setNote] = React.useState("")
  const [scheduledFor, setScheduledFor] = React.useState("")
  const [confirmSensitive, setConfirmSensitive] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [publishOpen, setPublishOpen] = React.useState(false)
  const [selectedRevision, setSelectedRevision] = React.useState<number | null>(null)
  const acquired = React.useRef(false)

  React.useEffect(() => {
    if (state === undefined || acquired.current) return
    acquired.current = true
    if (!state.lock) {
      void acquireLock({}).catch(() => null)
    }
  }, [state, acquireLock])

  React.useEffect(() => {
    return () => {
      if (acquired.current) void releaseLock({}).catch(() => null)
    }
  }, [releaseLock])

  const activeDraft = draft ?? state?.draftValue ?? null

  const group = [...GROUPS, ...ENTITY_GROUPS].find((item) => item.id === activeGroup) ?? GROUPS[0]
  const groupValue = activeDraft ? getValue(activeDraft, group.path) : undefined
  const readOnly = Boolean(state?.lock && !state.lock.mine)
  const validation = React.useMemo(
    () => (activeDraft ? validateSiteData(activeDraft) : null),
    [activeDraft],
  )

  function update(path: string[], value: unknown) {
    setDraft((current) => {
      const base = current ?? state?.draftValue ?? null
      return base ? (setValue(base, path, value) as SiteData) : base
    })
  }

  async function save() {
    if (!activeDraft) return
    try {
      const result = await saveDraft({
        value: activeDraft,
        note: note || "Simpan draf dari editor",
        baseVersion: state?.draft?.version,
      })
      toast("Draf tersimpan", {
        description: `Revisi v${result.version} tersimpan. Landing publik belum berubah.`,
      })
      setNote("")
    } catch (error) {
      toast("Draf belum bisa disimpan", {
        description: error instanceof Error ? error.message : "Periksa validasi.",
      })
    }
  }

  async function publishNow() {
    if (!state?.draft) {
      toast("Simpan draf terlebih dahulu")
      return
    }
    try {
      const scheduled = scheduledFor
        ? new Date(`${scheduledFor}:00+07:00`).getTime()
        : undefined
      await publish({
        version: state.draft.version,
        note: note || "Terbitkan dari editor",
        scheduledFor: scheduled,
        confirmSensitive,
      })
      toast(
        scheduled && scheduled > Date.now()
          ? "Penerbitan dijadwalkan"
          : "Konten diterbitkan",
        {
          description: scheduled
            ? "Revisi akan terbit pada waktu Asia/Jakarta yang dipilih."
            : "Landing publik memakai revisi ini.",
        },
      )
      setPublishOpen(false)
      setScheduledFor("")
      setConfirmSensitive(false)
    } catch (error) {
      toast("Konten belum bisa diterbitkan", {
        description: error instanceof Error ? error.message : "Periksa validasi.",
      })
    }
  }

  async function openRevision(version: number) {
    setSelectedRevision(version)
  }

  if (state === undefined || activeDraft === null) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Konten" title="Memuat editor." />
        <div className="h-64 animate-pulse border border-ink/15 bg-panel/30" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Konten"
        title="Halaman depan, dari bangku ini."
        description="Setiap medan di landing dapat diedit, divalidasi, disimpan sebagai revisi, lalu diterbitkan atau dibalik. Tidak ada konten tanpa validasi yang bisa terbit."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusStamp
              label={
                state.draft
                  ? `Draf v${state.draft.version}`
                  : state.publishedVersion
                    ? `Terbit v${state.publishedVersion}`
                    : "Belum ada konten"
              }
              tone={state.draft ? "wait" : "done"}
            />
            <span className="text-[10px] text-ink-muted">
              {state.revisions.length} revisi ·{" "}
              {validation?.ok ? "validasi lolos" : `${validation?.issues.length ?? 0} masalah`}
            </span>
          </div>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => void save()} disabled={readOnly}>
              <Save aria-hidden="true" />
              Simpan draf
            </Button>
            <Button onClick={() => setPublishOpen(true)} disabled={readOnly || !state.draft}>
              <Send aria-hidden="true" />
              Terbitkan
            </Button>
          </>
        }
      />

      {readOnly ? (
        <p className="border border-[#8a5a16]/40 bg-panel/50 px-3 py-2 text-[11px] leading-relaxed text-ink-soft">
          Editor sedang dibuka oleh {state.lock?.holderName}. Kunci berlaku sampai{" "}
          {state.lock
            ? new Intl.DateTimeFormat("id-ID", {
                timeZone: "Asia/Jakarta",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(state.lock.expiresAt))
            : "—"}
          . Tunggu sampai kunci kedaluwarsa atau pemegang kunci menutup editor.
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_minmax(0,0.9fr)]">
        <Panel eyebrow="Bagian" title="Editor" bodyClassName="p-0">
          <nav aria-label="Bagian konten" className="max-h-[72vh] overflow-y-auto">
            <ul className="divide-y divide-ink/10">
              {[...GROUPS, ...ENTITY_GROUPS].map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setActiveGroup(item.id)}
                    aria-pressed={activeGroup === item.id}
                    className={cn(
                      "flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold transition-colors",
                      activeGroup === item.id
                        ? "bg-panel/60 text-ink"
                        : "text-ink-soft hover:bg-panel/30 hover:text-ink",
                    )}
                  >
                    <FileText className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </Panel>

        <Panel
          eyebrow="Medan"
          title={group.label}
          bodyClassName="max-h-[72vh] overflow-y-auto p-4"
        >
          <FieldNode value={groupValue} path={group.path} onChange={update} />
        </Panel>

        <div className="space-y-4">
          <Panel
            eyebrow="Pratinjau"
            title="Landing"
            bodyClassName="p-3"
            action={
              <Button size="sm" variant="ghost" onClick={() => setPreviewOpen(true)}>
                <Eye aria-hidden="true" />
                Buka
              </Button>
            }
          >
            <div className="border border-ink/25 bg-cream p-3">
              <p className="text-[7px] font-bold uppercase tracking-[0.14em] text-copper-dark">
                {activeDraft.metadata.siteName} · {activeDraft.header.region}
              </p>
              <h2 className="mt-1.5 font-heading text-lg leading-tight text-ink">
                {activeDraft.hero.title.join(" ")}
              </h2>
              <p className="mt-1.5 line-clamp-4 text-[10px] leading-relaxed text-ink-soft">
                {activeDraft.hero.description}
              </p>
              <div className="mt-2 flex gap-1.5">
                <span className="border border-copper bg-copper px-2 py-1 text-[7px] font-bold uppercase tracking-[0.05em] text-paper">
                  {activeDraft.hero.primaryCta}
                </span>
                <span className="border border-ink/20 px-2 py-1 text-[7px] font-bold uppercase tracking-[0.05em] text-ink-soft">
                  {activeDraft.hero.secondaryCta}
                </span>
              </div>
              <div className="mt-3 border-t border-ink/15 pt-2 text-[8px] leading-relaxed text-ink-muted">
                {activeDraft.footer.certificateNote}
              </div>
            </div>
          </Panel>

          <Panel eyebrow="Validasi" title="Sebelum terbit">
            {validation?.ok ? (
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-moss">
                <Check className="size-3.5" aria-hidden="true" />
                Semua medan wajib, URL, alt, dan entitas valid.
              </p>
            ) : (
              <ul className="space-y-2">
                {(validation?.issues ?? []).slice(0, 6).map((issue) => (
                  <li key={`${issue.path}-${issue.message}`} className="text-[10.5px] leading-relaxed text-ink-soft">
                    <span className="font-semibold text-[#9a3423]">{issue.path}</span>{" "}
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <MediaPanel />

          <Panel
            eyebrow="Revisi"
            title="Riwayat"
            bodyClassName="p-0"
            action={
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.05em] text-ink-muted">
                <History className="size-3" aria-hidden="true" />
                {state.revisions.length}
              </span>
            }
          >
            <ul className="max-h-72 divide-y divide-ink/10 overflow-y-auto">
              {state.revisions.slice(0, 20).map((revision) => (
                <li key={revision.id} className="flex items-start gap-2.5 px-3 py-2.5">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center border border-ink/20 font-heading text-[8px]">
                    {revision.version}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10.5px] font-semibold text-ink">
                        v{revision.version}
                      </span>
                      <StatusStamp
                        label={
                          revision.status === "published"
                            ? "Terbit"
                            : revision.status === "scheduled"
                              ? "Jadwal"
                              : revision.status === "draft"
                                ? "Draf"
                                : "Arsip"
                        }
                        tone={revision.status === "published" ? "done" : "wait"}
                      />
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-ink-muted">
                      {revision.note}
                    </span>
                    <span className="mt-0.5 block text-[8.5px] font-bold uppercase tracking-[0.05em] text-ink-muted">
                      {revision.authorName} ·{" "}
                      {new Intl.DateTimeFormat("id-ID", {
                        timeZone: "Asia/Jakarta",
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(revision.createdAt))}
                    </span>
                  </span>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => void openRevision(revision.version)}
                      className="inline-flex min-h-8 items-center text-[9px] font-bold uppercase tracking-[0.05em] text-copper-dark hover:text-ink"
                    >
                      Buka
                    </button>
                    {revision.status === "published" ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await rollback({
                              version: revision.version,
                              note: `Balik ke v${revision.version}`,
                            })
                            toast("Konten dibalik", {
                              description: `Revisi baru dibuat dari v${revision.version}.`,
                            })
                          } catch (error) {
                            toast("Pembalikan gagal", {
                              description:
                                error instanceof Error ? error.message : "Coba lagi.",
                            })
                          }
                        }}
                        className="inline-flex min-h-8 items-center text-[9px] font-bold uppercase tracking-[0.05em] text-ink-muted hover:text-ink"
                      >
                        Balik
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <RevisionDrawer
        version={selectedRevision}
        onOpenChange={(open) => {
          if (!open) setSelectedRevision(null)
        }}
        onLoad={(value) => {
          setDraft(value)
          setSelectedRevision(null)
          toast("Revisi dimuat ke editor", {
            description: "Simpan sebagai draf baru sebelum terbit.",
          })
        }}
      />

      <DetailDrawer
        open={publishOpen}
        onOpenChange={setPublishOpen}
        eyebrow="Terbit"
        title={state.draft ? `Terbitkan v${state.draft.version}` : "Belum ada draf"}
        description="Penerbitan menulis konten dan entitas ke tabel publik. Riwayat tidak dihapus."
        footer={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setPublishOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => void publishNow()} disabled={!state.draft}>
              <Send aria-hidden="true" />
              {scheduledFor ? "Jadwalkan terbit" : "Terbitkan sekarang"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="publish-note">Catatan terbit</Label>
            <Input
              id="publish-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="publish-time">Jadwalkan (opsional)</Label>
            <Input
              id="publish-time"
              type="datetime-local"
              value={scheduledFor}
              onChange={(event) => setScheduledFor(event.target.value)}
              className="mt-1.5"
            />
            <p className="mt-1 text-[10px] text-ink-muted">
              Zona waktu Asia/Jakarta. Kosongkan untuk terbit sekarang.
            </p>
          </div>
          <label className="flex items-start gap-2 border border-[#8a5a16]/40 bg-panel/35 p-3 text-[10.5px] leading-relaxed text-ink-soft">
            <input
              type="checkbox"
              checked={confirmSensitive}
              onChange={(event) => setConfirmSensitive(event.target.checked)}
              className="mt-0.5 size-4 accent-[#a9552c]"
            />
            Saya mengonfirmasi perubahan sensitif: harga, bagi hasil, metadata,
            atau catatan sertifikat.
          </label>
          {validation && !validation.ok ? (
            <p className="text-[10.5px] leading-relaxed text-[#9a3423]">
              Masih ada {validation.issues.length} masalah validasi. Perbaiki
              sebelum menerbitkan.
            </p>
          ) : null}
        </div>
      </DetailDrawer>

      {previewOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 p-4">
          <div className="mx-auto max-w-4xl border border-ink/30 bg-cream p-5">
            <div className="flex items-center justify-between gap-3 border-b border-ink/20 pb-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-copper-dark">
                  Pratinjau draf
                </p>
                <p className="mt-1 text-[10px] text-ink-muted">
                  Tidak diindeks. Desktop dan ponsel memakai nilai yang sama.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setPreviewOpen(false)}>
                Tutup
              </Button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="border border-ink/20 bg-paper-2 p-4">
                <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-copper-dark">
                  {activeDraft.hero.plate.caption}
                </p>
                <h3 className="mt-2 font-heading text-2xl leading-tight text-ink">
                  {activeDraft.hero.title.join(" ")}
                </h3>
                <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
                  {activeDraft.hero.description}
                </p>
              </div>
              <div className="border border-ink/20 bg-deep p-4 text-paper">
                <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-brass">
                  {activeDraft.loop.label}
                </p>
                <h3 className="mt-2 font-heading text-xl leading-tight">
                  {activeDraft.loop.title}
                </h3>
                <ol className="mt-3 space-y-1.5">
                  {activeDraft.loop.stages.map((stage) => (
                    <li key={stage.code} className="text-[10px] text-paper/75">
                      <span className="font-bold text-brass">{stage.code}</span>{" "}
                      {stage.title}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <div className="mt-4 border border-ink/20 bg-panel/35 p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-muted">
                {activeDraft.catalog.label}
              </p>
              <h3 className="mt-1 font-heading text-lg text-ink">
                {activeDraft.catalog.title}
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                {activeDraft.catalog.description}
              </p>
              <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {activeDraft.paths.slice(0, 4).map((path) => (
                  <div key={path.slug} className="border border-ink/15 bg-paper-2 px-2 py-1.5 text-[10px]">
                    <span className="font-semibold text-ink">{path.title}</span>
                    <span className="ml-2 text-ink-muted">{path.teacher}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function RevisionDrawer({
  version,
  onOpenChange,
  onLoad,
}: {
  version: number | null
  onOpenChange: (open: boolean) => void
  onLoad: (value: SiteData) => void
}) {
  const revision = useQuery(
    api.content.getRevision,
    version === null ? "skip" : { version },
  )

  return (
    <DetailDrawer
      open={version !== null}
      onOpenChange={onOpenChange}
      eyebrow="Revisi"
      title={
        version === null
          ? "Revisi"
          : revision === null
            ? `Revisi v${version} tidak ditemukan`
            : `Revisi v${version}`
      }
      description={revision?.note}
      footer={
        revision ? (
          <Button
            size="sm"
            onClick={() => onLoad(revision.value)}
          >
            Muat ke editor
          </Button>
        ) : undefined
      }
    >
      {revision ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">Status</p>
              <p className="mt-1 text-ink">{revision.status}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">Penulis</p>
              <p className="mt-1 text-ink">{revision.authorId}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">Dibuat</p>
              <p className="mt-1 text-ink">
                {new Intl.DateTimeFormat("id-ID", {
                  timeZone: "Asia/Jakarta",
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(revision.createdAt))}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">Terbit</p>
              <p className="mt-1 text-ink">
                {revision.publishedAt
                  ? new Intl.DateTimeFormat("id-ID", {
                      timeZone: "Asia/Jakarta",
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(revision.publishedAt))
                  : "—"}
              </p>
            </div>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">Ringkasan nilai</p>
            <dl className="mt-2 space-y-1.5 text-[11px]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Hero</dt>
                <dd className="text-right text-ink">{revision.value.hero.title.join(" ")}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Jalur</dt>
                <dd className="text-ink">{revision.value.paths.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Pengajar</dt>
                <dd className="text-ink">{revision.value.teachers.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Karya</dt>
                <dd className="text-ink">{revision.value.works.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">FAQ</dt>
                <dd className="text-ink">{revision.value.faqs.length}</dd>
              </div>
            </dl>
          </div>
        </div>
      ) : revision === null ? (
        <p className="text-[12px] leading-relaxed text-ink-muted">
          Revisi ini tidak tersedia, atau sudah dihapus.
        </p>
      ) : (
        <p className="text-[12px] text-ink-muted">Memuat revisi.</p>
      )}
    </DetailDrawer>
  )
}
