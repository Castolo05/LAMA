import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", weight: ["500", "600", "700", "800"], style: ["normal", "italic"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Lama Logística y Distribución", template: "%s · Lama Logística y Distribución" },
  description: "Distribución mayorista de bebidas y alimentos en Tandil y la región centro. Pedidos online, precios del día y seguimiento de entregas.",
  applicationName: "Lama Logística y Distribución",
};

export const viewport: Viewport = {
  themeColor: "#DA2128",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body className={`${montserrat.variable} ${inter.variable}`}>{children}</body>
    </html>
  );
}
