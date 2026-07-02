import { redirect } from "next/navigation";

export async function GET() {
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
  });

  redirect(`https://account.accurate.id/oauth/authorize?${params}`);
}
