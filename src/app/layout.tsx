import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import Script from "next/script";
import "./globals.css";
import "./pofis.css";
import "./modal.css";
import "@/components/pofi/room.css";
import "./current-contracts.css";
import "@/components/request-error.css";
import "@/components/inline-notice.css";
import { themeInitScript } from "@/lib/theme.js";

export const metadata: Metadata = {
  title: "Pofis · Mesaiye biraz Pofi.",
  description: "Mesai kayıtları ve çalışma süresi takibi.",
  icons: {
    icon: "/pofi/pofi-mark-256.png",
    apple: "/pofi/pofi-mark-256.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="tr"
      className={GeistSans.variable}
      data-theme="system"
      suppressHydrationWarning
    >
      <head>
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body>
        {children}
        <Script id="quiet-nod">
          {
            "if (!window._q) { window._q = true; window.console?.['log']('Buraya kadar geldiysen,\\nsen de küçük detayları seviyorsun demektir.\\n\\nBen de.\\n\\nMesaiye biraz Pofi.\\nmertercan.com'); }"
          }
        </Script>
      </body>
    </html>
  );
}
