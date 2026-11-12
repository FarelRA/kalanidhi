"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { BrandLockup } from "@/components/brand/brand-mark"
import {
  activeNav,
  labelForItem,
  navGroups,
  visibleNav,
} from "@/components/workspace/shell/nav-config"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import { cn } from "cn"

export function WorkspaceRail() {
  const pathname = usePathname()
  const { capabilities } = useViewer()
  const items = visibleNav(capabilities)
  const current = activeNav(pathname)

  return (
    <aside
      aria-label="Navigasi ruang kerja"
      className="wood-deep fixed inset-y-0 left-0 z-40 hidden w-[252px] flex-col border-r-2 border-copper-dark text-paper lg:flex"
    >
      <div className="border-b border-paper/15 px-5 pt-6 pb-5">
        <Link
          href="/ruang"
          aria-label="KalaNidhi Digital · ruang kerja"
          className="inline-flex"
        >
          <BrandLockup markSize={36} tone="paper" />
        </Link>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 py-4">
        {navGroups.map((group) => {
          const groupItems = items.filter((item) => item.group === group)
          if (groupItems.length === 0) return null

          return (
            <div key={group} className="mb-4 last:mb-0">
              <p className="px-2.5 pb-1.5 text-[8px] font-bold uppercase tracking-[0.16em] text-brass/75">
                {group}
              </p>
              <ul className="space-y-0.5">
                {groupItems.map((item) => {
                  const active = current?.href === item.href
                  const Icon = item.icon
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group flex min-h-10 items-center gap-2.5 border-l-2 px-2.5 py-2 text-[11.5px] font-medium transition-colors",
                          active
                            ? "border-copper bg-paper/10 text-paper"
                            : "border-transparent text-paper/65 hover:border-paper/25 hover:bg-paper/5 hover:text-paper",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-3.5 shrink-0",
                            active ? "text-copper-light" : "text-paper/45 group-hover:text-brass",
                          )}
                          aria-hidden="true"
                        />
                        <span className="truncate">
                          {labelForItem(item, capabilities)}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
