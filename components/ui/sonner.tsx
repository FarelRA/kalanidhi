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
      theme="light"
      position="bottom-right"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-copper-light" />,
        info: <InfoIcon className="size-4 text-brass" />,
        warning: <TriangleAlertIcon className="size-4 text-copper-light" />,
        error: <OctagonXIcon className="size-4 text-copper-light" />,
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
            "cn-toast border-ink! bg-ink! text-paper!",
          description: "text-paper/75!",
          actionButton: "bg-paper! text-ink! font-semibold!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
