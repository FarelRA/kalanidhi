import type { Metadata } from "next"
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { WorkspaceShell } from "@/components/workspace/shell/workspace-shell"
import { WhatsappGate } from "@/components/workspace/verification/whatsapp-gate"
import { api } from "@/convex/_generated/api"
import { resolveWorkspaceGuard, safeNextPath } from "@/lib/access/guard"
import type { Viewer } from "@/lib/access/viewer"
import { getAuthServer, isAuthConfigured } from "@/lib/auth-server"
import { isConvexConfigured } from "@/lib/convex/server"

export const instant = false

export const metadata: Metadata = {
  title: {
    default: "Ruang kerja",
    template: "%s · Ruang kerja KalaNidhi",
  },
  description:
    "Satu ruang kerja KalaNidhi Digital untuk belajar, mengajar, berkarya, menjual, dan mengelola.",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const requestHeaders = await headers()
  const pathname = safeNextPath(requestHeaders.get("x-pathname") ?? "/ruang")
  const convexConfigured = isConvexConfigured()
  const authConfigured = isAuthConfigured()

  let authenticated = false
  let viewer: Viewer | null = null

  if (convexConfigured && authConfigured) {
    const auth = getAuthServer()
    authenticated = await auth.isAuthenticated()
    if (authenticated) {
      try {
        viewer = await auth.fetchAuthQuery(api.access.getViewer)
      } catch (error) {
        console.error("[auth] Could not resolve workspace viewer.", error)
        viewer = null
      }
    }
  }

  const decision = resolveWorkspaceGuard({
    convexConfigured: convexConfigured && authConfigured,
    authenticated,
    viewerResolved: Boolean(viewer),
    nextPath: pathname,
  })

  if (decision.kind === "redirect") {
    redirect(decision.to)
  }

  if (decision.kind === "unavailable") {
    return (
      <WorkspaceNotice
        eyebrow="Ruang kerja"
        title="Ruang kerja belum tersambung."
        body="Sesi, peran, dan data ruang kerja memerlukan deployment Convex dan konfigurasi Better Auth. Situs publik tetap dapat dibuka tanpa konfigurasi ini."
        href="/"
        action="Kembali ke situs publik"
      />
    )
  }

  if (decision.kind === "forbidden") {
    return (
      <WorkspaceNotice
        eyebrow="Akun"
        title="Akun ini belum memiliki profil ruang kerja."
        body="Sesi autentikasi ada, tetapi profil peran belum terbentuk. Hubungi pengelola untuk menyelesaikan undangan atau profil akun."
        href="/"
        action="Kembali ke situs publik"
      />
    )
  }

  if (viewer && viewer.status !== "active") {
    return (
      <WorkspaceNotice
        eyebrow="Akun"
        title="Akun ini tidak aktif."
        body="Akses ruang kerja ditangguhkan. Hubungi pengelola bila kamu merasa ini keliru. Sertifikat yang sudah terbit tetap dapat diverifikasi secara publik."
        href="/"
        action="Kembali ke situs publik"
      />
    )
  }

  if (viewer && !viewer.whatsappVerified) {
    return <WhatsappGate viewer={viewer} />
  }

  if (!viewer) {
    return (
      <WorkspaceNotice
        eyebrow="Akun"
        title="Akun ini belum memiliki profil ruang kerja."
        body="Sesi autentikasi ada, tetapi profil peran belum terbentuk. Hubungi pengelola untuk menyelesaikan undangan atau profil akun."
        href="/"
        action="Kembali ke situs publik"
      />
    )
  }

  return <WorkspaceShell viewer={viewer}>{children}</WorkspaceShell>
}

function WorkspaceNotice({
  eyebrow,
  title,
  body,
  href,
  action,
}: {
  eyebrow: string
  title: string
  body: string
  href: string
  action: string
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-xl border border-ink/25 bg-paper-2 p-6 sm:p-9">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-copper-dark">
          {eyebrow}
        </p>
        <h1 className="heading-section mt-2 text-[clamp(1.9rem,4vw,2.8rem)]">
          {title}
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">{body}</p>
        <Link
          href={href}
          className="mt-6 inline-flex min-h-11 items-center border border-ink bg-ink px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-paper transition-colors hover:bg-ink-2"
        >
          {action}
        </Link>
      </div>
    </div>
  )
}
