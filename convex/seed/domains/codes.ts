import { internalMutation } from "../../_generated/server"

/**
 * Order codes are the public invoice numbers, so they must read in the order
 * the orders happened. Growth inserts its own orders while walking the
 * timeline, so the final numbering is assigned once, after every order exists.
 *
 * Payments, payment events and payouts embed the order code in their provider
 * references. They are rewritten in the same pass so no row keeps the old
 * invoice number.
 */
export const renumberOrders = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ orders: number }> => {
    const orders = await ctx.db.query("orders").collect()
    const sorted = [...orders].sort(
      (a, b) => a.createdAt - b.createdAt || a._creationTime - b._creationTime,
    )
    const mapping = new Map<string, string>()
    for (const [index, order] of sorted.entries()) {
      const code = `KN-2026-${String(index + 1).padStart(6, "0")}`
      mapping.set(order.code, code)
      if (order.code !== code) {
        await ctx.db.patch(order._id, {
          code,
          idempotencyKey: order.idempotencyKey
            ? replaceCodes(order.idempotencyKey, mapping)
            : undefined,
        })
      }
    }

    function replaceCodes(value: string, map: Map<string, string>): string {
      let output = value
      for (const [oldCode, newCode] of map) {
        if (oldCode !== newCode && output.includes(oldCode)) {
          output = output.replaceAll(oldCode, newCode)
        }
      }
      return output
    }

    const payments = await ctx.db.query("payments").collect()
    for (const payment of payments) {
      const providerReference = payment.providerReference
        ? replaceCodes(payment.providerReference, mapping)
        : undefined
      const providerChargeId = replaceCodes(payment.providerChargeId, mapping)
      const qrString = payment.qrString
        ? replaceCodes(payment.qrString, mapping)
        : undefined
      const idempotencyKey = payment.idempotencyKey
        ? replaceCodes(payment.idempotencyKey, mapping)
        : undefined
      if (
        providerReference !== payment.providerReference ||
        providerChargeId !== payment.providerChargeId ||
        qrString !== payment.qrString ||
        idempotencyKey !== payment.idempotencyKey
      ) {
        await ctx.db.patch(payment._id, {
          providerReference,
          providerChargeId,
          qrString,
          idempotencyKey,
        })
      }
    }

    const events = await ctx.db.query("paymentEvents").collect()
    for (const event of events) {
      const eventId = replaceCodes(event.eventId, mapping)
      const providerReference = event.providerReference
        ? replaceCodes(event.providerReference, mapping)
        : undefined
      if (
        eventId !== event.eventId ||
        providerReference !== event.providerReference
      ) {
        await ctx.db.patch(event._id, { eventId, providerReference })
      }
    }

    const payouts = await ctx.db.query("payouts").collect()
    for (const payout of payouts) {
      if (!payout.reference) continue
      const reference = replaceCodes(payout.reference, mapping)
      if (reference !== payout.reference) {
        await ctx.db.patch(payout._id, { reference })
      }
    }

    return { orders: sorted.length }
  },
})
