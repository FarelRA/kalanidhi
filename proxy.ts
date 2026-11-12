import { NextResponse, type NextRequest } from "next/server"

/**
 * Next.js 16 renamed middleware to proxy. The workspace layout needs the
 * current path to build `/masuk?next=...` after a session check.
 */
export function proxy(request: NextRequest) {
  // `public/images` is only the upload source for Convex storage. Never serve
  // it from the app, even if a stale reference slips through.
  if (request.nextUrl.pathname.startsWith("/images/")) {
    return new NextResponse(null, { status: 404 })
  }

  const headers = new Headers(request.headers)
  headers.set("x-pathname", request.nextUrl.pathname)
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ["/ruang/:path*", "/images/:path*"],
}
