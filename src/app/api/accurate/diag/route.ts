import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { isRedisConfigured, loadAccountToken } from "@/lib/accurate-token-store";

// Temporary admin-only diagnostic for tracking down why logout sometimes
// doesn't seem to disconnect Accurate on Vercel. Boolean-only — never
// returns the token/session itself, just whether one is present and
// whether Redis (the cross-instance store) is configured at all. Remove
// once the logout-persistence issue is confirmed fixed.
export async function GET() {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const account = await loadAccountToken(session.id);
  return NextResponse.json({
    redisConfigured: isRedisConfigured(),
    hasAccountToken: account !== null,
  });
}
