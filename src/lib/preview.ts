import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Fetches a link's title and preview image (og:title / og:image) so ideas get a picture
// without anyone needing an API key. The server fetches arbitrary user-supplied URLs here,
// so every hop is checked against private/internal addresses (SSRF guard).

export type LinkPreview = { title: string | null; image: string | null };

const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 6000;

function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

async function assertPublicUrl(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http(s) links");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error("That link points somewhere private");
  }
}

async function fetchHtml(start: string): Promise<{ html: string; finalUrl: URL }> {
  let url = new URL(start);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        // Some sites (Google Maps included) only include og tags for "real" browsers.
        "user-agent": "Mozilla/5.0 (compatible; PartyPlannerBot/1.0; +link-preview)",
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en",
      },
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      url = new URL(location, url);
      continue;
    }
    if (!res.ok || !res.body) throw new Error(`Couldn't load link (${res.status})`);

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
    await reader.cancel().catch(() => {});
    return { html: Buffer.concat(chunks).toString("utf8"), finalUrl: url };
  }
  throw new Error("Too many redirects");
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function metaContent(html: string, key: string): string | null {
  // Matches <meta property="og:image" content="..."> in either attribute order.
  const k = key.replace(/[.:]/g, "\\$&");
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${k}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${k}["']`,
    "i",
  );
  const m = html.match(re);
  return m ? decodeEntities(m[1] ?? m[2]) : null;
}

/** Google Maps place URLs carry the place name: /maps/place/Joe's+Pizza/@... */
export function placeNameFromMapsUrl(url: URL): string | null {
  const m = url.pathname.match(/\/maps\/place\/([^/]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1].replace(/\+/g, " ")).trim() || null;
  } catch {
    return null;
  }
}

export async function getLinkPreview(link: string): Promise<LinkPreview> {
  const { html, finalUrl } = await fetchHtml(link);
  let title = metaContent(html, "og:title") ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? null;
  const placeName = placeNameFromMapsUrl(finalUrl);
  if (placeName && (!title || /google maps/i.test(title))) title = placeName;
  if (title) title = decodeEntities(title).replace(/\s*[·|-]\s*Google Maps$/i, "").slice(0, 120);

  let image = metaContent(html, "og:image") ?? metaContent(html, "twitter:image");
  if (image) {
    try {
      const abs = new URL(image, finalUrl);
      image = abs.protocol === "https:" || abs.protocol === "http:" ? abs.toString() : null;
    } catch {
      image = null;
    }
  }
  return { title: title || null, image };
}
