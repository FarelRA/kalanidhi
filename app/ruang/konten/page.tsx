import type { Metadata } from "next"

import { ContentCms } from "@/components/workspace/content/content-cms"

export const metadata: Metadata = {
  title: "Konten",
}

export default function Page() {
  return <ContentCms />
}
