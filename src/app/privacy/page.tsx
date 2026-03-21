import Link from "next/link";

export const metadata = {
  title: "プライバシーポリシー",
  description: "QuickPercentのプライバシーポリシー",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-page text-foreground">
      <header className="border-b border-page px-4 py-4">
        <Link href="/" className="text-accent font-bold text-lg hover:opacity-90">
          QuickPercent
        </Link>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">プライバシーポリシー</h1>
        <p className="text-sm text-muted mb-4">最終更新日: 2026年3月</p>

        <section className="space-y-4 text-sm">
          <h2 className="text-lg font-semibold">1. 収集する情報</h2>
          <p>
            QuickPercentは、割合・割引計算の利便性向上のため、以下の情報を収集・保存します。
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>計算履歴（ブラウザのローカルストレージに保存、サーバーへ送信しません）</li>
            <li>Premium購入状態（ブラウザのローカルストレージに保存）</li>
            <li>ライセンスキー（購入時に発行、サーバーで検証用に保存。決済IDとの紐付けのみで個人情報は含みません）</li>
          </ul>

          <h2 className="text-lg font-semibold">2. 第三者サービス</h2>
          <p>
            本サービスでは、広告表示（Google AdSense）および決済処理（Square）のため、第三者サービスを利用しています。これらのサービスはそれぞれのプライバシーポリシーに従ってデータを処理します。
          </p>

          <h2 className="text-lg font-semibold">3. お問い合わせ</h2>
          <p>
            プライバシーに関するお問い合わせは、本サイトのトップページ下部のリンクからご連絡ください。
          </p>
        </section>

        <p className="mt-8 flex flex-wrap gap-4">
          <Link href="/" className="text-accent hover:underline">← トップに戻る</Link>
          <Link href="/about" className="text-muted hover:text-accent hover:underline">アプリの説明</Link>
        </p>
      </main>
    </div>
  );
}
