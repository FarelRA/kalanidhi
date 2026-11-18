/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as admin_context from "../admin_context.js";
import type * as assessments from "../assessments.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as calls from "../calls.js";
import type * as certificates from "../certificates.js";
import type * as commerce from "../commerce.js";
import type * as commerce_shared from "../commerce_shared.js";
import type * as content from "../content.js";
import type * as crons from "../crons.js";
import type * as dispatch from "../dispatch.js";
import type * as domainAccess from "../domainAccess.js";
import type * as flows from "../flows.js";
import type * as governance from "../governance.js";
import type * as http from "../http.js";
import type * as leads from "../leads.js";
import type * as learning from "../learning.js";
import type * as media from "../media.js";
import type * as messaging from "../messaging.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as payouts from "../payouts.js";
import type * as people from "../people.js";
import type * as seed_content_data from "../seed/content/data.js";
import type * as seed_content_identities from "../seed/content/identities.js";
import type * as seed_domains_audit from "../seed/domains/audit.js";
import type * as seed_domains_clear from "../seed/domains/clear.js";
import type * as seed_domains_commerce from "../seed/domains/commerce.js";
import type * as seed_domains_content from "../seed/domains/content.js";
import type * as seed_domains_credentials from "../seed/domains/credentials.js";
import type * as seed_domains_curriculum from "../seed/domains/curriculum.js";
import type * as seed_domains_governance from "../seed/domains/governance.js";
import type * as seed_domains_growth from "../seed/domains/growth.js";
import type * as seed_domains_learning from "../seed/domains/learning.js";
import type * as seed_domains_messaging from "../seed/domains/messaging.js";
import type * as seed_domains_metrics from "../seed/domains/metrics.js";
import type * as seed_domains_ops from "../seed/domains/ops.js";
import type * as seed_domains_people from "../seed/domains/people.js";
import type * as seed_domains_settings from "../seed/domains/settings.js";
import type * as seed_integrity from "../seed/integrity.js";
import type * as seed_lib_builders from "../seed/lib/builders.js";
import type * as seed_lib_clock from "../seed/lib/clock.js";
import type * as seed_lib_codes from "../seed/lib/codes.js";
import type * as seed_lib_hash from "../seed/lib/hash.js";
import type * as seed_lib_identity from "../seed/lib/identity.js";
import type * as seed_lib_lookup from "../seed/lib/lookup.js";
import type * as seed_lib_media from "../seed/lib/media.js";
import type * as seed_run from "../seed/run.js";
import type * as settings from "../settings.js";
import type * as stats from "../stats.js";
import type * as support from "../support.js";
import type * as tables_commerce from "../tables/commerce.js";
import type * as tables_common from "../tables/common.js";
import type * as tables_communication from "../tables/communication.js";
import type * as tables_content from "../tables/content.js";
import type * as tables_credentials from "../tables/credentials.js";
import type * as tables_identity from "../tables/identity.js";
import type * as tables_learning from "../tables/learning.js";
import type * as tables_operations from "../tables/operations.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  admin_context: typeof admin_context;
  assessments: typeof assessments;
  audit: typeof audit;
  auth: typeof auth;
  calls: typeof calls;
  certificates: typeof certificates;
  commerce: typeof commerce;
  commerce_shared: typeof commerce_shared;
  content: typeof content;
  crons: typeof crons;
  dispatch: typeof dispatch;
  domainAccess: typeof domainAccess;
  flows: typeof flows;
  governance: typeof governance;
  http: typeof http;
  leads: typeof leads;
  learning: typeof learning;
  media: typeof media;
  messaging: typeof messaging;
  notifications: typeof notifications;
  payments: typeof payments;
  payouts: typeof payouts;
  people: typeof people;
  "seed/content/data": typeof seed_content_data;
  "seed/content/identities": typeof seed_content_identities;
  "seed/domains/audit": typeof seed_domains_audit;
  "seed/domains/clear": typeof seed_domains_clear;
  "seed/domains/commerce": typeof seed_domains_commerce;
  "seed/domains/content": typeof seed_domains_content;
  "seed/domains/credentials": typeof seed_domains_credentials;
  "seed/domains/curriculum": typeof seed_domains_curriculum;
  "seed/domains/governance": typeof seed_domains_governance;
  "seed/domains/growth": typeof seed_domains_growth;
  "seed/domains/learning": typeof seed_domains_learning;
  "seed/domains/messaging": typeof seed_domains_messaging;
  "seed/domains/metrics": typeof seed_domains_metrics;
  "seed/domains/ops": typeof seed_domains_ops;
  "seed/domains/people": typeof seed_domains_people;
  "seed/domains/settings": typeof seed_domains_settings;
  "seed/integrity": typeof seed_integrity;
  "seed/lib/builders": typeof seed_lib_builders;
  "seed/lib/clock": typeof seed_lib_clock;
  "seed/lib/codes": typeof seed_lib_codes;
  "seed/lib/hash": typeof seed_lib_hash;
  "seed/lib/identity": typeof seed_lib_identity;
  "seed/lib/lookup": typeof seed_lib_lookup;
  "seed/lib/media": typeof seed_lib_media;
  "seed/run": typeof seed_run;
  settings: typeof settings;
  stats: typeof stats;
  support: typeof support;
  "tables/commerce": typeof tables_commerce;
  "tables/common": typeof tables_common;
  "tables/communication": typeof tables_communication;
  "tables/content": typeof tables_content;
  "tables/credentials": typeof tables_credentials;
  "tables/identity": typeof tables_identity;
  "tables/learning": typeof tables_learning;
  "tables/operations": typeof tables_operations;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
