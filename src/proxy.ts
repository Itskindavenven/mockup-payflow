import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "app_session";

function secret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.APP_SECRET ?? "dev-secret-change-this-in-production"
  );
}

const PUBLIC_PATHS = new Set(["/login"]);
const PUBLIC_PREFIXES = ["/api/app-auth/", "/api/auth/", "/_next/", "/favicon"];

// Routes that require a specific permission (employees only — admins always pass)
const ROUTE_PERMISSIONS: Record<string, string> = {
  "/transaksi": "transaksi",
  "/keyword-mapping": "keyword-mapping",
  "/audit-log": "audit-log",
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  let payload: { role?: string; permissions?: string[] } | null = null;
  try {
    const result = await jwtVerify(token, secret());
    payload = result.payload as { role?: string; permissions?: string[] };
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    const res = NextResponse.redirect(url);
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  // Admin-only routes. /settings used to be admin-only too, but it's also
  // where every user connects their own Accurate account (see
  // accurate-token-store.ts — each app user has an independent Accurate
  // OAuth connection now), so all logged-in users need it. Actions that
  // are still meant to be admin-only there (add/bulk-import vendor, etc.)
  // stay gated server-side in their own API routes.
  if (pathname.startsWith("/admin") && payload.role !== "admin") {
    return NextResponse.redirect(new URL("/transaksi", req.url));
  }

  // Permission-gated routes
  for (const [route, perm] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname === route || pathname.startsWith(route + "/")) {
      const hasPermission =
        payload.role === "admin" || (payload.permissions ?? []).includes(perm);
      if (!hasPermission) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
