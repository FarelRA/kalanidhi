"use client"

import { useViewer } from "@/components/workspace/shell/viewer-provider"

import { PaymentConsoleLive } from "./payment-console-live"
import { PaymentConsolePreview } from "./payment-console-preview"

/** Preview mode keeps local records; live sessions use Convex only. */
export function PaymentConsole() {
  const { isPreview } = useViewer()
  return isPreview ? <PaymentConsolePreview /> : <PaymentConsoleLive />
}
