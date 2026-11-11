"use client"

import { useViewer } from "@/components/workspace/shell/viewer-provider"

import { PeopleDirectory as PreviewPeopleDirectory } from "./people-directory"
import { PeopleLive } from "./people-live"

export function PeopleDirectoryGate() {
  const { isPreview } = useViewer()
  return isPreview ? <PreviewPeopleDirectory /> : <PeopleLive />
}
