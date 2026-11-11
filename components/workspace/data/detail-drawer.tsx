"use client"

import type * as React from "react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import type { StatusTone } from "@/lib/workspace/types"

export function DetailDrawer({
  open,
  onOpenChange,
  title,
  description,
  eyebrow,
  stamp,
  tone,
  children,
  footer,
  width = "sm:max-w-[560px]",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  eyebrow?: string
  stamp?: string
  tone?: StatusTone
  children: React.ReactNode
  footer?: React.ReactNode
  width?: string
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={`w-full border-l-2 border-ink/40 bg-cream p-0 ${width}`}
      >
        <div className="flex h-full min-h-0 flex-col">
          <SheetHeader className="gap-2 border-b border-ink/20 px-5 py-5 pr-12">
            {eyebrow ? (
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-copper-dark">
                {eyebrow}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <SheetTitle className="text-[1.65rem]">{title}</SheetTitle>
              {stamp ? <StatusStamp label={stamp} tone={tone} /> : null}
            </div>
            {description ? (
              <SheetDescription className="text-[12.5px] leading-relaxed">
                {description}
              </SheetDescription>
            ) : null}
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {children}
          </div>
          {footer ? (
            <div className="border-t border-ink/20 bg-paper-2 px-5 py-3">
              {footer}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function DetailGrid({
  items,
  columns = 2,
}: {
  items: { label: string; value: React.ReactNode }[]
  columns?: 1 | 2 | 3
}) {
  return (
    <dl
      className={`grid gap-x-5 gap-y-4 ${
        columns === 1
          ? "grid-cols-1"
          : columns === 3
            ? "grid-cols-1 sm:grid-cols-3"
            : "grid-cols-1 sm:grid-cols-2"
      }`}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            {item.label}
          </dt>
          <dd className="mt-1.5 text-[12.5px] leading-relaxed text-ink">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function DrawerSection({
  title,
  children,
  aside,
}: {
  title: string
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  return (
    <section className="mt-6 border-t border-ink/15 pt-4 first:mt-0 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-ink-soft">
          {title}
        </h3>
        {aside}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}
