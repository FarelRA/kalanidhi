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

/**
 * Offline fallback used only when Convex is not configured. It deliberately
 * carries no image URLs: the app never falls back to `public/images`. Screens
 * render their own empty state until a real Convex storage URL arrives.
 */
export const fallbackSiteData: SiteData = {
  ...siteSeed,
  hero: {
    ...siteSeed.hero,
    plate: { ...siteSeed.hero.plate, image: "" },
  },
  metadata: {
    ...siteSeed.metadata,
    image: {
      width: siteSeed.metadata.image.width,
      height: siteSeed.metadata.image.height,
      alt: siteSeed.metadata.image.alt,
      url: "",
    },
  },
  catalog: {
    ...siteSeed.catalog,
    fields: catalogFieldsSeed,
  },
  paths: pathsSeed.map(({ imageFile, ...rest }) => {
    void imageFile
    return { ...rest, image: "" }
  }),
  teachers: teachersSeed.map(({ imageFile, ...rest }) => {
    void imageFile
    return { ...rest, image: "" }
  }),
  works: worksSeed.map(({ imageFile, ...rest }) => {
    void imageFile
    return { ...rest, image: "" }
  }),
  testimonials: testimonialsSeed,
  faqs: faqsSeed,
}
