import type { Metadata } from "next";
import { Figtree, JetBrains_Mono, Sora } from "next/font/google";
import { Providers } from "@/components/providers";

import "./globals.css";
import "./orbitly.css";

const sora = Sora({ variable: "--font-sora", subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"] });
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "Orbitly — Learn the skills that move you forward", template: "%s · Orbitly" },
  description: "Courses, lessons, grades and live sessions for your organization, all in one place.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sora.variable} ${figtree.variable} ${jetbrains.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
