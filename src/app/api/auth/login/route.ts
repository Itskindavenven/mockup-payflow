import { NextRequest } from "next/server";
import { redirect } from "next/navigation";

export async function GET(req: NextRequest) {
  // `from`: internal app path to send the user back to once Accurate
  // reconnect finishes — round-tripped through OAuth's `state` param
  // (see /api/auth/callback). Only accept internal paths; anything else
  // is dropped so this can't be abused as an open redirect.
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

  redirect(`https://account.accurate.id/oauth/authorize?${params}`);
}
