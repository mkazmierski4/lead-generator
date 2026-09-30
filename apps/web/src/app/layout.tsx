import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const serif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
});

const sans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Rejestr leadów",
  description: "Firmy bez strony lub z niedziałającą stroną, z pełnym uzasadnieniem oceny",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className={`${serif.variable} ${sans.variable} ${mono.variable} h-full`}>
      <body className="min-h-full bg-paper text-ink font-sans antialiased">{children}</body>
    </html>
  );
}
