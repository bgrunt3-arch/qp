import { NextRequest, NextResponse } from "next/server";
import { generateLicenseKey } from "@/lib/license";
import { saveLicense, getLicenseByPayment, isKvConfigured } from "@/lib/kv";

const PREMIUM_AMOUNT_JPY = 100;

type PayPayWebhookPayload = {
  notification_type?: string;
  state?: string;
  merchant_order_id?: string;
  merchantPaymentId?: string;
  order_amount?: number | string;
};

export async function POST(req: NextRequest) {
  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let payload: PayPayWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.notification_type !== "Transaction") {
    return NextResponse.json("OK");
  }

  if (payload.state !== "COMPLETED") {
    return NextResponse.json("OK");
  }

  const merchantPaymentId =
    payload.merchantPaymentId ?? payload.merchant_order_id ?? "";
  if (!merchantPaymentId.startsWith("qp-premium-")) {
    return NextResponse.json("OK");
  }

  const orderAmount =
    typeof payload.order_amount === "string"
      ? parseInt(payload.order_amount, 10)
      : payload.order_amount ?? 0;
  if (orderAmount !== PREMIUM_AMOUNT_JPY || !isKvConfigured()) {
    return NextResponse.json("OK");
  }

  let licenseKey = await getLicenseByPayment(merchantPaymentId, "paypay");
  if (!licenseKey) {
    licenseKey = generateLicenseKey();
    await saveLicense(licenseKey, merchantPaymentId, "paypay");
  }

  return NextResponse.json("OK");
}
