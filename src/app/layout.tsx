import type { Metadata, Viewport } from "next";
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
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    // Ícone usado pelo iOS quando alguém aperta "Adicionar à Tela de Início"
    // no Safari — o Android/Chrome usa os ícones do manifest.json acima.
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Briovitta",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#165657",
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
