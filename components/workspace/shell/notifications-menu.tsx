"use client"

import * as React from "react"
import Link from "next/link"
import { Bell, CheckCheck } from "lucide-react"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"
import { toast } from "sonner"
import { useMutation, useQuery } from "convex/react"
import { cn } from "cn"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import type { NotificationView } from "@/lib/messaging/types"
import { formatWorkspaceDateTime } from "@/lib/workspace/format"

type NotificationItem = {
  id: string
  title: string
  body: string
  time: string
  href: string
  unread: boolean
}

const previewNotifications: NotificationItem[] = [
  {
    id: "n-1",
    title: "Panggilan umpan balik 16.00",
    body: "Bambang Hardjono · 15 menit · panggilan suara",
    time: "12 menit lalu",
    href: "/ruang/panggilan",
    unread: true,
  },
  {
    id: "n-2",
    title: "Tugas TGS-2408 sedang dinilai",
    body: "Batik Tulis Soga · BTG-06",
    time: "1 jam lalu",
    href: "/ruang/tugas",
    unread: true,
  },
  {
    id: "n-3",
    title: "Payout PAY-309 ditahan",
    body: "Sengketa ORD-1034 masih terbuka",
    time: "2 jam lalu",
    href: "/ruang/pesanan/payout",
    unread: false,
  },
  {
    id: "n-4",
    title: "Karya baru menunggu tinjauan",
    body: "w-05 · Selendang Soga Remaja",
    time: "Kemarin",
    href: "/ruang/karya",
    unread: false,
  },
]

function hrefFor(notification: NotificationView): string {
  if (notification.conversationId) return "/ruang/pesan"
  switch (notification.entityType) {
    case "order":
      return "/ruang/pesanan"
    case "payment":
      return "/ruang/pesanan/pembayaran"
    case "payout":
    case "refund":
      return "/ruang/pesanan/payout"
    case "certificate":
      return "/ruang/kredensial"
    case "work":
      return "/ruang/karya"
    case "submission":
    case "assessment":
      return "/ruang/tugas"
    case "support":
      return "/ruang/dukungan"
    default:
      return "/ruang"
  }
}

function itemFromLive(notification: NotificationView): NotificationItem {
  return {
    id: notification.id,
    title: notification.title,
    body: notification.body,
    time: formatWorkspaceDateTime(
      new Date(notification.createdAt).toISOString(),
    ),
    href: hrefFor(notification),
    unread: notification.readAt === null,
  }
}

export function NotificationsMenu() {
  const { isPreview } = useViewer()
  const liveNotifications = useQuery(
    api.notifications.list,
    isPreview ? "skip" : { limit: 8 },
  )
  const liveUnread = useQuery(
    api.notifications.unreadCount,
    isPreview ? "skip" : {},
  )
  const markRead = useMutation(api.notifications.markRead)
  const markAllRead = useMutation(api.notifications.markAllRead)
  const [previewReadIds, setPreviewReadIds] = React.useState<string[]>([])

  const items = React.useMemo<NotificationItem[]>(() => {
    if (isPreview) return previewNotifications
    return (liveNotifications ?? []).map(itemFromLive)
  }, [isPreview, liveNotifications])

  const unreadCount = isPreview
    ? items.filter(
        (item) => item.unread && !previewReadIds.includes(item.id),
      ).length
    : (liveUnread ?? 0)

  function openItem(item: NotificationItem) {
    if (isPreview) {
      setPreviewReadIds((current) =>
        current.includes(item.id) ? current : [...current, item.id],
      )
      return
    }
    if (!item.unread) return
    void markRead({
      notificationId: item.id as Id<"notificationOutbox">,
    }).catch(() => {
      toast.error("Pemberitahuan belum bisa ditandai dibaca.")
    })
  }

  function markAll() {
    if (isPreview) {
      setPreviewReadIds(previewNotifications.map((item) => item.id))
      toast("Semua pemberitahuan ditandai dibaca")
      return
    }
    void markAllRead({})
      .then(() => toast("Semua pemberitahuan ditandai dibaca"))
      .catch(() => toast.error("Pemberitahuan belum bisa ditandai dibaca."))
  }

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          type="button"
          className="relative inline-flex size-11 items-center justify-center border border-transparent text-ink-soft transition-colors hover:border-ink/20 hover:bg-panel/40 hover:text-ink focus-visible:border-ink/40"
          aria-label={`Pemberitahuan${unreadCount ? `, ${unreadCount} belum dibaca` : ""}`}
        >
          <Bell className="size-4" aria-hidden="true" />
          {unreadCount > 0 ? (
            <span className="absolute top-2.5 right-2.5 size-1.5 bg-copper-dark" />
          ) : null}
        </button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          sideOffset={6}
          className="z-50 w-[min(92vw,360px)] border border-ink/30 bg-paper-2 text-ink shadow-[0_24px_60px_-30px_rgba(32,19,13,0.6)] data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0"
        >
          <div className="flex items-center justify-between gap-3 border-b border-ink/15 px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink-soft">
              Pemberitahuan
            </p>
            <button
              type="button"
              onClick={markAll}
              disabled={unreadCount === 0}
              className="inline-flex min-h-11 items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.05em] text-copper-dark hover:text-ink disabled:opacity-40 sm:min-h-8"
            >
              <CheckCheck className="size-3" aria-hidden="true" />
              Tandai dibaca
            </button>
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-[11px] leading-relaxed text-ink-muted">
              Belum ada pemberitahuan. Kabar tugas, pesanan, dan panggilan akan
              muncul di sini.
            </p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-ink/10 overflow-y-auto">
              {items.map((item) => {
                const unread = isPreview
                  ? item.unread && !previewReadIds.includes(item.id)
                  : item.unread
                return (
                  <li key={item.id}>
                    <DropdownMenuPrimitive.Item asChild>
                      <Link
                        href={item.href}
                        onClick={() => openItem(item)}
                        className="flex min-h-14 items-start gap-2.5 px-3 py-3 outline-none data-highlighted:bg-panel/60"
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "mt-1.5 size-1.5 shrink-0 border border-ink/30",
                            unread ? "bg-copper-dark" : "bg-transparent",
                          )}
                        />
                        <span className="min-w-0">
                          <span className="block text-[11.5px] font-semibold leading-snug">
                            {item.title}
                          </span>
                          <span className="mt-0.5 block text-[10.5px] leading-snug text-ink-muted">
                            {item.body}
                          </span>
                          <span className="mt-1 block text-[8.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                            {item.time}
                          </span>
                        </span>
                      </Link>
                    </DropdownMenuPrimitive.Item>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="border-t border-ink/15 px-3 py-2">
            <p className="text-[9px] leading-relaxed text-ink-muted">
              Pengingat panggilan dikirim 10 menit sebelum waktu mulai.
            </p>
          </div>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}
