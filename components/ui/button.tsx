import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-[2px] border border-transparent bg-clip-padding text-[13px] font-medium tracking-[0.005em] whitespace-nowrap transition-colors duration-200 outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 max-lg:min-h-11 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-ink text-paper hover:bg-ink-2 focus-visible:ring-offset-background",
        outline:
          "border-ink/35 bg-transparent text-ink hover:border-thread hover:text-thread",
        secondary:
          "bg-panel text-ink hover:bg-secondary",
        ghost:
          "text-ink-soft hover:bg-ink/[0.06] hover:text-ink",
        destructive:
          "bg-destructive/12 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "text-thread underline decoration-thread/40 underline-offset-4 hover:text-ink hover:decoration-ink",
      },
      size: {
        default: "h-11 gap-2 px-5 text-[13px]",
        xs: "h-8 gap-1.5 px-3 text-[11px] max-lg:min-h-11",
        sm: "h-9 gap-1.5 px-3.5 text-[12px] max-lg:min-h-11",
        lg: "h-12 gap-2.5 px-6 text-[13px]",
        icon: "size-10 max-lg:size-11",
        "icon-xs": "size-7 max-lg:size-11",
        "icon-sm": "size-8 max-lg:size-11",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
