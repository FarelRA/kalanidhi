"use client"

import * as React from "react"
import {
  ArrowRight,
  Building2,
  Download,
  Mail,
  Phone,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { leads } from "@/lib/workspace/mock-data"
import type { Lead } from "@/lib/workspace/types"
import { formatWorkspaceDate } from "@/lib/workspace/format"

const leadOwners = Array.from(
  new Set(leads.map((lead) => lead.owner).filter(Boolean)),
)

export function LeadsBoard() {
  const [tab, setTab] = React.useState("new")
  const [selected, setSelected] = React.useState<Lead | null>(null)
  const [note, setNote] = React.useState("")
  const [followUp, setFollowUp] = React.useState("")
  const [owner, setOwner] = React.useState(leadOwners[0] ?? "")

  const views: Record<string, (lead: Lead) => boolean> = {
    new: (lead) => lead.status === "new",
    follow: (lead) => ["new", "contacted", "qualified"].includes(lead.status),
    institution: (lead) => lead.intent === "Institusi" || lead.intent === "Kemitraan",
    done: (lead) => lead.status === "converted",
    spam: (lead) => lead.status === "spam",
  }
  const rows = leads.filter(views[tab] ?? views.follow)

  function openLead(lead: Lead) {
    setSelected(lead)
    setOwner(lead.owner)
    setFollowUp("")
    setNote("")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Prospek"
        title="Percakapan sebelum bangku."
        description="Lead dari landing, WhatsApp, dan rujukan. Setiap tindakan menyimpan pemilik, catatan, dan tanggal tindak lanjut."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                toast("Ekspor tercatat", {
                  description: "CSV lead disiapkan. Ekspor masuk ke log audit.",
                })
              }
            >
              <Download aria-hidden="true" />
              Ekspor
            </Button>
            <Button asChild>
              <a href="mailto:kontak@sanggar-lestari.org">
                <Mail aria-hidden="true" />
                Balas lead terbaru
              </a>
            </Button>
          </>
        }
      />

      <div className="grid gap-2.5 sm:grid-cols-4">
        {[
          ["Lead baru", "2", "belum disentuh"],
          ["Perlu dihubungi", "3", "dalam 1 hari"],
          ["Terkualifikasi", "1", "siap penawaran"],
          ["Konversi", "38,2%", "30 hari terakhir"],
        ].map(([label, value, note]) => (
          <div key={label} className="border border-ink/20 bg-paper-2 p-3.5">
            <p className="text-[8.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              {label}
            </p>
            <p className="mt-1.5 font-heading text-2xl leading-none text-ink">{value}</p>
            <p className="mt-1 text-[9.5px] text-ink-muted">{note}</p>
          </div>
        ))}
      </div>

      <SegmentedTabs
        tabs={[
          { id: "new", label: "Baru", count: leads.filter(views.new).length },
          { id: "follow", label: "Perlu dihubungi", count: leads.filter(views.follow).length },
          { id: "institution", label: "Institusi", count: leads.filter(views.institution).length },
          { id: "done", label: "Selesai", count: leads.filter(views.done).length },
          { id: "spam", label: "Spam", count: leads.filter(views.spam).length },
        ]}
        value={tab}
        onChange={setTab}
        ariaLabel="Pilih tampilan prospek"
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-9"
          eyebrow="CRM"
          title="Antrean lead"
          bodyClassName="p-0"
        >
          <DataTable
            rows={rows}
            columns={leadColumns(openLead)}
            caption="Lead dengan niat, kontak, minat, umur, pemilik, dan status"
            searchPlaceholder="Cari nama, kontak, minat, atau wilayah"
            getSearchText={(row) =>
              `${row.name} ${row.contact} ${row.interest} ${row.region} ${row.owner} ${row.statusLabel}`
            }
            filters={[
              {
                id: "source",
                label: "Sumber",
                options: [
                  { value: "all", label: "Semua" },
                  ...Array.from(new Set(leads.map((lead) => lead.source))).map(
                    (source) => ({ value: source, label: source }),
                  ),
                ],
              },
              {
                id: "owner",
                label: "Pemilik",
                options: [
                  { value: "all", label: "Semua" },
                  ...leadOwners.map((name) => ({
                    value: name,
                    label: name.split(" ")[0] ?? name,
                  })),
                ],
              },
            ]}
            filterRow={(row, values) => {
              const sourceOk =
                !values.source || values.source === "all" || row.source === values.source
              const ownerOk =
                !values.owner || values.owner === "all" || row.owner === values.owner
              return sourceOk && ownerOk
            }}
            emptyTitle="Tidak ada lead pada tampilan ini"
            emptyDescription="Lead baru akan muncul di sini begitu formulir atau WhatsApp masuk."
            minWidth={820}
            footer={
              <p>
                Semua ekspor dan perubahan pemilik masuk ke log audit. Data
                pribadi disimpan sesuai kebijakan retensi.
              </p>
            }
          />
        </Panel>

        <div className="space-y-4 xl:col-span-3">
          <Panel eyebrow="Tindak lanjut" title="Hari ini">
            <ul className="space-y-2.5">
              {leads
                .filter((lead) => ["new", "contacted"].includes(lead.status))
                .slice(0, 3)
                .map((lead) => (
                  <li key={lead.id} className="border-b border-ink/10 pb-2.5 last:border-b-0 last:pb-0">
                    <button
                      type="button"
                      onClick={() => openLead(lead)}
                      className="w-full text-left"
                    >
                      <p className="text-[11px] font-semibold text-ink hover:text-copper-dark">
                        {lead.name}
                      </p>
                      <p className="mt-0.5 text-[9.5px] leading-snug text-ink-muted">
                        {lead.interest}
                      </p>
                      <p className="mt-1 text-[8.5px] font-bold uppercase tracking-[0.05em] text-ink-muted">
                        {lead.owner} · {lead.ageDays} hari
                      </p>
                    </button>
                  </li>
                ))}
            </ul>
          </Panel>
          <Panel eyebrow="Panduan" title="Dari lead ke bangku">
            <ol className="space-y-2.5">
              {[
                ["01", "Hubungi dalam 1 hari kerja"],
                ["02", "Catat kebutuhan dan anggaran"],
                ["03", "Kirim jalur atau penawaran"],
                ["04", "Hubungkan akun atau pesanan"],
              ].map(([code, text]) => (
                <li key={code} className="flex gap-2 text-[10.5px] leading-relaxed text-ink-soft">
                  <span className="font-heading text-copper-dark">{code}</span>
                  {text}
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        eyebrow={selected ? `Lead · ${selected.intent}` : "Lead"}
        title={selected?.name ?? ""}
        stamp={selected?.statusLabel}
        tone={selected?.tone}
        description={selected?.contact}
        footer={
          selected ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  toast("Lead dihubungi", {
                    description: `${selected.name} ditandai dihubungi. Tindak lanjut dicatat.`,
                  })
                  setSelected(null)
                }}
              >
                Tandai dihubungi
              </Button>
              {selected.intent === "Institusi" || selected.intent === "Kemitraan" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toast("Draf penawaran dibuat", {
                      description: "Dokumen penawaran dibuka dengan data institusi.",
                    })
                  }
                >
                  Buat penawaran
                </Button>
              ) : (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                >
                  <a href={`mailto:${selected.contact}`}>
                    <Mail aria-hidden="true" />
                    Email
                  </a>
                </Button>
              )}
            </div>
          ) : undefined
        }
      >
        {selected ? (
          <>
            <DetailGrid
              items={[
                { label: "Niat", value: selected.intent },
                { label: "Minat", value: selected.interest },
                { label: "Sumber", value: selected.source },
                { label: "Wilayah", value: selected.region },
                { label: "Pemilik", value: selected.owner },
                { label: "Masuk", value: formatWorkspaceDate(selected.createdAt) },
                { label: "Umur", value: `${selected.ageDays} hari` },
                { label: "Kontak", value: selected.contact },
              ]}
            />
            <DrawerSection title="Pesan awal">
              <p className="border-l-2 border-copper/50 pl-3 text-[11.5px] leading-relaxed text-ink-soft">
                {selected.note}
              </p>
            </DrawerSection>
            <DrawerSection title="Linimasa">
              <ol className="space-y-3">
                {selected.timeline.map((item) => (
                  <li key={item.id} className="flex gap-2.5">
                    <span className="mt-1 size-1.5 shrink-0 bg-copper-dark" aria-hidden="true" />
                    <div>
                      <p className="text-[10.5px] text-ink-soft">{item.action}</p>
                      <p className="mt-0.5 text-[8.5px] font-bold uppercase tracking-[0.05em] text-ink-muted">
                        {item.actor} · {item.time}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </DrawerSection>
            <DrawerSection title="Catatan dan tindak lanjut">
              <div className="grid gap-2.5">
                <div>
                  <Label htmlFor="lead-owner">Pemilik</Label>
                  <Input
                    id="lead-owner"
                    value={owner}
                    onChange={(event) => setOwner(event.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="lead-follow">Tanggal tindak lanjut</Label>
                  <Input
                    id="lead-follow"
                    type="date"
                    value={followUp}
                    onChange={(event) => setFollowUp(event.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="lead-note">Catatan baru</Label>
                  <Textarea
                    id="lead-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="mt-1.5 min-h-20"
                    placeholder="Ringkas percakapan, kebutuhan, dan langkah berikutnya."
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toast("Catatan ditambahkan", {
                      description: "Pemilik dan tanggal tindak lanjut ikut diperbarui.",
                    })
                  }
                >
                  <Sparkles aria-hidden="true" />
                  Simpan catatan
                </Button>
              </div>
            </DrawerSection>
            <DrawerSection title="Tindakan cepat">
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" asChild>
                  <a href={`https://wa.me/${selected.contact.replace(/\D/g, "")}`}>
                    <Phone aria-hidden="true" />
                    WhatsApp
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    toast("Lead ditandai spam", {
                      description: "Lead dipindahkan ke tampilan spam dengan alasan.",
                    })
                  }
                >
                  Tandai spam
                </Button>
              </div>
            </DrawerSection>
          </>
        ) : null}
      </DetailDrawer>
    </div>
  )
}

function leadColumns(onSelect: (lead: Lead) => void): Column<Lead>[] {
  return [
    {
      id: "name",
      header: "Lead",
      cell: (row) => (
        <div>
          <p className="flex items-center gap-1.5 font-semibold text-ink">
            {row.intent === "Institusi" || row.intent === "Kemitraan" ? (
              <Building2 className="size-3.5 text-copper-dark" aria-hidden="true" />
            ) : null}
            {row.name}
          </p>
          <p className="mt-0.5 text-[10px] text-ink-muted">{row.contact}</p>
        </div>
      ),
    },
    {
      id: "intent",
      header: "Niat",
      cell: (row) => (
        <span className="text-[10.5px] text-ink-soft">{row.intent}</span>
      ),
    },
    {
      id: "interest",
      header: "Minat",
      cell: (row) => (
        <span className="block max-w-56 text-[11px] leading-snug text-ink-soft">
          {row.interest}
        </span>
      ),
      className: "hidden lg:table-cell",
      headClassName: "hidden lg:table-cell",
    },
    {
      id: "age",
      header: "Umur",
      cell: (row) => (
        <span className="text-[11px] tabular-nums">{row.ageDays} hari</span>
      ),
    },
    {
      id: "owner",
      header: "Pemilik",
      cell: (row) => (
        <span className="text-[10.5px] text-ink-soft">{row.owner}</span>
      ),
      className: "hidden xl:table-cell",
      headClassName: "hidden xl:table-cell",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusStamp label={row.statusLabel} tone={row.tone} />,
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (row) => (
        <Button size="sm" variant="ghost" onClick={() => onSelect(row)}>
          Buka
          <ArrowRight aria-hidden="true" />
        </Button>
      ),
    },
  ]
}
