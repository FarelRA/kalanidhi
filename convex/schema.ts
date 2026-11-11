import { defineSchema } from "convex/server"

import { commerceTables } from "./tables/commerce"
import { communicationTables } from "./tables/communication"
import { contentTables } from "./tables/content"
import { credentialTables } from "./tables/credentials"
import { identityTables } from "./tables/identity"
import { learningTables } from "./tables/learning"
import { operationsTables } from "./tables/operations"

export { catalogStatus } from "./tables/content"

/**
 * Composition only. Domain tables live in `convex/tables/<domain>.ts`.
 * Phase 0 is the additive baseline; later phases extend their own module.
 */
export default defineSchema({
  ...identityTables,
  ...contentTables,
  ...learningTables,
  ...credentialTables,
  ...commerceTables,
  ...communicationTables,
  ...operationsTables,
})
