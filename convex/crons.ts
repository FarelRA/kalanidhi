import { cronJobs } from "convex/server"

import { internal } from "./_generated/api"

const crons = cronJobs()

/**
 * Scheduled content publishes are applied by the system, not by a browser.
 * The mutation validates each due revision again and audits the result.
 */
crons.interval(
  "publish scheduled content",
  { minutes: 5 },
  internal.content.runScheduledPublish,
  {},
)

export default crons
