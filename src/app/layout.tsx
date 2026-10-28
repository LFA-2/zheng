import type { Metadata, Viewport } from "next";
import { Noto_Serif_TC } from "next/font/google";
import "./globals.css";

const display = Noto_Serif_TC({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600"],
});

export const metadata: Metadata = {
  title: "爭",
  description: "法律爭點整理：爭點、條文、學說與我的觀點。",
  appleWebApp: {
    capable: true,
    title: "爭",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f6f2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className={`${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans text-ink">{children}</body>
    </html>
  );
}
