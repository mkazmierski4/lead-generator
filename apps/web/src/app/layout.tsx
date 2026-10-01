import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const font = Schibsted_Grotesk({
  variable: "--font-app",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Rejestr leadów",
  description: "Firmy bez strony lub z niedziałającą stroną, z pełnym uzasadnieniem oceny",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className={font.variable}>
      <body>
        <div className="app">
          <Sidebar />
          <main className="sheet">{children}</main>
        </div>
      </body>
    </html>
  );
}
