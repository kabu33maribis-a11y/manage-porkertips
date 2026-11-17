import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const notoJp = Noto_Sans_JP({
  variable: "--font-noto-jp",
  preload: false,
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
  themeColor: "#f3f6fc",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${sora.variable} ${notoJp.variable} bg-background text-foreground min-h-dvh antialiased selection:bg-royal/25`}
      >
        {children}
      </body>
    </html>
  );
}
