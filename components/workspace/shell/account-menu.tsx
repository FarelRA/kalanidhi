"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"

import { authClient } from "@/lib/auth-client"
import { useViewer } from "@/components/workspace/shell/viewer-provider"

export function AccountMenu() {
  const router = useRouter()
  const { profile } = useViewer()

  async function signOut() {
    await authClient.signOut()
    router.push("/masuk")
    router.refresh()
  }

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          type="button"
          className="group inline-flex min-h-11 items-center gap-2 border border-ink/20 bg-paper-2 px-1.5 py-1 text-left transition-colors hover:border-ink/40 focus-visible:border-ink"
          aria-label={`Akun ${profile.user.name}. Buka menu akun`}
        >
          <span className="flex size-8 items-center justify-center border border-ink/30 bg-teak font-heading text-[11px] font-semibold text-paper">
            {profile.user.initials}
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block max-w-32 truncate text-[11px] font-semibold leading-tight text-ink">
              {profile.user.name}
            </span>
            <span className="mt-0.5 block max-w-32 truncate text-[8.5px] font-bold uppercase tracking-[0.07em] text-ink-muted">
              {profile.user.roleLabel}
            </span>
          </span>
          <ChevronDown
            className="mr-0.5 hidden size-3.5 text-ink-muted transition-transform group-data-[state=open]:rotate-180 sm:block"
            aria-hidden="true"
          />
        </button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          sideOffset={6}
          className="z-50 w-[min(92vw,320px)] border border-ink/30 bg-paper-2 p-1.5 text-ink shadow-[0_24px_60px_-30px_rgba(32,19,13,0.6)] data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0"
        >
          <div className="border-b border-ink/15 px-2.5 py-2.5">
            <p className="text-[12px] font-semibold">{profile.user.name}</p>
            <p className="mt-0.5 truncate text-[10.5px] text-ink-muted">
              {profile.user.email}
            </p>
            <p className="mt-1.5 inline-flex border border-copper-dark/35 bg-copper/10 px-1.5 py-1 text-[8.5px] font-bold uppercase tracking-[0.1em] text-copper-dark">
              {profile.user.roleLabel}
            </p>
          </div>

          <DropdownMenuPrimitive.Item asChild>
            <Link
              href="/ruang/pengaturan"
              className="flex min-h-11 items-center gap-2.5 px-2.5 text-[11.5px] outline-none data-highlighted:bg-panel/70"
            >
              <UserRound className="size-3.5 text-ink-muted" aria-hidden="true" />
              Profil dan sesi
            </Link>
          </DropdownMenuPrimitive.Item>
          <DropdownMenuPrimitive.Item asChild>
            <Link
              href="/ruang/pengaturan"
              className="flex min-h-11 items-center gap-2.5 px-2.5 text-[11.5px] outline-none data-highlighted:bg-panel/70"
            >
              <Settings className="size-3.5 text-ink-muted" aria-hidden="true" />
              Pengaturan ruang
            </Link>
          </DropdownMenuPrimitive.Item>
          <DropdownMenuPrimitive.Separator className="my-1.5 h-px bg-ink/15" />
          <DropdownMenuPrimitive.Item
            onSelect={() => {
              void signOut()
            }}
            className="flex min-h-11 cursor-pointer items-center gap-2.5 px-2.5 text-[11.5px] text-[#8a2e1f] outline-none data-highlighted:bg-destructive/10"
          >
            <LogOut className="size-3.5" aria-hidden="true" />
            Keluar
          </DropdownMenuPrimitive.Item>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}
