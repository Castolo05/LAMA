import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lama Logística y Distribución",
    short_name: "Lama",
    description: "Pedidos, reparto y seguimiento de Lama Logística y Distribución.",
    start_url: "/ingresar",
    display: "standalone",
    background_color: "#F4F5F7",
    theme_color: "#DA2128",
    lang: "es-AR",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
