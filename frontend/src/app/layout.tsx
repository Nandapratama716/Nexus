import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Nexus Admin Dashboard",
  description: "POS and Kitchen Display System for Nexus",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased bg-canvas text-ink min-h-screen relative overflow-x-hidden">
        {/* Stripi Gradient Mesh Decoration */}
        <div className="absolute top-0 left-0 w-full h-[400px] bg-mesh -z-10 rounded-b-[40%]" />
        
        {/* Main Content Container */}
        <main className="max-w-7xl mx-auto pt-24 pb-12 px-6">
          {children}
        </main>
      </body>
    </html>
  );
}
