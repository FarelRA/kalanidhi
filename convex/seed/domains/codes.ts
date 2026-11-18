import { internalMutation } from "../../_generated/server"

/**
 * Order codes are the public invoice numbers, so they must read in the order
 * the orders happened. Growth inserts its own orders while walking the
 * timeline, so the final numbering is assigned once, after every order exists.
 */
export const renumberOrders = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ orders: number }> => {
    const orders = await ctx.db.query("orders").collect()
    const sorted = [...orders].sort(
      (a, b) => a.createdAt - b.createdAt || a._creationTime - b._creationTime,
    )
    for (const [index, order] of sorted.entries()) {
      const code = `KN-2026-${String(index + 1).padStart(6, "0")}`
      if (order.code !== code) await ctx.db.patch(order._id, { code })
    }
    return { orders: sorted.length }
  },
})
