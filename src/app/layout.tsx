import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { NotificationProvider } from "@/components/providers/notification-provider";
import { Toaster } from "@/components/ui/sonner";
import { MobileNotice } from "@/components/ui/mobile-notice";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dashboard BAPP - Monitoring Kontrak",
  description: "Dashboard untuk monitoring progress kontrak BAPP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased pb-12`}
      >
        <SettingsProvider>
          <NotificationProvider>
            <AuthProvider>{children}</AuthProvider>
          </NotificationProvider>
        </SettingsProvider>
        <Toaster richColors position="top-right" />
        <MobileNotice />
      </body>
    </html>
  );
}
