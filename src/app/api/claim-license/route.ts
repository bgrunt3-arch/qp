import { NextRequest, NextResponse } from "next/server";
import { getLicenseByEmail, isKvConfigured } from "@/lib/kv";

/** メールアドレスでSquare購入者のライセンスキーを取得 */
export async function POST(req: NextRequest) {
  if (!isKvConfigured()) {
    return NextResponse.json(
      { error: "現在利用できません" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "メールアドレスを入力してください" },
        { status: 400 }
      );
    }

    const licenseKey = await getLicenseByEmail(email);
    if (!licenseKey) {
      return NextResponse.json(
        {
          error: "ライセンスキーが見つかりませんでした",
          hint: "Square決済時に使用したメールアドレスと一致しているか確認してください。Webhook処理に数分かかる場合があります。",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ licenseKey });
  } catch {
    return NextResponse.json(
      { error: "エラーが発生しました" },
      { status: 500 }
    );
  }
}
