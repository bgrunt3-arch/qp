import Link from "next/link";
import { HelpCircle } from "lucide-react";

export const metadata = {
  title: "よくある質問",
  description: "QuickPercentのよくある質問と回答",
};

const faqs = [
  {
    q: "履歴はどこに保存されますか？",
    a: "ブラウザのローカルストレージに保存されます。サーバーへ送信されないため、プライバシーを保護したまま利用できます。端末やブラウザを変えると履歴は引き継がれません。",
  },
  {
    q: "履歴の上限を超えるとどうなりますか？",
    a: "古いものから自動的に削除されます。無料版は各50件、Premiumは履歴・割引履歴200件、比較リスト100件まで保存できます。",
  },
  {
    q: "Premiumを購入すると何ができますか？",
    a: "アクセントカラーの変更、履歴・比較リストの上限拡張、CSVエクスポートが利用できます。広告も非表示になります。",
  },
  {
    q: "セット割モードの「2袋目の単価」とは？",
    a: "2袋目のみの価格です。例：「1袋198円、2袋目98円」の場合、2袋目の98円を入力します。2袋セットの合計価格ではありません。",
  },
  {
    q: "割引モードで割引率とセール価格の両方を入力できますか？",
    a: "どちらか一方を入力すれば、もう一方は自動計算されます。両方入力した場合は割引率が優先され、セール価格は再計算されます。",
  },
  {
    q: "計算結果をコピーできますか？",
    a: "各モードに「コピー」ボタンがあります。履歴に追加した項目には共有ボタンがあり、式や結果をクリップボードにコピーできます。",
  },
  {
    q: "端末を変えてもPremiumは使えますか？",
    a: "Premiumの購入状態はブラウザのローカルストレージに保存されます。端末やブラウザを変えると、その端末では未購入として表示されます。同じ端末・ブラウザであれば継続して利用できます。",
  },
  {
    q: "返金はできますか？",
    a: "決済はSquareで処理しています。返金についてはSquareの決済規約に従います。お問い合わせはフッターのリンクからご連絡ください。",
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-dvh bg-page text-foreground">
      <header className="border-b border-page px-4 py-4">
        <Link href="/" className="text-accent font-bold text-lg hover:opacity-90">
          QuickPercent
        </Link>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <HelpCircle size={28} className="text-accent" />
          よくある質問
        </h1>

        <dl className="space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-page pb-6 last:border-0 last:pb-0">
              <dt className="font-semibold text-sm mb-2 text-foreground">{faq.q}</dt>
              <dd className="text-sm text-muted leading-relaxed">{faq.a}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-8 text-sm text-muted">
          その他のご質問は、<Link href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@qp-lime.vercel.app"}`} className="text-accent hover:underline">お問い合わせ</Link>からお願いします。
        </p>

        <nav className="mt-8 flex flex-wrap gap-4 text-sm">
          <Link href="/" className="text-accent hover:underline">
            ← トップに戻る
          </Link>
          <Link href="/about" className="text-muted hover:text-accent hover:underline">
            アプリの説明
          </Link>
          <Link href="/tips" className="text-muted hover:text-accent hover:underline">
            計算のコツ
          </Link>
        </nav>
      </main>
    </div>
  );
}
