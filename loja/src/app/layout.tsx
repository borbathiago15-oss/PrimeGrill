import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prime Grill Paiva — Cortes premium para momentos especiais",
  description: "Carnes premium e produtos para churrasco. Peça online: entrega ou retirada.",
};

export const viewport: Viewport = { themeColor: "#0C0B0A", width: "device-width", initialScale: 1 };

const FONTES =
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Figtree:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={FONTES} />
      </head>
      <body>{children}</body>
    </html>
  );
}
