import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { generateLicenseKey } from "@/lib/license";
import { saveLicense, saveLicenseByEmail, getLicenseByPayment, claimPaymentProcessing, isKvConfigured } from "@/lib/kv";
import { sendLicenseKeyEmail, isEmailConfigured } from "@/lib/email";

const PREMIUM_AMOUNT_JPY = 100;
const PREMIUM_AMOUNT_USD_CENTS = 100;

/**
 * Square の署名検証
 * Square は HMAC-SHA256(signatureKey, notificationUrl + rawBody) を base64 エンコードした値を
 * x-square-hmacsha256-signature ヘッダーに付与して送信する。
 */
function computeSquareSignature(
  signatureKey: string,
  notificationUrl: string,
  rawBody: string
): string {
  return crypto
    .createHmac("sha256", signatureKey)
    .update(notificationUrl + rawBody)
    .digest("base64");
}

export async function POST(req: NextRequest) {
  // ストリームは一度だけ消費できる。最初に必ず読み切る。
  let body: string;
  try {
    body = await req.text();
  } catch (err) {
    console.error("[Square Webhook] Failed to read body:", err);
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  console.log("Webhook received!", body);

  // Square は x-square-hmacsha256-signature を送信する（旧形式は x-square-signature）
  const receivedSignature =
    req.headers.get("x-square-hmacsha256-signature") ??
    req.headers.get("x-square-signature") ??
    "";

  // SQUARE_WEBHOOK_NOTIFICATION_URL にはフルパス込みの URL が設定されている前提
  const notificationUrl =
    process.env.SQUARE_WEBHOOK_NOTIFICATION_URL?.replace(/\/$/, "") ??
    `${(
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      "https://qp-lime.vercel.app"
    ).replace(/\/$/, "")}/api/webhooks/square`;

  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY ?? "";

  // --- 診断ログ ---
  console.log("[Square Webhook] Verification context:", {
    "x-square-hmacsha256-signature": req.headers.get("x-square-hmacsha256-signature") ? "(present)" : "(absent)",
    "x-square-signature": req.headers.get("x-square-signature") ? "(present)" : "(absent)",
    signatureKeyConfigured: signatureKey.length > 0,
    notificationUrl,
  });

  if (!receivedSignature) {
    const allHeaders: Record<string, string> = {};
    req.headers.forEach((value, key) => { allHeaders[key] = value; });
    console.error("[Square Webhook] Missing signature header. All received headers:", allHeaders);
    return NextResponse.json({ error: "Missing signature" }, { status: 403 });
  }

  if (!signatureKey) {
    console.error("[Square Webhook] SQUARE_WEBHOOK_SIGNATURE_KEY is not configured.");
    return NextResponse.json({ error: "Missing signature key" }, { status: 500 });
  }

  const computedSignature = computeSquareSignature(signatureKey, notificationUrl, body);

  // 計算値と受信値の両方をログに出力して食い違いを特定できるようにする
  console.log("[Square Webhook] Signature comparison:", {
    computed: computedSignature,
    received: receivedSignature,
    match: computedSignature === receivedSignature,
  });

  if (computedSignature !== receivedSignature) {
    console.error("[Square Webhook] Invalid signature.");
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

  // SET NX でアトミックに処理権を取得。並列リトライが来ても最初の1件だけ通す
  const claimed = await claimPaymentProcessing(paymentId, "square");
  if (!claimed) {
    console.log("[Square Webhook] Duplicate request for paymentId, skipping:", paymentId);
    return NextResponse.json({ received: true });
  }

  const existingLicenseKey = await getLicenseByPayment(paymentId, "square");
  const isNewPayment = !existingLicenseKey;
  const licenseKey = existingLicenseKey ?? generateLicenseKey();

  if (isNewPayment) {
    await saveLicense(licenseKey, paymentId, "square");
  }

  const buyerEmail =
    payment.buyer_email_address ?? payment.buyerEmailAddress ?? "";
  const email = buyerEmail.trim();

  if (email) {
    await saveLicenseByEmail(email, licenseKey);
    // メール送信は初回のみ（Square のリトライで重複送信しないよう isNewPayment で制御）
    if (isNewPayment) {
      if (isEmailConfigured()) {
        const emailResult = await sendLicenseKeyEmail(email, licenseKey);
        if (!emailResult.ok) {
          console.error("[Square Webhook] Failed to send license email:", emailResult.error);
        }
      } else {
        console.warn("[Square Webhook] Resend not configured. License key not emailed:", licenseKey);
      }
    }
  } else if (isNewPayment) {
    console.warn("[Square Webhook] No buyer email in payment. License saved but not emailed:", { paymentId, licenseKey });
  }

  return NextResponse.json({ received: true });
}
