"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { Menu, Search, ShoppingBag } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { BrandLockup } from "@/components/brand/brand-mark"
import { InfoButton, LeadButton } from "@/components/overlays/overlay-buttons"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useActiveSection } from "@/hooks/use-active-section"
import { navigation, sectionIds } from "@/lib/content/navigation"
import type { SearchGroup } from "@/lib/search"
import { cn } from "cn"

const SearchDialog = dynamic(
  () =>
    import("@/components/search/search-dialog").then(
      (module) => module.SearchDialog,
    ),
  { ssr: false },
)

export function SiteHeader({ searchGroups }: { searchGroups: SearchGroup[] }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const active = useActiveSection(sectionIds)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setSearchOpen(true)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  function openSearchFromMobile() {
    setMobileOpen(false)
    window.setTimeout(() => setSearchOpen(true), 160)
  }

  function showEmptyCart() {
    toast("Keranjangmu masih kosong", {
      description: "Mulai dari karya lulusan atau simpan karya favoritmu.",
      action: {
        label: "Lihat karya",
        onClick: () =>
          document
            .getElementById("karya")
            ?.scrollIntoView({ behavior: "smooth" }),
      },
    })
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-paper/10 bg-ink/90 backdrop-blur-xl">
        <div className="section-shell flex h-[76px] items-center justify-between gap-4 lg:h-[84px]">
          <Link
            href="#top"
            aria-label="KalaNidhi Digital: kembali ke atas"
            className="shrink-0 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-kunyit/50"
          >
            <span className="hidden sm:inline-flex">
              <BrandLockup markSize={36} />
            </span>
            <span className="inline-flex sm:hidden">
              <BrandLockup markSize={34} />
            </span>
          </Link>

          <nav
            aria-label="Navigasi utama"
            className="hidden items-center gap-2 lg:flex xl:gap-7"
          >
            {navigation.map((item) => {
              const id = item.href.slice(1)
              const isActive = active === id

              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "border-b pb-1 text-[13px] font-medium transition-colors",
                    isActive
                      ? "border-soga text-paper"
                      : "border-transparent text-paper-dim hover:border-paper/25 hover:text-paper",
                  )}
                >
                  {item.label}
                </a>
              )
            })}
          </nav>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Cari jalur, pengajar, atau karya"
              aria-keyshortcuts="Meta+K Control+K"
              className="mr-1 hidden h-9 items-center gap-2 rounded-[4px] px-2.5 text-[12px] text-paper-dim transition-colors hover:bg-paper/[0.05] hover:text-paper xl:flex"
            >
              <Search className="size-4" aria-hidden="true" />
              Cari
              <kbd className="ml-1 rounded-[2px] border border-paper/15 px-1.5 py-0.5 text-[10px] text-text-muted">
                ⌘K
              </kbd>
            </button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              aria-label="Cari"
              className="xl:hidden"
            >
              <Search aria-hidden="true" />
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={showEmptyCart}
                  aria-label="Keranjang belanja"
                  className="hidden sm:inline-flex"
                >
                  <ShoppingBag aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="border border-soga/30 bg-ink-2 text-[11px] text-paper-dim">
                Keranjang masih kosong
              </TooltipContent>
            </Tooltip>

            <div className="ml-2 hidden items-center gap-2 border-l border-paper/12 pl-4 sm:flex">
              <InfoButton
                infoKey="login"
                variant="ghost"
                size="sm"
                className="px-2 text-paper-dim"
              >
                Masuk
              </InfoButton>
              <LeadButton
                request={{ variant: "student" }}
                size="sm"
                className="px-4"
              >
                Daftar
              </LeadButton>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden"
            >
              <Menu aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      {searchOpen ? (
        <SearchDialog
          groups={searchGroups}
          open
          onOpenChange={setSearchOpen}
        />
      ) : null}

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="right"
          className="w-[min(92vw,400px)] border-soga/25 bg-ink p-0"
        >
          <div className="flex h-full flex-col overflow-y-auto p-6 pt-7">
            <SheetHeader className="gap-2 p-0 pr-8">
              <BrandLockup markSize={34} />
              <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
              <SheetDescription className="sr-only">
                Navigasi utama, pencarian, dan pendaftaran KalaNidhi Digital.
              </SheetDescription>
            </SheetHeader>

            <nav
              aria-label="Navigasi mobile"
              className="mt-10 flex flex-col divide-y divide-paper/10 border-y border-paper/10"
            >
              {navigation.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="py-4 font-heading text-[2rem] leading-none text-paper transition-colors hover:text-soga"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <button
              type="button"
              onClick={openSearchFromMobile}
              className="mt-6 flex items-center gap-3 py-2 text-left text-sm text-paper-dim transition-colors hover:text-paper"
            >
              <Search className="size-4 text-soga" aria-hidden="true" />
              Cari jalur, pengajar, atau karya
            </button>

            <div className="mt-auto space-y-3 pt-10">
              <LeadButton
                request={{ variant: "student" }}
                size="lg"
                className="w-full"
              >
                Daftar minat
              </LeadButton>
              <InfoButton
                infoKey="login"
                variant="outline"
                size="lg"
                className="w-full"
              >
                Masuk
              </InfoButton>
              <p className="pt-2 text-[11px] leading-relaxed text-text-muted">
                Belajar seni tradisi langsung dari pengajar, dari mana saja.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
