import { WebhooksHelper } from "square";
import { NextRequest, NextResponse } from "next/server";
import { generateLicenseKey } from "@/lib/license";
import { saveLicense, getLicenseByPayment, isKvConfigured } from "@/lib/kv";
import { sendLicenseKeyEmail, isEmailConfigured } from "@/lib/email";

const PREMIUM_AMOUNT_JPY = 100;
const PREMIUM_AMOUNT_USD_CENTS = 100;

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-square-hmacsha256-signature");
  const baseUrl =
    process.env.SQUARE_WEBHOOK_NOTIFICATION_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "https://qp.vercel.app";
  const fullUrl = `${baseUrl.replace(/\/$/, "")}/api/webhooks/square`;
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  if (!signature || !signatureKey) {
    return NextResponse.json({ error: "Missing signature" }, { status: 403 });
  }

  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const isValid = await WebhooksHelper.verifySignature({
    requestBody: body,
    signatureHeader: signature,
    signatureKey,
    notificationUrl: fullUrl,
  });

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  let payload: {
    type?: string;
    data?: {
      object?: {
        payment?: {
          id?: string;
          status?: string;
          amount_money?: { amount?: string; currency?: string };
          amountMoney?: { amount?: string; currency?: string };
          buyer_email_address?: string;
          buyerEmailAddress?: string;
        };
      };
    };
  };
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.type !== "payment.updated") {
    return NextResponse.json({ received: true });
  }

  const payment = payload.data?.object?.payment;
  if (!payment?.id || payment.status !== "COMPLETED") {
    return NextResponse.json({ received: true });
  }

  const amountMoney = payment.amount_money ?? payment.amountMoney;
  const amount = amountMoney?.amount;
  const currency = amountMoney?.currency ?? "JPY";
  const amountNum = amount ? parseInt(amount, 10) : 0;
  const isPremiumPayment =
    (currency === "JPY" && amountNum === PREMIUM_AMOUNT_JPY) ||
    (currency === "USD" && amountNum === PREMIUM_AMOUNT_USD_CENTS);

  if (!isPremiumPayment || !isKvConfigured()) {
    return NextResponse.json({ received: true });
  }

  const paymentId = payment.id;
  let licenseKey = await getLicenseByPayment(paymentId, "square");
  if (!licenseKey) {
    licenseKey = generateLicenseKey();
    await saveLicense(licenseKey, paymentId, "square");
  }

  const buyerEmail =
    payment.buyer_email_address ?? payment.buyerEmailAddress ?? "";
  const email = buyerEmail.trim();
  if (email && isEmailConfigured()) {
    await sendLicenseKeyEmail(email, licenseKey);
  }

  return NextResponse.json({ received: true });
}
