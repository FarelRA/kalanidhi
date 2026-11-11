import type { Metadata } from "next"

import { ContentCmsGate } from "@/components/workspace/content/content-cms-gate"

export const metadata: Metadata = {
  title: "Konten",
}

export default function Page() {
  return <ContentCmsGate />
}
