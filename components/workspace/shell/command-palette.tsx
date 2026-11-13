"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight, Search } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { labelForItem, navItems, visibleNav } from "@/components/workspace/shell/nav-config"
import { useViewer } from "@/components/workspace/shell/viewer-provider"

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const { capabilities } = useViewer()
  const [query, setQuery] = React.useState("")

  const routes = React.useMemo(
    () =>
      visibleNav(capabilities).map((item) => ({
        id: item.href,
        type: "Ruang",
        label: labelForItem(item, capabilities),
        meta: item.group,
        href: item.href,
        icon: item.icon,
      })),
    [capabilities],
  )

  const results = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return routes.slice(0, 9)
    return routes
      .filter((item) =>
        `${item.label} ${item.meta} ${item.type}`
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 12)
  }, [query, routes])

  function choose(href: string) {
    onOpenChange(false)
    setQuery("")
    router.push(href)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setQuery("")
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="top-[12vh] max-w-[calc(100%-1.5rem)] translate-y-0 gap-0 p-0 sm:max-w-xl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Pencarian ruang kerja</DialogTitle>
          <DialogDescription>
            Cari rute, akun, pesanan, pembayaran, sertifikat, karya, dan log.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b border-ink/20 px-4 py-3">
          <Search className="size-4 shrink-0 text-copper-dark" aria-hidden="true" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari rute ruang kerja…"
            aria-label="Cari di ruang kerja"
            className="h-11 border-0 bg-transparent px-0 text-[14px] focus-visible:ring-0"
          />
          <kbd className="hidden border border-ink/25 px-1.5 py-1 text-[9px] text-ink-muted sm:block">
            Esc
          </kbd>
        </div>
        <div className="max-h-[56vh] overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-[12px] text-ink-muted">
              Tidak ada hasil untuk “{query}”. Coba nama rute ruang kerja.
            </p>
          ) : (
            <ul>
              {results.map((item) => {
                const Icon = item.icon
                return (
                  <li key={`${item.type}-${item.id}`}>
                    <button
                      type="button"
                      onClick={() => choose(item.href)}
                      className="group flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-panel/60 focus-visible:bg-panel/60"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center border border-ink/15 text-ink-muted">
                        {Icon ? (
                          <Icon className="size-3.5" aria-hidden="true" />
                        ) : (
                          <span className="text-[8px] font-bold uppercase">
                            {item.type.slice(0, 2)}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold text-ink">
                          {item.label}
                        </span>
                        <span className="block truncate text-[10px] text-ink-muted">
                          {item.type} · {item.meta}
                        </span>
                      </span>
                      <ArrowUpRight
                        className="size-3.5 text-ink-muted group-hover:text-copper-dark"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-ink/15 bg-panel/30 px-4 py-2 text-[9px] uppercase tracking-[0.06em] text-ink-muted">
          <span>⌘K untuk membuka dari mana saja</span>
          <span>{navItems.length} rute terdaftar</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
