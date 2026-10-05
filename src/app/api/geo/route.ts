import { NextRequest, NextResponse } from "next/server";

const COUNTRY_CODE_MAP: Record<string, string> = {
  BD: "Bangladesh",
  DE: "Germany",
  GB: "United Kingdom",
  UK: "United Kingdom",
  US: "United States",
  CA: "Canada",
  AU: "Australia",
  AT: "Austria",
  CH: "Switzerland",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
  SE: "Sweden",
  PL: "Poland",
  BE: "Belgium",
  IE: "Ireland",
  DK: "Denmark",
  NO: "Norway",
  IN: "India",
  PK: "Pakistan",
  NP: "Nepal",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
};

export async function GET(req: NextRequest) {
  // 1. Inspect platform-provided country headers (Vercel, Cloudflare, Fastly, AWS CloudFront)
  const headerCountry =
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    req.headers.get("x-country-code") ||
    req.headers.get("cloudfront-viewer-country");

  if (headerCountry && COUNTRY_CODE_MAP[headerCountry.toUpperCase()]) {
    return NextResponse.json({
      country: COUNTRY_CODE_MAP[headerCountry.toUpperCase()],
      code: headerCountry.toUpperCase(),
      source: "header",
    });
  }

  // 2. Client IP lookup with strict timeout
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "";
    if (
      ip &&
      ip !== "127.0.0.1" &&
      ip !== "::1" &&
      !ip.startsWith("192.168.") &&
      !ip.startsWith("10.") &&
      !ip.startsWith("172.16.")
    ) {
      const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, {
        signal: AbortSignal.timeout(1200),
      });
      if (geoRes.ok) {
        const data = await geoRes.json();
        if (data?.country_code && COUNTRY_CODE_MAP[data.country_code]) {
          return NextResponse.json({
            country: COUNTRY_CODE_MAP[data.country_code],
            code: data.country_code,
            source: "ip",
          });
        }
      }
    }
  } catch {
    // Non-blocking
  }

  return NextResponse.json({ country: null });
}
