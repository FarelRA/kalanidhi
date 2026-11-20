"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "convex/react"

import { CheckoutForm } from "@/components/commerce/checkout-form"
import { api } from "@/convex/_generated/api"
import {
  buyHref,
  enrollHref,
  PUBLIC_ROUTES,
} from "@/lib/content/routes"

/**
 * The checkout pages are static shells. Session and enrollment checks happen
 * in the browser so an unknown slug can return a real 404 before streaming.
 */
export function CheckoutGate({
  kind,
  slug,
  title,
  price,
}: {
  kind: "work" | "path"
  slug: string
  title: string
  price: number
}) {
  const router = useRouter()
  const viewer = useQuery(api.access.getViewer)
  const checkoutHref = kind === "work" ? buyHref(slug) : enrollHref(slug)
  const existingEnrollment =
    kind === "path" && viewer
      ? viewer.enrollments.find(
          (enrollment) =>
            enrollment.pathId === slug &&
            (enrollment.status === "active" ||
              enrollment.status === "completed" ||
              enrollment.status === "pending_payment"),
        )
      : undefined

  useEffect(() => {
    if (viewer === null) {
      router.replace(
        `${PUBLIC_ROUTES.signIn}?next=${encodeURIComponent(checkoutHref)}`,
      )
      return
    }
    if (existingEnrollment) {
      router.replace(
        existingEnrollment.status === "pending_payment"
          ? `${PUBLIC_ROUTES.workspace}/pesanan`
          : PUBLIC_ROUTES.learning,
      )
    }
  }, [checkoutHref, existingEnrollment, router, viewer])

  if (viewer === undefined) {
    return (
      <div className="border border-ink/20 bg-paper-2 p-5 text-[12px] leading-relaxed text-ink-muted sm:p-7">
        Memuat identitas pembeli.
      </div>
    )
  }

  if (viewer === null) {
    return (
      <div className="border border-ink/20 bg-paper-2 p-5 text-[12px] leading-relaxed text-ink-muted sm:p-7">
        Mengalihkan ke halaman masuk.
      </div>
    )
  }

  if (existingEnrollment) {
    return (
      <div className="border border-ink/20 bg-paper-2 p-5 text-[12px] leading-relaxed text-ink-muted sm:p-7">
        Membuka ruang belajar.
      </div>
    )
  }

  return (
    <CheckoutForm
      kind={kind}
      slug={slug}
      title={title}
      price={price}
      identity={{
        name: viewer.name,
        email: viewer.email,
        whatsapp: viewer.whatsapp ?? viewer.phone,
      }}
    />
  )
}
