import type { SiteData } from "@/lib/content/types"
import {
  pathHref,
  PUBLIC_ROUTES,
  publicHref,
  teacherHref,
  workHref,
} from "@/lib/content/routes"

export type SearchIcon = "path" | "teacher" | "work" | "page"

export type SearchItem = {
  label: string
  description: string
  href: string
}

export type SearchGroup = {
  heading: string
  icon: SearchIcon
  items: SearchItem[]
}

export function buildSearchGroups(
  data: Pick<SiteData, "paths" | "teachers" | "works" | "catalog" | "search">,
): SearchGroup[] {
  return [
    {
      heading: data.search.groups.paths,
      icon: "path",
      items: data.paths.map((path) => ({
        label: path.title,
        description: path.comingSoon
          ? data.search.pathComingSoon
          : `${path.teacher}, ${path.level}`,
        href: pathHref(path.slug),
      })),
    },
    {
      heading: data.search.groups.teachers,
      icon: "teacher",
      items: data.teachers.map((teacher) => ({
        label: teacher.name,
        description: `${teacher.specialty}, ${teacher.region}`,
        href: teacherHref(teacher.slug),
      })),
    },
    {
      heading: data.search.groups.works,
      icon: "work",
      items: data.works.map((work) => ({
        label: work.title,
        description: `${work.maker}, ${work.region}`,
        href: workHref(work.slug),
      })),
    },
    {
      heading: data.search.groups.fields,
      icon: "page",
      items: data.catalog.fields.map((field) => ({
        label: field.name,
        description: `${field.region}, ${field.status.toLowerCase()}`,
        href: PUBLIC_ROUTES.paths,
      })),
    },
    {
      heading: data.search.groups.pages,
      icon: "page",
      items: data.search.pages.map((page) => ({
        ...page,
        href: publicHref(page.href),
      })),
    },
  ]
}
