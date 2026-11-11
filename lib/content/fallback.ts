import {
  catalogFieldsSeed,
  faqsSeed,
  pathsSeed,
  siteSeed,
  teachersSeed,
  testimonialsSeed,
  worksSeed,
} from "@/convex/seedData"
import type { SiteData } from "@/lib/content/types"

export const fallbackSiteData: SiteData = {
  ...siteSeed,
  catalog: {
    ...siteSeed.catalog,
    fields: catalogFieldsSeed,
  },
  paths: pathsSeed,
  teachers: teachersSeed,
  works: worksSeed,
  testimonials: testimonialsSeed,
  faqs: faqsSeed,
}
