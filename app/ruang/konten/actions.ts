"use server"

import { revalidatePath } from "next/cache"

/**
 * Public landing reads are cached with `cacheLife("minutes")`. Publishing from
 * Convex cannot call Next's cache API directly, so the editor invokes this
 * server action after a successful publish or rollback to purge the cached
 * layout and every page beneath it.
 */
export async function revalidatePublicLanding(): Promise<void> {
  revalidatePath("/", "layout")
}
