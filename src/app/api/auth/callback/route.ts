import { NextRequest, NextResponse } from "next/server";
import { setAccountToken } from "@/lib/accurate-token-store";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    const allParams: Record<string, string> = {};
    req.nextUrl.searchParams.forEach((v, k) => { allParams[k] = v; });
    return NextResponse.json({ error: "No code received", received_params: allParams }, { status: 400 });
  }

  // Exchange code for token — Accurate requires Basic Auth header
  const credentials = Buffer.from(
    `${process.env.ACCURATE_CLIENT_ID}:${process.env.ACCURATE_CLIENT_SECRET}`
  ).toString("base64");

  const tokenRes = await fetch("https://account.accurate.id/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.ACCURATE_REDIRECT_URI!,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return NextResponse.json({ error: "Token exchange failed", detail: err }, { status: 500 });
  }

  const token = await tokenRes.json() as { access_token: string; refresh_token: string };

  // This used to just dump the raw token JSON to the browser and require
  // manually pasting it somewhere to actually take effect — the store
  // (Redis/memory, same one refreshAccountToken reads/writes) was never
  // updated, so every reconnect required a human in the loop past this
  // point. Persist it here instead so a fresh OAuth login is immediately
  // live for every subsequent Accurate API call.
  await setAccountToken({ accessToken: token.access_token, refreshToken: token.refresh_token });

  // `state` carries the internal path the user was headed to before being
  // bounced out to Accurate's OAuth login (see /api/auth/login) — same
  // internal-path validation as there, since it's still attacker-controlled
  // input at this point.
  const state = req.nextUrl.searchParams.get("state");
  const target = state && state.startsWith("/") && !state.startsWith("//") ? state : "/settings";

  const url = req.nextUrl.clone();
  url.pathname = target;
  url.search = "";
  url.searchParams.set("accurate_reconnected", "1");
  return NextResponse.redirect(url);
}
