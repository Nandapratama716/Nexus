import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Nexus POS & Admin Dashboard",
  description: "Financial-grade POS and Kitchen Display System for Nexus",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased bg-canvas-soft text-ink min-h-screen w-full overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
