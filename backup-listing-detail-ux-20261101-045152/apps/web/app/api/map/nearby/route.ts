import { NextResponse } from "next/server";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "../../../../src/lib/rate-limit";
type Tags = Record<string, string | undefined>;
type OverpassElement = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Tags };
type PlaceResult = { id: string; name: string; category: string; categoryLabel: string; icon: string; latitude: number; longitude: number };

function classify(tags: Tags) {
  const amenity = tags.amenity || ""; const shop = tags.shop || ""; const leisure = tags.leisure || ""; const railway = tags.railway || ""; const pt = tags.public_transport || "";
  if (/school|kindergarten|university|college|library|language_school/.test(amenity)) return { category: "education", categoryLabel: "آموزش", icon: "🎓" };
  if (/supermarket|convenience|bakery|mall|department_store|greengrocer|marketplace/.test(`${shop} ${amenity}`)) return { category: "shopping", categoryLabel: "خرید", icon: "🛍️" };
  if (/hospital|clinic|doctors|dentist|pharmacy|healthcare/.test(`${amenity} ${tags.healthcare || ""}`)) return { category: "health", categoryLabel: "سلامت", icon: "✚" };
  if (/bus_station|bus_stop/.test(amenity) || /station|subway_entrance/.test(railway) || /platform|station/.test(pt)) return { category: "transit", categoryLabel: "حمل‌ونقل", icon: "🚏" };
  if (/park|playground|sports_centre|fitness_centre|garden/.test(leisure)) return { category: "green", categoryLabel: "پارک و ورزش", icon: "🌳" };
  if (/restaurant|cafe|fast_food|food_court|ice_cream/.test(amenity)) return { category: "food", categoryLabel: "غذا و کافه", icon: "☕" };
  if (/bank|atm|post_office|police|fire_station|fuel|parking|community_centre|place_of_worship/.test(amenity)) return { category: "services", categoryLabel: "خدمات", icon: "⌖" };
  return { category: "other", categoryLabel: "سایر", icon: "•" };
}

export async function GET(request: Request) {
  const limit = await checkRateLimit("map-nearby", getRequestIdentity(request));
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat")); const longitude = Number(url.searchParams.get("lon"));
  const radiusRaw = Number(url.searchParams.get("radius") || 1000);
  const radius = [500, 1000, 3000, 5000].includes(radiusRaw) ? radiusRaw : 1000;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return NextResponse.json({ error: "مختصات نقشه معتبر نیست." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const around = (tag: string) => `nwr(around:${radius},${latitude},${longitude})[${tag}];`;
  const query = `[out:json][timeout:7];(${[
    around('amenity~"school|kindergarten|university|college|library|hospital|clinic|doctors|dentist|pharmacy|restaurant|cafe|fast_food|food_court|bank|atm|post_office|police|fire_station|fuel|parking|bus_station|marketplace|place_of_worship|community_centre"'),
    around('shop~"supermarket|convenience|bakery|mall|department_store|greengrocer"'),
    around('leisure~"park|playground|sports_centre|fitness_centre|garden"'),
    around('railway~"station|subway_entrance"'),
    around('public_transport~"platform|station"'),
  ].join("")} );out center 100;`;
  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST", body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "application/json" },
      signal: AbortSignal.timeout(8500), cache: "no-store",
    });
    if (!response.ok) throw new Error(`Overpass returned ${response.status}`);
    const data = await response.json() as { elements?: OverpassElement[] };
    const places = (data.elements || []).map((item) => {
      const lat = item.lat ?? item.center?.lat; const lon = item.lon ?? item.center?.lon; const tags = item.tags || {};
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      const type = classify(tags);
      const name = (tags.name || tags["name:fa"] || tags.brand || tags.operator || type.categoryLabel).slice(0, 120);
      return { id: `${item.type}-${item.id}`, name, category: type.category, categoryLabel: type.categoryLabel, icon: type.icon, latitude: lat as number, longitude: lon as number } satisfies PlaceResult;
    }).filter((item): item is PlaceResult => item !== null);
    const unique = [...new Map(places.map((item) => [item.id, item])).values()];
    return NextResponse.json({ places: unique }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "دادهٔ امکانات اطراف فعلاً در دسترس نیست؛ چند لحظه بعد دوباره تلاش کن." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}

