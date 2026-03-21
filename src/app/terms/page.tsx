import Link from "next/link";

export const metadata = {
  title: "利用規約",
  description: "QuickPercentの利用規約",
};

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-page text-foreground">
      <header className="border-b border-page px-4 py-4">
        <Link href="/" className="text-accent font-bold text-lg hover:opacity-90">
          QuickPercent
        </Link>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">利用規約</h1>
        <p className="text-sm text-muted mb-4">最終更新日: 2026年3月</p>

        <section className="space-y-4 text-sm">
          <h2 className="text-lg font-semibold">第1条（適用）</h2>
          <p>
            本規約は、QuickPercent（以下「本サービス」）の利用に関する条件を定めるものです。本サービスをご利用いただくことで、本規約に同意したものとみなします。
          </p>

          <h2 className="text-lg font-semibold">第2条（サービス内容）</h2>
          <p>
            本サービスは、数値の割合・割引率を計算するWebアプリケーションです。割合モード、セット割モード、割引モードの3種類の計算機能を提供します。
          </p>

          <h2 className="text-lg font-semibold">第3条（Premium購入）</h2>
          <p>
            Premiumプランは買い切り型の有料オプションです。購入後、広告が非表示になり、アクセントカラーの変更、履歴・比較リストの保存上限拡張（無料50件→最大200件）、履歴のCSVエクスポートが可能になります。返金については、Squareの決済規約に従います。
          </p>

          <h2 className="text-lg font-semibold">第4条（免責事項）</h2>
          <p>
            本サービスの計算結果は参考情報としてご利用ください。重要な判断の際は、必ずご自身で確認してください。
          </p>

          <h2 className="text-lg font-semibold">第5条（お問い合わせ）</h2>
          <p>
            本規約に関するお問い合わせは、本サイトのトップページ下部のリンクからご連絡ください。
          </p>
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
