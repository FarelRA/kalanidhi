import { culturalFields, faqs } from "@/lib/content/landing"

export function buildLandingJsonLd() {
  const site = "https://kalanidhi.digital"

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "EducationalOrganization",
        "@id": `${site}/#organization`,
        name: "KalaNidhi Digital",
        url: site,
        description:
          "Platform belajar berbagai praktik budaya Nusantara. Pelajar dibimbing pengajar, dinilai, mendapat sertifikat platform dan Kartu Karya, lalu berkarya atau berjualan. Lulusan yang siap kembali sebagai pengajar, penilai, atau pemasok.",
        slogan: "Belajar, dinilai, berkarya, kembali mengajar",
        areaServed: {
          "@type": "AdministrativeArea",
          name: "Daerah Istimewa Yogyakarta dan Jawa Tengah",
        },
        knowsAbout: culturalFields.items,
        knowsLanguage: "id",
      },
      {
        "@type": "WebSite",
        "@id": `${site}/#website`,
        url: site,
        name: "KalaNidhi Digital",
        inLanguage: "id-ID",
        publisher: { "@id": `${site}/#organization` },
      },
      {
        "@type": "FAQPage",
        "@id": `${site}/#faq`,
        mainEntity: faqs.map((faq) => ({
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
