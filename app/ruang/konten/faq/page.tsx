import type { Metadata } from "next"

import { FaqManager } from "@/components/workspace/content/faq-manager"

export const metadata: Metadata = {
  title: "FAQ landing",
}

export default function Page() {
  return <FaqManager />
}
