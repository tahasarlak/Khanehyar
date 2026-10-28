"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Hides public-site chrome on account routes using the active pathname rather
 * than body:has(.kh-account-shell), which can become stale during App Router
 * transitions when an outgoing route tree is temporarily retained.
 */
export default function SiteChromeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const hidePublicChrome =
    /^\/(?:dashboard|admin|profile|my)(?:\/|$)/.test(pathname) ||
    /^\/listings\/new(?:\/|$)/.test(pathname);

  if (hidePublicChrome) return null;
  return children;
}
