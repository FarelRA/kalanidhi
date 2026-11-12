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
        description="Katalog, pengajar, karya, dan testimoni diambil langsung dari data Convex. Pilihan di sini hanya menentukan mana yang tampil dan urutannya."
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
