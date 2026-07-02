import { NextRequest, NextResponse } from "next/server";

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

  const token = await tokenRes.json();

  // Immediately test: get db list
  const dbRes = await fetch("https://account.accurate.id/api/db-list.do", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const dbList = await dbRes.json();

  // Return everything for inspection (dev only)
  return NextResponse.json({
    access_token: token.access_token,
    token_type: token.token_type,
    expires_in: token.expires_in,
    refresh_token: token.refresh_token,
    databases: dbList,
  });
}
