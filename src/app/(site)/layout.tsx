import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site/site-footer";

export default function SiteLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
