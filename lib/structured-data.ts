import type { SiteData } from "@/lib/content/types"

export function buildLandingJsonLd(data: SiteData) {
  const site = data.metadata.siteUrl

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "EducationalOrganization",
        "@id": `${site}/#organization`,
        name: data.metadata.siteName,
        url: site,
        logo: `${site}/brand/kalanidhi-icon-512.png`,
        image: `${site}/brand/kalanidhi-icon-512.png`,
        description: data.metadata.description,
        areaServed: {
          "@type": "AdministrativeArea",
          name: data.metadata.areaServed,
        },
        knowsLanguage: "id",
      },
      {
        "@type": "WebSite",
        "@id": `${site}/#website`,
        url: site,
        name: data.metadata.siteName,
        inLanguage: "id-ID",
        publisher: { "@id": `${site}/#organization` },
      },
      {
        "@type": "FAQPage",
        "@id": `${site}/#faq`,
        mainEntity: data.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  }
}
