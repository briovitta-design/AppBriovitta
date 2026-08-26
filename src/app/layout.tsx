import type { Metadata } from "next";
import { Inter, Lexend } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { getCurrentUsuario } from "@/lib/auth/session";
import "./globals.css";

// Inter cuida do texto denso de UI (tabelas, labels, formulários) — neutro e
// muito legível em tamanhos pequenos. Lexend entra em títulos e números de
// destaque (KPIs) — traços mais humanos, pensados para leitura confortável,
// o que combina com um produto de uso clínico.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend", display: "swap" });

export const metadata: Metadata = {
  title: "Briovitta",
  description: "Sistema de gestão clínica e documentação da Briovitta",
  icons: { icon: "/logo-briovitta.png" },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getCurrentUsuario();

  return (
    <html lang="pt-BR" className={`${inter.variable} ${lexend.variable}`}>
      <body>
        <ThemeProvider initialTheme={usuario?.tema}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
