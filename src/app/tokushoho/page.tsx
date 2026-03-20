import Link from "next/link";

export const metadata = {
  title: "特定商取引法に基づく表記",
  description: "QuickPercentの特定商取引法に基づく表記",
};

const OPERATOR_NAME = process.env.NEXT_PUBLIC_OPERATOR_NAME || "QuickPercent運営";
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@qp-lime.vercel.app";

export default function TokushohoPage() {
  return (
    <div className="min-h-dvh bg-page text-foreground">
      <header className="border-b border-page px-4 py-4">
        <Link href="/" className="text-accent font-bold text-lg hover:opacity-90">
          QuickPercent
        </Link>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">特定商取引法に基づく表記</h1>
        <p className="text-sm text-muted mb-6">最終更新日: 2026年3月</p>

        <section className="space-y-6 text-sm">
          <dl className="space-y-4">
            <div>
              <dt className="font-semibold text-label mb-1">販売価格（プラン料金）</dt>
              <dd>100円（税込）</dd>
            </div>
            <div>
              <dt className="font-semibold text-label mb-1">支払時期と方法</dt>
              <dd>クレジットカード決済。購入時にお支払いいただきます。</dd>
            </div>
            <div>
              <dt className="font-semibold text-label mb-1">返品・キャンセル</dt>
              <dd>デジタルコンテンツの性質上、ご購入後の返品・キャンセルはお受けできません。</dd>
            </div>
            <div>
              <dt className="font-semibold text-label mb-1">運営者名とメールアドレス</dt>
              <dd>
                {OPERATOR_NAME}
                <br />
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </dd>
            </div>
          </dl>
        </section>

        <p className="mt-8">
          <Link href="/" className="text-accent hover:underline">
            ← トップに戻る
          </Link>
        </p>
      </main>
    </div>
  );
}
