import { WebhooksHelper } from "square";
import { NextRequest, NextResponse } from "next/server";
import { generateLicenseKey } from "@/lib/license";
import { saveLicense, saveLicenseByEmail, getLicenseByPayment, isKvConfigured } from "@/lib/kv";
import { sendLicenseKeyEmail, isEmailConfigured } from "@/lib/email";

const PREMIUM_AMOUNT_JPY = 100;
const PREMIUM_AMOUNT_USD_CENTS = 100;

/** x-square-signature と x-square-hmacsha256-signature の両方に対応（Square API の種類により異なる） */
function getSignature(req: NextRequest): string | null {
  return (
    req.headers.get("x-square-signature") ??
    req.headers.get("x-square-hmacsha256-signature")
  );
}

export async function POST(req: NextRequest) {
  let body: string;
  try {
    body = await req.text();
  } catch (err) {
    console.error("[Square Webhook] Failed to read body:", err);
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  console.log("Webhook received!", body);

  const signature = getSignature(req);
  const baseUrl =
    process.env.SQUARE_WEBHOOK_NOTIFICATION_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "https://qp-lime.vercel.app";
  const fullUrl = `${baseUrl.replace(/\/$/, "")}/api/webhooks/square`;
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  if (!signature) {
    console.error("[Square Webhook] Missing signature header. Available headers:", {
      "x-square-signature": req.headers.get("x-square-signature"),
      "x-square-hmacsha256-signature": req.headers.get("x-square-hmacsha256-signature"),
    });
    return NextResponse.json({ error: "Missing signature" }, { status: 403 });
  }

  if (!signatureKey) {
    console.error("[Square Webhook] SQUARE_WEBHOOK_SIGNATURE_KEY is not configured.");
    return NextResponse.json({ error: "Missing signature key" }, { status: 500 });
  }

  let isValid: boolean;
  try {
    isValid = await WebhooksHelper.verifySignature({
      requestBody: body,
      signatureHeader: signature,
      signatureKey,
      notificationUrl: fullUrl,
    });
  } catch (err) {
    console.error("[Square Webhook] Signature verification error:", err);
    return NextResponse.json({ error: "Signature verification failed" }, { status: 500 });
  }

  if (!isValid) {
    console.error("[Square Webhook] Invalid signature. notificationUrl used:", fullUrl);
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
  } catch (err) {
    console.error("[Square Webhook] Invalid JSON:", err);
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

  if (email) {
    await saveLicenseByEmail(email, licenseKey);
    if (isEmailConfigured()) {
      const emailResult = await sendLicenseKeyEmail(email, licenseKey);
      if (!emailResult.ok) {
        console.error("[Square Webhook] Failed to send license email:", emailResult.error);
      }
    } else {
      console.warn("[Square Webhook] Resend not configured. License key not emailed:", licenseKey);
    }
  } else {
    console.warn("[Square Webhook] No buyer email in payment. License saved but not emailed:", { paymentId, licenseKey });
  }

  return NextResponse.json({ received: true });
}
