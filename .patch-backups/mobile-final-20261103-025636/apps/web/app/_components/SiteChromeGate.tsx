"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Hides the public-site chrome on account routes.
 * On listing details, chrome remains available on desktop and is hidden on mobile;
 * the listing page keeps its own mobile toolbar and contact actions.
 */
export default function SiteChromeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const hidePublicChrome =
    /^\/(?:dashboard|admin|profile|my)(?:\/|$)/.test(pathname) ||
    /^\/listings\/new(?:\/|$)/.test(pathname);

  if (hidePublicChrome) return null;

  const isListingDetail = /^\/listings\/[^/]+\/?$/.test(pathname);
  if (isListingDetail) {
    return <div className="kh-listing-detail-public-chrome">{children}</div>;
  }

  return children;
}
