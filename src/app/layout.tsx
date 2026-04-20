import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#6366f1",
};

export const metadata: Metadata = {
  title: "RepairTrackQR",
  description: "Sistema de Seguimiento de Reparaciones - Multi-Sucursal",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RepairTrack",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

import ToastProvider from "./providers";
import { PwaSetup } from "@/components/PwaSetup";
import { GlobalSearchProvider } from "@/components/GlobalSearchProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider />
        <PwaSetup />
        <GlobalSearchProvider />
        {children}
      </body>
    </html>
  );
}
