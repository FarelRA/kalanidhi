import { NextResponse, type NextRequest } from "next/server"

/**
 * Next.js 16 renamed middleware to proxy. The workspace layout needs the
 * current path to build `/masuk?next=...` after a session check.
 */
export function proxy(request: NextRequest) {
  // All media is served from Convex storage URLs. The app has no static
  // `/images` route; seed/images is only the upload source for Convex.
  if (request.nextUrl.pathname.startsWith("/images/")) {
    return new NextResponse(null, { status: 404 })
  }

  // Order tokens are 64 lowercase hex characters. Reject a malformed token
  // before the shell streams, so the response carries a real 404 instead of a
  // soft 404 with a 200 status. Valid tokens are still resolved in the page.
  const orderToken = request.nextUrl.pathname.match(/^\/pesanan\/([^/]+)$/)?.[1]
  if (orderToken && !/^[0-9a-f]{64}$/.test(orderToken)) {
    return new NextResponse(null, { status: 404 })
  }

  const headers = new Headers(request.headers)
  headers.set("x-pathname", request.nextUrl.pathname)
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ["/ruang/:path*", "/images/:path*", "/pesanan/:path*"],
}
