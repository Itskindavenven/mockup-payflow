import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { isRedisConfigured, loadAccountToken, clearAccountToken } from "@/lib/accurate-token-store";

// Temporary admin-only diagnostic for tracking down why logout sometimes
// doesn't seem to disconnect Accurate on Vercel. Boolean-only for token
// presence — never returns the token/session itself. `?clear=1` runs the
// exact same clearAccountToken() the logout route calls, but surfaces any
// thrown error directly in the response instead of just console.error-ing
// it, and reports before/after state in one round trip — much faster to
// iterate on than doing a full logout+login cycle and digging through
// Vercel function logs each time. Remove once the issue is confirmed fixed.
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const before = await loadAccountToken(session.id);

  let clearError: string | undefined;
  if (req.nextUrl.searchParams.get("clear") === "1") {
    try {
      await clearAccountToken(session.id);
    } catch (e) {
      clearError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }
  }

  const after = await loadAccountToken(session.id);

  return NextResponse.json({
    redisConfigured: isRedisConfigured(),
    hasAccountTokenBefore: before !== null,
    ...(req.nextUrl.searchParams.get("clear") === "1"
      ? { clearError, hasAccountTokenAfter: after !== null }
      : {}),
  });
}
