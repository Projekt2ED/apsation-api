import type { Metadata } from "next";

import { SiteHeader } from "@/components/site/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Apsation API",
    template: "%s | Apsation API",
  },
  description: "Apsation API 提供统一模型列表、在线 Playground 与工作台。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
