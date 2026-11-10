"use client"

import type * as React from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-indigo-dust" />,
        info: <InfoIcon className="size-4 text-soga" />,
        warning: <TriangleAlertIcon className="size-4 text-copper" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast border-soga/30! bg-ink-2! text-paper! shadow-plate!",
          description: "text-muted-foreground!",
          actionButton: "bg-paper! text-ink! font-semibold!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
