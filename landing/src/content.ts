export const content = {
  meta: {
    title: "Pofis — Mesaiye biraz Pofi.",
    description: "Kişisel mesai takibi. Mesaiye biraz Pofi.",
    url: "https://pofis.app",
    locale: "tr_TR",
    keywords: [
      "pofis",
      "pofi",
      "mesai takibi",
      "pdks",
      "mesaiye biraz pofi",
      "çalışma süresi",
      "mertcreates",
    ],
  },
  brand: {
    name: "Pofis",
    wordmark: "pofis",
    tagline: "Mesaiye biraz Pofi.",
  },
  install: {
    label: "Kurulum",
    command: "curl -fsSL https://pofis.app/install.sh | bash",
    copySuccessMessage: "Kopyalandı",
    copyAriaLabel: "Komutu kopyala",
    hint: "Linux ve macOS.",
    docsLabel: "belgelere",
    docsUrl: "https://github.com/pofis/pofis",
  },
  footer: {
    brand: "Pofis",
    tagline: "Mesaiye biraz Pofi.",
    version: "v1.0.0",
    creditLabel: "mertcreates.",
    creditUrl: "https://mertcreates.com",
  },
  theme: {
    toggleAriaLabel: "Tema değiştir",
  },
} as const;

export type Content = typeof content;
