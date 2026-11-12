import type { Metadata } from "next"

import { FeaturedPanel } from "@/components/workspace/content/featured-panel"

export const metadata: Metadata = {
  title: "Pilihan landing",
}

export default function Page() {
  return <FeaturedPanel />
}
