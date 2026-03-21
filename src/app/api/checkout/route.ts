import { SquareClient } from "square";
import { NextRequest, NextResponse } from "next/server";

const PREMIUM_NAME = "QuickPercent Premium";

export async function POST(req: NextRequest) {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId =
    process.env.SQUARE_LOCATION_ID ||
    process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;

  if (!accessToken || !locationId) {
    return NextResponse.json(
      { error: "Square is not configured" },
      { status: 500 }
    );
  }

  try {
    const square = new SquareClient({ token: accessToken });
    const origin =
      req.headers.get("origin") ||
      req.nextUrl.origin ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";
    const baseUrl = origin.replace(/\/$/, "");
    const redirectUrl = `${baseUrl}/?checkout=success`;

    // サンドボックスがUSアカウントの場合はUSDを使用（100セント＝$1）
    const useUsd = process.env.SQUARE_USE_USD === "true";
    const amount = useUsd ? 100 : 100; // USD: セント、JPY: 円
    const currency = useUsd ? "USD" : "JPY";

    const response = await square.checkout.paymentLinks.create({
      idempotencyKey: crypto.randomUUID(),
      quickPay: {
        name: PREMIUM_NAME,
        priceMoney: {
          amount: BigInt(amount),
          currency,
        },
        locationId,
      },
      checkoutOptions: {
        redirectUrl,
        allowTipping: false,
      },
      paymentNote: "QuickPercent Premium - 広告非表示オプション",
    });

    const url = response.paymentLink?.url;
    if (!url) {
      throw new Error("Failed to create payment link");
    }

    return NextResponse.json({ url });
  } catch (err) {
    const squareErr = err as { statusCode?: number; body?: { errors?: Array<{ code?: string; detail?: string }> } };
    const statusCode = squareErr.statusCode ?? 500;
    const errors = squareErr.body?.errors;
    let detail = errors?.[0]
      ? `${errors[0].code ?? "UNKNOWN"}: ${errors[0].detail ?? ""}`
      : err instanceof Error
        ? err.message
        : "Unknown error";
    if (statusCode === 401) {
      detail =
        "Square認証エラー。アクセストークンをDeveloper Consoleで再取得し、.env.localを更新してください。";
    }
    return NextResponse.json(
      { error: detail, squareErrors: errors },
      { status: statusCode >= 400 && statusCode < 500 ? statusCode : 500 }
    );
  }
}
