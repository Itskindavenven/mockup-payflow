import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  // Each app user gets their own Accurate connection (see
  // accurate-token-store.ts) — the callback needs to know which app user
  // this OAuth flow belongs to, so require an app session before sending
  // anyone off to Accurate's consent screen.
  const session = await getServerSession();
  console.log("[debug] GET /api/auth/login hit, session present:", session !== null);
  if (!session) {
    return NextResponse.json({ error: "Harus login ke aplikasi dulu sebelum connect Accurate." }, { status: 401 });
  }

  // `from`: internal app path to send the user back to once Accurate
  // reconnect finishes — round-tripped through OAuth's `state` param
  // (see /api/auth/callback). Only accept internal paths; anything else
  // is dropped so this can't be abused as an open redirect. Which app
  // user the resulting token belongs to is read from the session cookie
  // at callback time, NOT from `state` — `state` is unsigned and
  // attacker-observable, so it must never carry the userId that decides
  // whose Accurate connection gets overwritten (that would let anyone
  // who completes their own Accurate consent screen hijack an arbitrary
  // app user's connection just by crafting `state`).
  const from = req.nextUrl.searchParams.get("from");
  const state = from && from.startsWith("/") && !from.startsWith("//") ? from : "";

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.ACCURATE_CLIENT_ID!,
    redirect_uri: process.env.ACCURATE_REDIRECT_URI!,
    scope: [
      "glaccount_view",
      "vendor_view",
      "vendor_save",
      "other_payment_view",
      "other_payment_save",
      "purchase_payment_view",
      "purchase_payment_save",
      "purchase_invoice_view",
      "bank_statement_view",
      "bank_statement_save",
    ].join(" "),
    ...(state ? { state } : {}),
  });

  // NOTE: oauth/login.do is a plain login form and does NOT honor
  // redirect_uri/response_type — after logging in there it just drops the
  // user on their Accurate account home page instead of back into this
  // app (confirmed by testing). oauth/authorize is the actual OAuth2
  // authorization endpoint: it shows Accurate's login/consent screen and
  // then redirects to redirect_uri with the code, which is what
  // /api/auth/callback needs.
  redirect(`https://account.accurate.id/oauth/authorize?${params}`);
}
