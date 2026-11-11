"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  activeNav,
  labelForItem,
  mobilePrimaryHrefs,
  navGroups,
  navItems,
  visibleNav,
} from "@/components/workspace/shell/nav-config"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import { cn } from "cn"

export function MobileNav() {
  const pathname = usePathname()
  const { capabilities } = useViewer()
  const [open, setOpen] = React.useState(false)
  const items = visibleNav(capabilities)
  const current = activeNav(pathname)
  const primary = mobilePrimaryHrefs
    .map((href) => items.find((item) => item.href === href))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 5)

  return (
    <>
      <nav
        aria-label="Navigasi utama seluler"
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink/30 bg-cream-2/98 backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-6 items-stretch">
          {primary.map((item) => {
            const active = current?.href === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 border-t-2 px-1 pt-1 pb-1.5 text-center transition-colors",
                  active
                    ? "border-copper-dark text-ink"
                    : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                <Icon
                  className={cn("size-4", active && "text-copper-dark")}
                  aria-hidden="true"
                />
                <span className="text-[8px] font-bold uppercase tracking-[0.04em]">
                  {labelForItem(item, capabilities)}
                </span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex min-h-14 flex-col items-center justify-center gap-1 border-t-2 border-transparent px-1 pt-1 pb-1.5 text-ink-muted transition-colors hover:text-ink"
            aria-haspopup="dialog"
          >
            <Menu className="size-4" aria-hidden="true" />
            <span className="text-[8px] font-bold uppercase tracking-[0.04em]">
              Lainnya
            </span>
          </button>
        </div>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-[min(92vw,400px)] border-l-2 border-ink bg-cream p-0"
        >
          <div className="flex h-full flex-col overflow-y-auto">
            <SheetHeader className="border-b border-ink/20 px-5 py-5 pr-12">
              <SheetTitle className="text-[1.5rem]">Ruang kerja</SheetTitle>
              <SheetDescription className="text-[11.5px]">
                {current
                  ? `Sekarang di ${labelForItem(current, capabilities)}.`
                  : "Pilih ruang yang ingin dibuka."}
              </SheetDescription>
            </SheetHeader>

            <nav aria-label="Semua navigasi" className="flex-1 px-4 py-4">
              {navGroups.map((group) => {
                const groupItems = items.filter((item) => item.group === group)
                if (groupItems.length === 0) return null
                return (
                  <div key={group} className="mb-5">
                    <p className="pb-1.5 text-[8px] font-bold uppercase tracking-[0.14em] text-copper-dark">
                      {group}
                    </p>
                    <ul className="border-t border-ink/15">
                      {groupItems.map((item) => {
                        const active = current?.href === item.href
                        const Icon = item.icon
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={() => setOpen(false)}
                              aria-current={active ? "page" : undefined}
                              className={cn(
                                "flex min-h-12 items-center gap-3 border-b border-ink/10 py-2.5 text-[13px] transition-colors",
                                active
                                  ? "font-semibold text-copper-dark"
                                  : "text-ink-soft hover:text-ink",
                              )}
                            >
                              <Icon className="size-4 shrink-0" aria-hidden="true" />
                              {labelForItem(item, capabilities)}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
            </nav>
            <div className="border-t border-ink/15 px-5 py-4">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted hover:text-ink"
              >
                Kembali ke situs publik
              </Link>
              <p className="mt-2 text-[9px] leading-relaxed text-ink-muted">
                {navItems.length} rute terdaftar. Navigasi mengikuti kemampuan
                peran aktif.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
