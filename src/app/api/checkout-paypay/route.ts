import PAYPAY from "@paypayopa/paypayopa-sdk-node";
import { NextRequest, NextResponse } from "next/server";

const PREMIUM_NAME = "QuickPercent Premium";
const AMOUNT_JPY = 100;

function ensureConfigured() {
  const apiKey = process.env.PAYPAY_API_KEY;
  const apiSecret = process.env.PAYPAY_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("PayPay is not configured");
  }
  const productionMode = process.env.PAYPAY_PRODUCTION === "true";
  PAYPAY.Configure({
    clientId: apiKey,
    clientSecret: apiSecret,
    productionMode,
  });
}

export async function POST(req: NextRequest) {
  try {
    ensureConfigured();
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }

  try {
    const origin =
      req.headers.get("origin") ||
      req.nextUrl.origin ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";
    const baseUrl = origin.replace(/\/$/, "");
    const merchantPaymentId = `qp-premium-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const redirectUrl = `${baseUrl}/?checkout=paypay&merchantPaymentId=${encodeURIComponent(merchantPaymentId)}`;

    const payload = {
      merchantPaymentId,
      amount: { amount: AMOUNT_JPY, currency: "JPY" },
      codeType: "ORDER_QR",
      orderDescription: PREMIUM_NAME,
      isAuthorization: false,
      redirectUrl,
      redirectType: "WEB_LINK" as const,
      userAgent: req.headers.get("user-agent") || "Mozilla/5.0 (compatible; QuickPercent/1.0)",
      requestedAt: Math.floor(Date.now() / 1000),
    };

    const response = await PAYPAY.QRCodeCreate(payload);
    const status = (response as { STATUS?: number }).STATUS;
    const body = (response as { BODY?: { resultInfo?: { code?: string }; data?: { url?: string } }; ERROR?: string }).BODY;
    const errMsg = (response as { ERROR?: string }).ERROR;

    if (status !== 200 && status !== 201) {
      const code = body?.resultInfo?.code ?? errMsg ?? "UNKNOWN";
      return NextResponse.json(
        { error: `PayPay: ${code}` },
        { status: status >= 400 && status < 600 ? status : 500 }
      );
    }

    const url = body?.data?.url;
    if (!url) {
      return NextResponse.json(
        { error: "Failed to create PayPay payment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url, merchantPaymentId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
