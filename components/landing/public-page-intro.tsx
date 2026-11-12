import Link from "next/link"

import { PUBLIC_ROUTES } from "@/lib/content/routes"

export function PublicPageIntro({
  eyebrow,
  title,
  description,
  homeLabel = "Beranda",
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  homeLabel?: string
  children?: React.ReactNode
}) {
  return (
    <header className="max-w-[62rem]">
      <nav aria-label="Remah roti" className="text-[10px] text-ink-muted">
        <Link href={PUBLIC_ROUTES.home} className="hover:text-copper-dark">
          {homeLabel}
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{eyebrow}</span>
      </nav>
      <span className="stamp mt-6 border-ink/35 text-ink">{eyebrow}</span>
      <h1 className="heading-section mt-5 max-w-[20ch]">{title}</h1>
      {description ? (
        <p className="body-copy mt-5 max-w-[42rem]">{description}</p>
      ) : null}
      {children}
    </header>
  )
}
