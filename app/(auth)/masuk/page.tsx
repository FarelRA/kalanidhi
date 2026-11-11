import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { SignInForm } from "@/app/(auth)/masuk/sign-in-form"
import { safeNextPath } from "@/lib/access/guard"
import { getAuthServer, isAuthConfigured } from "@/lib/auth-server"

export const instant = false

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke ruang kerja KalaNidhi Digital.",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function MasukPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const params = await searchParams
  const nextPath = safeNextPath(params.next)
  const configured = isAuthConfigured()

  if (configured) {
    const auth = getAuthServer()
    if (await auth.isAuthenticated()) {
      redirect(nextPath)
    }
  }

  return <SignInForm nextPath={nextPath} configured={configured} />
}
