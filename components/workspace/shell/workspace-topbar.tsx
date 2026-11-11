"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Search } from "lucide-react"

import { BrandMark } from "@/components/brand/brand-mark"
import { AccountMenu } from "@/components/workspace/shell/account-menu"
import {
  activeNav,
  labelForItem,
} from "@/components/workspace/shell/nav-config"
import { NotificationsMenu } from "@/components/workspace/shell/notifications-menu"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import { RoleTag } from "@/components/workspace/data/role-tag"

export function WorkspaceTopbar({
  onOpenSearch,
}: {
  onOpenSearch: () => void
}) {
  const pathname = usePathname()
  const { capabilities, profile } = useViewer()
  const current = activeNav(pathname)
  const role = capabilities.includes("operate")
    ? "pengelola"
    : capabilities.includes("teach")
      ? "pengajar"
      : capabilities.includes("sell")
        ? "penjual"
        : "peserta"

  return (
    <header className="sticky top-0 z-30 border-b border-ink/20 bg-cream/95 backdrop-blur-md">
      <div className="mx-auto flex h-[60px] w-full max-w-[1500px] items-center gap-3 px-3 sm:px-5 lg:h-[66px] lg:px-7">
        <Link
          href="/ruang"
          className="flex items-center gap-2 lg:hidden"
          aria-label="KalaNidhi Digital · ruang kerja"
        >
          <BrandMark size={28} />
          <span className="font-heading text-[1.15rem] leading-none tracking-tight text-ink">
            Ruang
          </span>
        </Link>

        <nav
          aria-label="Remah roti"
          className="hidden min-w-0 items-center gap-1.5 text-[10px] lg:flex"
        >
          <Link
            href="/ruang"
            className="inline-flex min-h-8 items-center px-1 font-bold uppercase tracking-[0.08em] text-ink-muted hover:text-ink"
          >
            Ruang
          </Link>
          {current ? (
            <>
              {current.group !== labelForItem(current, capabilities) ? (
                <>
                  <ChevronRight
                    className="size-3 text-ink-muted"
                    aria-hidden="true"
                  />
                  <span className="inline-flex min-h-8 items-center px-1 font-bold uppercase tracking-[0.08em] text-ink-muted">
                    {current.group}
                  </span>
                </>
              ) : null}
              <ChevronRight
                className="size-3 text-ink-muted"
                aria-hidden="true"
              />
              <span
                aria-current="page"
                className="inline-flex min-h-8 min-w-0 items-center truncate px-1 text-[11px] font-semibold text-ink"
              >
                {labelForItem(current, capabilities)}
              </span>
            </>
          ) : null}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Cari di ruang kerja"
            aria-keyshortcuts="Meta+K Control+K"
            className="inline-flex min-h-11 items-center gap-2 border border-ink/20 bg-paper-2 px-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-ink-muted transition-colors hover:border-ink/40 hover:text-ink"
          >
            <Search className="size-3.5" aria-hidden="true" />
            <span className="hidden md:inline">Cari</span>
            <kbd className="hidden border border-ink/20 px-1 py-0.5 text-[8.5px] text-ink-muted md:inline">
              ⌘K
            </kbd>
          </button>

          <RoleTag
            role={role}
            label={profile.shortLabel}
            className="hidden xl:inline-flex"
          />

          <NotificationsMenu />
          <AccountMenu />
        </div>
      </div>
    </header>
  )
}
