import PAYPAY from "@paypayopa/paypayopa-sdk-node";
import { NextRequest, NextResponse } from "next/server";
import { generateLicenseKey } from "@/lib/license";
import { saveLicense, getLicenseByPayment, isKvConfigured } from "@/lib/kv";

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

export async function GET(req: NextRequest) {
  try {
    ensureConfigured();
  } catch {
    return NextResponse.json({ completed: false }, { status: 200 });
  }

  const merchantPaymentId = req.nextUrl.searchParams.get("merchantPaymentId");
  if (!merchantPaymentId || !merchantPaymentId.startsWith("qp-premium-")) {
    return NextResponse.json({ completed: false }, { status: 400 });
  }

  try {
    const response = await PAYPAY.GetCodePaymentDetails([merchantPaymentId]);
    const status = (response as { STATUS?: number }).STATUS;
    const body = (response as { BODY?: { resultInfo?: { code?: string }; data?: { status?: string } } }).BODY;

    if (status !== 200) {
      return NextResponse.json({ completed: false }, { status: 200 });
    }

    const paymentStatus = body?.data?.status;
    const completed = paymentStatus === "COMPLETED";

    let licenseKey: string | null = null;
    if (completed && isKvConfigured()) {
      licenseKey = await getLicenseByPayment(merchantPaymentId, "paypay");
      if (!licenseKey) {
        licenseKey = generateLicenseKey();
        await saveLicense(licenseKey, merchantPaymentId, "paypay");
      }
    }

    return NextResponse.json({
      completed,
      status: paymentStatus,
      licenseKey: licenseKey ?? undefined,
    });
  } catch {
    return NextResponse.json({ completed: false }, { status: 200 });
  }
}
