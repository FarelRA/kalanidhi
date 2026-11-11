import { faqs } from "@/lib/content/landing"

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
          "Platform belajar praktik budaya Nusantara dengan penilaian pengajar, sertifikat platform, dan Kartu Karya. Lulusan dapat kembali sebagai pengajar, penilai, atau pemasok.",
        areaServed: {
          "@type": "AdministrativeArea",
          name: "Yogyakarta dan Jawa Tengah",
        },
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
