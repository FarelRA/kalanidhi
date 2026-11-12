"use client"

import {
  Compass,
  GraduationCap,
  Route,
  Search,
  ShoppingBag,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import type { SearchCopy } from "@/lib/content/types"
import type { SearchGroup, SearchIcon } from "@/lib/search"

const iconMap: Record<SearchIcon, typeof Route> = {
  path: Route,
  teacher: GraduationCap,
  work: ShoppingBag,
  page: Compass,
}

export function SearchDialog({
  groups,
  copy,
  open,
  onOpenChange,
}: {
  groups: SearchGroup[]
  copy: SearchCopy
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    if (!normalized) return groups

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          `${item.label} ${item.description} ${group.heading}`
            .toLowerCase()
            .includes(normalized),
        ),
      }))
      .filter((group) => group.items.length > 0)
  }, [groups, query])

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      window.setTimeout(() => setQuery(""), 200)
    }
  }

  function openResult(href: string) {
    handleOpenChange(false)
    if (href.startsWith("/")) {
      router.push(href)
      return
    }
    const id = href.replace("#", "")
    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
    }, 180)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={copy.title}
      description={copy.description}
      className="top-[10%] max-w-xl translate-y-0 border border-ink/30 bg-paper-2 p-0 sm:max-w-xl"
    >
      <Command shouldFilter={false} className="bg-transparent p-0">
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder={copy.placeholder}
        />
        <CommandList className="max-h-[min(60svh,420px)] px-1 pb-1">
          <CommandEmpty className="py-10 text-center text-sm text-ink-muted">
            {copy.emptyPrefix}
            {query.trim()}
            {copy.emptySuffix}
          </CommandEmpty>
          {filteredGroups.map((group) => {
            const Icon = iconMap[group.icon]
            return (
              <CommandGroup key={group.heading} heading={group.heading}>
                {group.items.map((item) => (
                  <CommandItem
                    key={`${group.heading}-${item.label}`}
                    value={`${group.heading}-${item.label}`}
                    onSelect={() => openResult(item.href)}
                    className="gap-3 rounded-lg px-2.5 py-2.5"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center border border-ink/20 bg-ink/[0.03] text-thread">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-ink">
                        {item.label}
                      </span>
                      <span className="block truncate text-[10.5px] text-ink-muted">
                        {item.description}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )
          })}
        </CommandList>
        <div className="flex items-center justify-between gap-3 border-t border-ink/15 px-4 py-2.5 text-[9.5px] text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <Search className="size-3" aria-hidden="true" />
            {copy.footerLabel}
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border bg-ink/[0.04] px-1.5 py-0.5 font-mono">
              Esc
            </kbd>
            {copy.escLabel}
          </span>
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="rounded-[3px] border border-ink/25 px-2.5 py-1 text-[10px] font-medium text-ink-soft transition-colors hover:border-thread/50 hover:text-thread"
          >
            {copy.closeLabel}
          </button>
        </div>
      </Command>
    </CommandDialog>
  )
}
