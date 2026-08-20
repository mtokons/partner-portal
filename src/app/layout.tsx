import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Outfit } from "next/font/google";
import "./globals.css";
import AuthContext from "@/components/providers/AuthContext";
import CurrencyCalculator from "@/components/CurrencyCalculator";
import FloatingAssistantLauncher from "@/components/ai/FloatingAssistantLauncher";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "Partner Portal — SCCG",
    template: "%s | Partner Portal",
  },
  description: "Enterprise B2B Partner Portal — Manage orders, clients, and financials powered by SCCG.",
  icons: {
    icon: "/assets/sccg-logo.png",
    shortcut: "/assets/sccg-logo.png",
    apple: "/assets/sccg-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${outfit.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background">
        <AuthContext>
          {children}
          <CurrencyCalculator />
          <FloatingAssistantLauncher />
        </AuthContext>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
