"use client"

import type { ComponentProps, ReactNode } from "react"

import { useOverlay } from "@/components/overlays/overlay-provider"
import { Button } from "@/components/ui/button"
import type { InfoKey, LeadRequest } from "@/lib/content/overlays"
import { cn } from "cn"

type LeadButtonProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  request: LeadRequest
}

export function LeadButton({ request, ...props }: LeadButtonProps) {
  const { openLead } = useOverlay()

  return <Button onClick={() => openLead(request)} {...props} />
}

type InfoButtonProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  infoKey: InfoKey
}

export function InfoButton({ infoKey, ...props }: InfoButtonProps) {
  const { openInfo } = useOverlay()

  return <Button onClick={() => openInfo(infoKey)} {...props} />
}

export function InfoLink({
  infoKey,
  children,
  className,
}: {
  infoKey: InfoKey
  children: ReactNode
  className?: string
}) {
  const { openInfo } = useOverlay()

  return (
    <button
      type="button"
      onClick={() => openInfo(infoKey)}
      className={cn(
        "text-left text-xs text-paper-dim transition-colors hover:text-soga",
        className,
      )}
    >
      {children}
    </button>
  )
}
