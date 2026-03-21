import { Resend } from "resend";

const APP_NAME = "QuickPercent";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return null;
  return { resend: new Resend(apiKey), from };
}

/** ライセンスキーをメールで送信 */
export async function sendLicenseKeyEmail(
  to: string,
  licenseKey: string
): Promise<{ ok: boolean; error?: string }> {
  const client = getResend();
  if (!client) {
    return { ok: false, error: "Resend not configured" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://qp.vercel.app";

  const { error } = await client.resend.emails.send({
    from: `${APP_NAME} <${client.from}>`,
    to: [to],
    subject: `${APP_NAME} Premium ライセンスキー`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 480px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #ff6b6b;">${APP_NAME} Premium</h1>
  <p>ご購入ありがとうございます。</p>
  <p>別のブラウザや端末でPremiumをご利用になる場合は、以下のライセンスキーを入力してください。</p>
  <p style="font-size: 18px; font-weight: bold; letter-spacing: 0.1em; padding: 16px; background: #f5f5f5; border-radius: 8px; margin: 20px 0;">${licenseKey}</p>
  <p style="font-size: 14px; color: #666;">使い方：<a href="${siteUrl}">${siteUrl}</a> を開き、Premiumモーダル内の「ライセンスキーをお持ちの方」欄に上記キーを入力して「有効化」を押してください。</p>
  <p style="font-size: 12px; color: #999; margin-top: 32px;">このメールは ${APP_NAME} の購入完了通知です。</p>
</body>
</html>
    `.trim(),
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}
