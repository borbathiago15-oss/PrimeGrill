import type { Metadata, Viewport } from "next";
import "./fontes.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prime Grill Paiva — Cortes premium para momentos especiais",
  description: "Carnes premium e produtos para churrasco. Peça online: entrega ou retirada.",
  applicationName: "Prime Grill Paiva",
  appleWebApp: { capable: true, title: "Prime Grill", statusBarStyle: "black-translucent" },
  icons: { icon: "/icones/icone-192.png", apple: "/icones/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#0C0B0A", width: "device-width", initialScale: 1 };


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preload" href="/fonts/bebas-neue.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/playfair-display.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  );
}
