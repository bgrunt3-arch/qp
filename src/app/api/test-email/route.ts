import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/**
 * Resend の動作確認用テストAPI
 * GET /api/test-email?to=your@email.com&secret=YOUR_SECRET
 * 環境変数: RESEND_API_KEY, RESEND_FROM_EMAIL, TEST_EMAIL_SECRET（任意・セキュリティ用）
 */
export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to");
  const secret = req.nextUrl.searchParams.get("secret");
  const expectSecret = process.env.TEST_EMAIL_SECRET;

  if (!to || !to.includes("@")) {
    return NextResponse.json(
      { error: "?to=your@email.com を指定してください" },
      { status: 400 }
    );
  }

  if (expectSecret && secret !== expectSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return NextResponse.json(
      {
        error: "Resend not configured",
        hint: "RESEND_API_KEY と RESEND_FROM_EMAIL を Vercel の環境変数に設定してください",
      },
      { status: 503 }
    );
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: `QuickPercent <${from}>`,
    to: [to],
    subject: "QuickPercent メールテスト",
    html: "<p>Resend のテスト送信に成功しました。</p>",
  });

  if (error) {
    return NextResponse.json(
      { error: error.message, sent: false },
      { status: 500 }
    );
  }

  return NextResponse.json({
    sent: true,
    id: data?.id,
    message: `${to} に送信しました。迷惑メールフォルダも確認してください。`,
  });
}
