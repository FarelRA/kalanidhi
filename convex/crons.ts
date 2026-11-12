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

/**
 * Drains the notification outbox and retries due webhook deliveries. The
 * action claims a small batch, so a slow provider never blocks the cron.
 */
crons.interval(
  "process notification outbox",
  { minutes: 1 },
  internal.notifications.processOutbox,
  {},
)

export default crons
