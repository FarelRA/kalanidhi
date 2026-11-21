import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { connection } from "next/server"

import { SignInForm } from "@/app/(auth)/masuk/sign-in-form"
import { safeNextPath } from "@/lib/access/guard"
import { getAuthServer, isAuthConfigured } from "@/lib/auth-server"

export const instant = false

export const metadata: Metadata = {
  title: "Daftar peserta",
  description:
    "Buat akun peserta KalaNidhi Digital. WhatsApp menjadi identitas utama, email untuk pemberitahuan dan verifikasi akun.",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function DaftarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  // Auth configuration is environment state. Rendering it per request keeps a
  // build without credentials from baking the "not configured" branch in.
  await connection()
  const params = await searchParams
  const nextPath = safeNextPath(params.next)
  const configured = isAuthConfigured()

  let authenticated = false
  if (configured) {
    try {
      authenticated = await getAuthServer().isAuthenticated()
    } catch (error) {
      // A reseed briefly empties the session tables. A direct load must still
      // render the form instead of falling into the error boundary.
      console.error("[auth] Could not read the session.", error)
    }
  }
  if (authenticated) {
    redirect(nextPath)
  }

  return (
    <SignInForm
      nextPath={nextPath}
      configured={configured}
      initialMode="signup"
    />
  )
}
