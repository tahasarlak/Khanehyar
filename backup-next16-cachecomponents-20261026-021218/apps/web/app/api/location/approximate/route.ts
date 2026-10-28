import { NextResponse } from "next/server";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isPublicIp(value: string) {
  const ip = value.trim().replace(/^\[|\]$/g, "");
  if (!ip || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("172.16.") || ip.startsWith("172.17.") || ip.startsWith("172.18.") || ip.startsWith("172.19.") || ip.startsWith("172.2") || ip.startsWith("172.30.") || ip.startsWith("172.31.") || ip.startsWith("169.254.")) return false;
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip) || ip.includes(":");
}

export async function GET() {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = requestHeaders.get("cf-connecting-ip") || requestHeaders.get("x-real-ip") || forwarded || "";
  const usableClientIp = isPublicIp(candidate);
  // On localhost, the request only contains a loopback/private IP. In development only,
  // use the server's public egress IP as a rough fallback so local testing still works.
  if (!usableClientIp && process.env.NODE_ENV === "production") {
    return NextResponse.json({ location: null, source: "unavailable" }, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const lookupUrl = usableClientIp
      ? `https://ipapi.co/${encodeURIComponent(candidate)}/json/`
      : "https://ipapi.co/json/";
    const response = await fetch(lookupUrl, { signal: AbortSignal.timeout(2500), cache: "no-store", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Geolocation unavailable");
    const data = await response.json() as { latitude?: unknown; longitude?: unknown; city?: unknown; country_name?: unknown; error?: boolean };
    const latitude = Number(data.latitude); const longitude = Number(data.longitude);
    if (data.error || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new Error("Invalid geolocation");
    return NextResponse.json({ location: { latitude, longitude, city: typeof data.city === "string" ? data.city.slice(0, 80) : null, country: typeof data.country_name === "string" ? data.country_name.slice(0, 80) : null }, source: "ip-approximate" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ location: null, source: "unavailable" }, { headers: { "Cache-Control": "no-store" } });
  }
}
