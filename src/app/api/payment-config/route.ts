import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId =
    process.env.SQUARE_LOCATION_ID ||
    process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
  const squareEnabled = Boolean(accessToken && locationId);
  const premiumPurchaseUrl = process.env.NEXT_PUBLIC_PREMIUM_PURCHASE_URL || null;

  return NextResponse.json({
    squareEnabled,
    premiumPurchaseUrl,
  });
}
