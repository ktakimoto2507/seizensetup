// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// （任意）PWA登録とバックグラウンド同期を使うなら：
import PwaRegister from "./pwa-register";
import SyncProvider from "./sync-provider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SeizenSetup",
  description: "SeizenSetup app",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }]
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* 起動時にローカル→DBの同期を有効化（任意） */}
        <SyncProvider>
          {/* 開発中は pwa-register 側で NODE_ENV !== "production" なら return する実装にしておく */}
          <PwaRegister />
          {children}
        </SyncProvider>
      </body>
    </html>
  );
}
