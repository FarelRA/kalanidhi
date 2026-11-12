"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { Check, Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { api } from "@/convex/_generated/api"

type Selection = {
  pathSlugs: string[]
  teacherSlugs: string[]
  workSlugs: string[]
  testimonialIds: string[]
  catalogFieldKeys: string[]
  faqKeys: string[]
  heroWorkSlug: string | null
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value]
}

export function FeaturedPanel() {
  const data = useQuery(api.content.getFeaturedOptions)
  const save = useMutation(api.content.setFeatured)
  const [selection, setSelection] = React.useState<Selection | null>(null)
  const [reason, setReason] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const initialized = React.useRef(false)

  React.useEffect(() => {
    if (!data || initialized.current) return
    initialized.current = true
    setSelection(
      data.featured ?? {
        pathSlugs: data.paths.map((item) => item.slug),
        teacherSlugs: data.teachers.map((item) => item.slug),
        workSlugs: data.works.map((item) => item.slug),
        testimonialIds: data.testimonials.map((item) => item.id),
        catalogFieldKeys: data.catalogFields.map((item) => item.key),
        faqKeys: data.faqs.map((item) => item.key),
        heroWorkSlug: data.works[0]?.slug ?? null,
      },
    )
  }, [data])

  async function submit() {
    if (!selection) return
    if (reason.trim().length < 4) {
      toast("Alasan terlalu pendek")
      return
    }
    setPending(true)
    try {
      await save({ ...selection, reason: reason.trim() })
      toast("Pilihan landing disimpan")
      setReason("")
    } catch (error) {
      toast("Gagal menyimpan pilihan", {
        description:
          error instanceof Error ? error.message : "Periksa pilihan.",
      })
    } finally {
      setPending(false)
    }
  }

  if (!data || !selection) {
    return <p className="text-[12px] text-ink-muted">Memuat pilihan landing.</p>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Landing"
        title="Pilih yang tampil, bukan mengetik ulang."
        description="Jalur, pengajar, karya, testimoni, bidang katalog, dan FAQ diambil langsung dari tabel Convex. Pilihan di sini hanya menentukan mana yang tampil, urutannya, dan karya untuk Kartu Karya hero. Tidak ada data entitas yang diketik di sini."
        actions={
          <Button onClick={() => void submit()} disabled={pending}>
            <Save aria-hidden="true" />
            {pending ? "Menyimpan…" : "Simpan pilihan"}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel eyebrow="Jalur" title="Jalur belajar">
          <ul className="space-y-2">
            {data.paths.map((item) => (
              <li key={item.slug}>
                <label className="flex items-center gap-2 text-[11.5px] text-ink">
                  <input
                    type="checkbox"
                    checked={selection.pathSlugs.includes(item.slug)}
                    onChange={() =>
                      setSelection((current) =>
                        current
                          ? {
                              ...current,
                              pathSlugs: toggle(current.pathSlugs, item.slug),
                            }
                          : current,
                      )
                    }
                  />
                  {item.title}
                </label>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel eyebrow="Pengajar" title="Profil pengajar">
          <ul className="space-y-2">
            {data.teachers.map((item) => (
              <li key={item.slug}>
                <label className="flex items-center gap-2 text-[11.5px] text-ink">
                  <input
                    type="checkbox"
                    checked={selection.teacherSlugs.includes(item.slug)}
                    onChange={() =>
                      setSelection((current) =>
                        current
                          ? {
                              ...current,
                              teacherSlugs: toggle(
                                current.teacherSlugs,
                                item.slug,
                              ),
                            }
                          : current,
                      )
                    }
                  />
                  {item.name}
                </label>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel eyebrow="Karya" title="Karya yang tampil">
          <ul className="space-y-2">
            {data.works.map((item) => (
              <li key={item.slug}>
                <label className="flex items-center gap-2 text-[11.5px] text-ink">
                  <input
                    type="checkbox"
                    checked={selection.workSlugs.includes(item.slug)}
                    onChange={() =>
                      setSelection((current) =>
                        current
                          ? {
                              ...current,
                              workSlugs: toggle(current.workSlugs, item.slug),
                            }
                          : current,
                      )
                    }
                  />
                  {item.title}
                </label>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel eyebrow="Testimoni" title="Suara yang tampil">
          <ul className="space-y-2">
            {data.testimonials.map((item) => (
              <li key={item.id}>
                <label className="flex items-start gap-2 text-[11.5px] text-ink">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={selection.testimonialIds.includes(item.id)}
                    onChange={() =>
                      setSelection((current) =>
                        current
                          ? {
                              ...current,
                              testimonialIds: toggle(
                                current.testimonialIds,
                                item.id,
                              ),
                            }
                          : current,
                      )
                    }
                  />
                  <span>
                    <span className="block">{item.quote}</span>
                    <span className="mt-0.5 block text-[10px] text-ink-muted">
                      {item.name}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel eyebrow="Bidang" title="Bidang katalog">
          <ul className="space-y-2">
            {data.catalogFields.map((item) => (
              <li key={item.key}>
                <label className="flex items-center gap-2 text-[11.5px] text-ink">
                  <input
                    type="checkbox"
                    checked={selection.catalogFieldKeys.includes(item.key)}
                    onChange={() =>
                      setSelection((current) =>
                        current
                          ? {
                              ...current,
                              catalogFieldKeys: toggle(
                                current.catalogFieldKeys,
                                item.key,
                              ),
                            }
                          : current,
                      )
                    }
                  />
                  <span>
                    <span className="block">{item.name}</span>
                    <span className="mt-0.5 block text-[10px] text-ink-muted">
                      {item.region} · {item.status}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel eyebrow="FAQ" title="Pertanyaan yang tampil">
          <ul className="space-y-2">
            {data.faqs.map((item) => (
              <li key={item.key}>
                <label className="flex items-start gap-2 text-[11.5px] text-ink">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={selection.faqKeys.includes(item.key)}
                    onChange={() =>
                      setSelection((current) =>
                        current
                          ? {
                              ...current,
                              faqKeys: toggle(current.faqKeys, item.key),
                            }
                          : current,
                      )
                    }
                  />
                  {item.question}
                </label>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel eyebrow="Hero" title="Kartu Karya hero" className="lg:col-span-2">
          <fieldset>
            <legend className="sr-only">Pilih karya untuk Kartu Karya hero</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.works.map((item) => (
                <label
                  key={item.slug}
                  className="flex items-center gap-2 border border-ink/15 bg-paper-2 px-3 py-2 text-[11.5px] text-ink"
                >
                  <input
                    type="radio"
                    name="hero-work"
                    checked={selection.heroWorkSlug === item.slug}
                    onChange={() =>
                      setSelection((current) =>
                        current
                          ? { ...current, heroWorkSlug: item.slug }
                          : current,
                      )
                    }
                  />
                  {item.title}
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setSelection((current) =>
                  current ? { ...current, heroWorkSlug: null } : current,
                )
              }
              className="mt-3 inline-flex min-h-9 items-center border border-ink/20 px-3 text-[10px] font-bold uppercase tracking-[0.06em] text-ink-muted hover:text-ink"
            >
              Kosongkan Kartu Karya hero
            </button>
            <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">
              Serial, judul karya, pembuat, dan pengajar diambil dari karya,
              Kartu Karya, dan akun yang tertaut.
            </p>
          </fieldset>
        </Panel>
      </div>

      <Panel eyebrow="Audit" title="Alasan perubahan">
        <div className="max-w-xl">
          <Label htmlFor="featured-reason">Alasan</Label>
          <Input
            id="featured-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-1.5"
            placeholder="Misalnya: kurasi rilis November."
          />
          <p className="mt-1 text-[10px] text-ink-muted">
            Minimal 4 karakter. Tersimpan di log audit.
          </p>
        </div>
      </Panel>

      <p className="flex items-center gap-2 text-[10.5px] text-ink-muted">
        <Check className="size-3.5 text-moss" aria-hidden="true" />
        Urutan mengikuti urutan pilihan pada daftar ini.
      </p>
    </div>
  )
}
