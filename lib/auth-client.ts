import { convexClient } from "@convex-dev/better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

/**
 * Better Auth browser client. The Convex plugin is required so the session
 * token reaches Convex queries; roles still live in Convex, never in the JWT.
 */
export const authClient = createAuthClient({
  plugins: [convexClient()],
})
