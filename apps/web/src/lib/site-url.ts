export function getSiteOrigin(): string | null {
  const raw =
    process.env.SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!raw) return null;

  try {
    const url = new URL(raw);

    const isLocalHost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]";

    const validProtocol =
      url.protocol === "https:" ||
      (
        process.env.NODE_ENV !== "production" &&
        isLocalHost &&
        url.protocol === "http:"
      );

    if (
      !validProtocol ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}