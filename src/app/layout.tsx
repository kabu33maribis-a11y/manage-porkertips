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

export const metadata: Metadata = {
  title: "Real Poker Engine",
  description:
    "物理テーブル用テキサスホールデム進行サポート — チップ・ポット・ターンローテーション",
  applicationName: "Real Poker Engine",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f8faf8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground min-h-dvh antialiased selection:bg-amber-400/30`}
      >
        {children}
      </body>
    </html>
  );
}
