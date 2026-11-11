import { NextResponse, type NextRequest } from "next/server"

/**
 * Next.js 16 renamed middleware to proxy. The workspace layout needs the
 * current path to build `/masuk?next=...` after a session check.
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)
  headers.set("x-pathname", request.nextUrl.pathname)
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ["/ruang/:path*"],
}
