import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SwRegister } from "@/components/sw-register";

export const metadata: Metadata = {
  title: "Organizador",
  description: "Toda tu vida, un solo sistema.",
  appleWebApp: { capable: true, title: "Organizador", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
