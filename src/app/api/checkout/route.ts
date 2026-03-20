import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
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

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "jpy",
            unit_amount: 100,
            product_data: {
              name: "QuickPercent Premium",
              description: "広告を非表示にして快適にご利用いただけます。買い切りで永続的に有効です。",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/?checkout=success`,
      cancel_url: `${baseUrl}/?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
