import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId =
    process.env.SQUARE_LOCATION_ID ||
    process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
  const squareEnabled = Boolean(accessToken && locationId);
  // PayPayはまだ表示しない（有効化: Boolean(process.env.PAYPAY_API_KEY && process.env.PAYPAY_API_SECRET)）
  const paypayEnabled = false;
  const premiumPurchaseUrl = process.env.NEXT_PUBLIC_PREMIUM_PURCHASE_URL || null;
  const imageSearchEnabled = Boolean(process.env.OPENAI_API_KEY);

  return NextResponse.json({
    squareEnabled,
    paypayEnabled,
    premiumPurchaseUrl,
    imageSearchEnabled,
  });
}
