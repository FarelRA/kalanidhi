"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { api } from "@/convex/_generated/api"

type FaqRow = {
  id: string
  order: number
  question: string
  answer: string
}

type Draft = {
  id?: string
  question: string
  answer: string
}

const EMPTY_DRAFT: Draft = { question: "", answer: "" }

export function FaqManager() {
  const data = useQuery(api.content.listFaqs)
  const createFaq = useMutation(api.content.createFaq)
  const updateFaq = useMutation(api.content.updateFaq)
  const deleteFaq = useMutation(api.content.deleteFaq)
  const reorderFaqs = useMutation(api.content.reorderFaqs)

  const [draft, setDraft] = React.useState<Draft | null>(null)
  const [reason, setReason] = React.useState("")
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  const faqs: FaqRow[] = data ?? []

  function startCreate() {
    setDraft({ ...EMPTY_DRAFT })
    setPendingDelete(null)
  }

  function startEdit(faq: FaqRow) {
    setDraft({ id: faq.id, question: faq.question, answer: faq.answer })
    setPendingDelete(null)
  }

  async function submit() {
    if (!draft) return
    const question = draft.question.trim()
    const answer = draft.answer.trim()
    if (question.length < 3 || answer.length < 3) {
      toast("Pertanyaan dan jawaban minimal 3 karakter.")
      return
    }
    const note =
      reason.trim() ||
      (draft.id ? `Ubah FAQ: ${question.slice(0, 80)}` : `Tambah FAQ: ${question.slice(0, 80)}`)
    setPending(true)
    try {
      if (draft.id) {
        await updateFaq({ id: draft.id as never, question, answer, reason: note })
        toast("FAQ diperbarui")
      } else {
        await createFaq({ question, answer, reason: note })
        toast("FAQ ditambahkan")
      }
      setDraft(null)
      setReason("")
    } catch (error) {
      toast("FAQ belum bisa disimpan", {
        description: error instanceof Error ? error.message : "Coba lagi.",
      })
    } finally {
      setPending(false)
    }
  }

  async function remove(faq: FaqRow) {
    setPending(true)
    try {
      await deleteFaq({
        id: faq.id as never,
        reason: reason.trim() || `Hapus FAQ: ${faq.question.slice(0, 80)}`,
      })
      toast("FAQ dihapus")
      setPendingDelete(null)
      setReason("")
    } catch (error) {
      toast("FAQ belum bisa dihapus", {
        description: error instanceof Error ? error.message : "Coba lagi.",
      })
    } finally {
      setPending(false)
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= faqs.length) return
    const next = [...faqs]
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    setPending(true)
    try {
      await reorderFaqs({
        ids: next.map((faq) => faq.id as never),
        reason: reason.trim() || "Urutkan ulang FAQ dari editor konten",
      })
      toast("Urutan FAQ disimpan")
    } catch (error) {
      toast("Urutan belum bisa disimpan", {
        description: error instanceof Error ? error.message : "Coba lagi.",
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Konten"
        title="Pertanyaan yang tampil di landing."
        description="FAQ disimpan di tabel Convex. Tambah, ubah, hapus, dan urutkan di sini; pilih mana yang tampil lewat halaman Pilihan landing. Setiap perubahan masuk log audit."
        actions={
          <Button onClick={startCreate} disabled={pending}>
            <Plus aria-hidden="true" />
            Tambah FAQ
          </Button>
        }
      />

      <Panel eyebrow="Audit" title="Alasan perubahan">
        <div className="max-w-xl">
          <Label htmlFor="faq-reason">Alasan (opsional)</Label>
          <Input
            id="faq-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-1.5"
            placeholder="Misalnya: perbarui jawaban biaya jalur."
          />
          <p className="mt-1 text-[10px] text-ink-muted">
            Kosongkan untuk memakai alasan otomatis. Tersimpan di log audit.
          </p>
        </div>
      </Panel>

      {draft ? (
        <Panel
          eyebrow={draft.id ? "Ubah" : "Baru"}
          title={draft.id ? "Ubah FAQ" : "Tambah FAQ"}
          action={
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDraft(null)}
              disabled={pending}
            >
              <X aria-hidden="true" />
              Batal
            </Button>
          }
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="faq-question">Pertanyaan</Label>
              <Input
                id="faq-question"
                value={draft.question}
                onChange={(event) =>
                  setDraft((current) =>
                    current ? { ...current, question: event.target.value } : current,
                  )
                }
                className="mt-1.5"
                placeholder="Apa yang ingin diketahui calon peserta?"
              />
            </div>
            <div>
              <Label htmlFor="faq-answer">Jawaban</Label>
              <Textarea
                id="faq-answer"
                value={draft.answer}
                onChange={(event) =>
                  setDraft((current) =>
                    current ? { ...current, answer: event.target.value } : current,
                  )
                }
                className="mt-1.5 min-h-28 text-[12.5px] leading-relaxed"
                placeholder="Jawaban ringkas, jujur, dan sesuai data Convex."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void submit()} disabled={pending}>
                <Save aria-hidden="true" />
                {pending ? "Menyimpan…" : "Simpan FAQ"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setDraft(null)}
                disabled={pending}
              >
                Batal
              </Button>
            </div>
          </div>
        </Panel>
      ) : null}

      <Panel eyebrow="Daftar" title={`${faqs.length} pertanyaan`} bodyClassName="p-0">
        {data === undefined ? (
          <p className="px-4 py-6 text-[12px] text-ink-muted">Memuat FAQ.</p>
        ) : faqs.length === 0 ? (
          <p className="px-4 py-6 text-[12px] leading-relaxed text-ink-muted">
            Belum ada FAQ. Tambahkan pertanyaan pertama supaya bagian FAQ di
            landing tidak kosong.
          </p>
        ) : (
          <ul className="divide-y divide-ink/10">
            {faqs.map((faq, index) => (
              <li key={faq.id} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                      #{index + 1} · urutan {faq.order}
                    </p>
                    <h3 className="mt-1 font-heading text-[1.15rem] leading-snug text-ink">
                      {faq.question}
                    </h3>
                    <p className="mt-1.5 max-w-[70ch] text-[12px] leading-relaxed text-ink-soft">
                      {faq.answer}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      className="flex size-9 items-center justify-center border border-ink/15 text-ink-muted hover:text-ink disabled:opacity-40"
                      aria-label="Naikkan"
                      disabled={index === 0 || pending}
                      onClick={() => void move(index, -1)}
                    >
                      <ChevronUp className="size-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="flex size-9 items-center justify-center border border-ink/15 text-ink-muted hover:text-ink disabled:opacity-40"
                      aria-label="Turunkan"
                      disabled={index === faqs.length - 1 || pending}
                      onClick={() => void move(index, 1)}
                    >
                      <ChevronDown className="size-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="flex size-9 items-center justify-center border border-ink/15 text-ink-muted hover:text-ink"
                      aria-label="Ubah"
                      onClick={() => startEdit(faq)}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="flex size-9 items-center justify-center border border-ink/15 text-[#9a3423] hover:bg-panel/40"
                      aria-label="Hapus"
                      onClick={() => setPendingDelete(faq.id)}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {pendingDelete === faq.id ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border border-[#9a3423]/30 bg-[#9a3423]/5 px-3 py-2">
                    <p className="text-[11px] text-ink-soft">
                      Hapus FAQ ini? Tindakan masuk log audit.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPendingDelete(null)}
                      disabled={pending}
                    >
                      Batal
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => void remove(faq)}
                      disabled={pending}
                    >
                      {pending ? "Menghapus…" : "Hapus"}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
