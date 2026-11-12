"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { BrandLockup } from "@/components/brand/brand-mark"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type {
  HeaderCopy,
  NavigationItem,
  SearchCopy,
} from "@/lib/content/types"
import { interestHref, PUBLIC_ROUTES, publicHref } from "@/lib/content/routes"
import type { SearchGroup } from "@/lib/search"
import { cn } from "cn"

const SearchDialog = dynamic(
  () =>
    import("@/components/search/search-dialog").then(
      (module) => module.SearchDialog,
    ),
  { ssr: false },
)

export function SiteHeader({
  navigation,
  searchGroups,
  copy,
  searchCopy,
}: {
  navigation: NavigationItem[]
  searchGroups: SearchGroup[]
  copy: HeaderCopy
  searchCopy: SearchCopy
}) {
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const searchTriggerRef = useRef<HTMLElement | null>(null)
  const nextQuery =
    pathname &&
    pathname !== PUBLIC_ROUTES.home &&
    !pathname.startsWith(PUBLIC_ROUTES.signIn) &&
    !pathname.startsWith(PUBLIC_ROUTES.signUp)
      ? `?next=${encodeURIComponent(pathname)}`
      : ""

  function isActive(href: string) {
    const base = href.split("#")[0] || "/"
    if (base === "/") return pathname === "/"
    return pathname === base || pathname.startsWith(`${base}/`)
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        searchTriggerRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null
        setSearchOpen(true)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  function openSearch(trigger?: HTMLElement | null) {
    searchTriggerRef.current =
      trigger ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null)
    setSearchOpen(true)
  }

  function closeSearch(open: boolean) {
    setSearchOpen(open)
    if (!open) {
      window.setTimeout(
        () => searchTriggerRef.current?.focus({ preventScroll: true }),
        0,
      )
    }
  }

  function openSearchFromMobile() {
    setMobileOpen(false)
    menuButtonRef.current?.focus({ preventScroll: true })
    window.setTimeout(() => openSearch(menuButtonRef.current), 160)
  }

  function handleMobileOpenChange(open: boolean) {
    setMobileOpen(open)
    if (!open) {
      window.setTimeout(
        () => menuButtonRef.current?.focus({ preventScroll: true }),
        0,
      )
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b-2 border-ink/20 bg-cream/95 backdrop-blur-md">
        <div className="shell flex h-[68px] items-center justify-between gap-4 lg:h-[76px]">
          <Link
            href={PUBLIC_ROUTES.home}
            aria-label={copy.brandAria}
            className="shrink-0"
          >
            <BrandLockup markSize={35} />
          </Link>

          <nav
            aria-label={copy.mainNavAria}
            className="hidden items-center gap-0.5 lg:flex xl:gap-1"
          >
            {navigation.map((item) => {
              const href = publicHref(item.href)
              const active = isActive(href)

              return (
                <Link
                  key={item.href}
                  href={href}
                  aria-current={active ? "location" : undefined}
                  className={cn(
                    "inline-flex min-h-9 items-center border-b-2 px-2.5 text-[12px] font-semibold transition-colors",
                    active
                      ? "border-copper-dark bg-ink/[0.04] text-ink"
                      : "border-transparent text-ink-soft hover:border-copper/50 hover:text-ink",
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(event) => openSearch(event.currentTarget)}
              aria-label={copy.searchAria}
              aria-keyshortcuts="Meta+K Control+K"
              className="mr-1 hidden h-9 items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted transition-colors hover:text-ink xl:flex"
            >
              <Search className="size-3.5" aria-hidden="true" />
              {copy.searchLabel}
              <kbd className="border border-ink/25 px-1.5 py-0.5 text-[9px] text-ink-muted">
                ⌘K
              </kbd>
            </button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(event) => openSearch(event.currentTarget)}
              aria-label={copy.searchAria}
              className="xl:hidden"
            >
              <Search aria-hidden="true" />
            </Button>

            <div className="ml-1 hidden items-center gap-1.5 border-l border-ink/20 pl-3 sm:flex">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="px-2 text-ink-soft hover:text-ink"
              >
                <Link href={`${PUBLIC_ROUTES.signIn}${nextQuery}`}>
                  {copy.loginCta}
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href={`${PUBLIC_ROUTES.signUp}${nextQuery}`}>
                  {copy.registerCta}
                </Link>
              </Button>
            </div>

            <Button
              ref={menuButtonRef}
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              aria-label={copy.menuAria}
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
          copy={searchCopy}
          open
          onOpenChange={closeSearch}
        />
      ) : null}

      <Sheet open={mobileOpen} onOpenChange={handleMobileOpenChange}>
        <SheetContent
          side="right"
          className="w-[min(92vw,400px)] border-l-2 border-ink bg-cream p-0"
        >
          <div className="flex h-full flex-col overflow-y-auto p-6 pt-7">
            <SheetHeader className="gap-2 p-0 pr-8">
              <BrandLockup markSize={33} />
              <SheetTitle className="sr-only">{copy.sheetTitle}</SheetTitle>
              <SheetDescription className="sr-only">
                {copy.sheetDescription}
              </SheetDescription>
            </SheetHeader>

            <nav
              aria-label={copy.mobileNavAria}
              className="mt-9 flex flex-col border-t-2 border-ink/25"
            >
              {navigation.map((item, index) => (
                <Link
                  key={item.href}
                  href={publicHref(item.href)}
                  onClick={() => handleMobileOpenChange(false)}
                  className="flex min-h-14 items-center justify-between border-b border-ink/15 py-3 font-heading text-[1.9rem] leading-none text-ink transition-colors hover:text-copper-dark"
                >
                  {item.label}
                  <span className="text-[9px] font-bold tracking-[0.1em] text-ink-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </Link>
              ))}
            </nav>

            <button
              type="button"
              onClick={openSearchFromMobile}
              className="mt-6 flex min-h-11 items-center gap-3 text-left text-sm text-ink-soft transition-colors hover:text-ink"
            >
              <Search className="size-4 text-copper-dark" aria-hidden="true" />
              {copy.mobileSearch}
            </button>

            <div className="mt-auto space-y-3 pt-10">
              <Button asChild size="lg" className="w-full">
                <Link
                  href={interestHref({ intent: "student" })}
                  onClick={() => handleMobileOpenChange(false)}
                >
                  {copy.mobileRegisterCta}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full border-ink/35"
              >
                <Link
                  href={`${PUBLIC_ROUTES.signIn}${nextQuery}`}
                  onClick={() => handleMobileOpenChange(false)}
                >
                  {copy.loginCta}
                </Link>
              </Button>
              <p className="pt-2 text-[10px] leading-relaxed text-ink-muted">
                {copy.region}
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
