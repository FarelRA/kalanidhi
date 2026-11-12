"use client"

import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"

const sections = [
  {
    title: "Sumber budaya",
    note: "Komunitas, dokumen izin, tanggal izin, tingkat akses, atribusi, dan status penarikan.",
  },
  {
    title: "Takedown",
    note: "Permintaan, keputusan, efek pada karya dan daftar terkait, pemberitahuan, dan pembalikan.",
  },
  {
    title: "Privasi",
    note: "Permintaan akses, koreksi, penghapusan, dan retensi dengan alasan yang tercatat.",
  },
  {
    title: "Pratinjau sebagai",
    note: "Hanya baca, berbatas waktu, tidak dapat menyasar pengelola lain, dan selalu masuk audit.",
  },
  {
    title: "Break-glass",
    note: "Rekaman, dokumen identitas, dan aset sensitif memerlukan alasan dan izin berbatas waktu.",
  },
]

export function GovernanceBoardPreview() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tata kelola"
        title="Izin, penarikan, dan akses yang tercatat."
        description="Pratinjau ruang tata kelola. Pada sesi nyata, setiap catatan berasal dari Convex dan setiap tindakan memerlukan alasan serta masuk audit."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Panel key={section.title} eyebrow="Pratinjau" title={section.title}>
            <p className="text-[10.5px] leading-relaxed text-ink-muted">
              {section.note}
            </p>
          </Panel>
        ))}
      </div>
    </div>
  )
}
