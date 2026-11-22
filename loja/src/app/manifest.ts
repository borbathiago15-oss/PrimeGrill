import type { MetadataRoute } from "next";

/** App instalável (PWA): o cardápio vira um ícone na tela do celular e abre como aplicativo. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prime Grill Paiva",
    short_name: "Prime Grill",
    description: "Cortes premium para momentos especiais. Peça online: entrega ou retirada.",
    id: "/",
    start_url: "/?origem=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0C0B0A",
    theme_color: "#0C0B0A",
    lang: "pt-BR",
    categories: ["food", "shopping"],
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icones/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Fazer pedido", url: "/pedido", icons: [{ src: "/icones/icone-192.png", sizes: "192x192" }] }],
  };
}
