import Link from "next/link";
import { Percent, Tag, ArrowUpDown, Store } from "lucide-react";

export const metadata = {
  title: "アプリの説明・使い方",
  description: "QuickPercentの機能説明と使い方ガイド",
};

export default function AboutPage() {
  return (
    <div className="min-h-dvh bg-page text-foreground">
      <header className="border-b border-page px-4 py-4">
        <Link href="/" className="text-accent font-bold text-lg hover:opacity-90">
          QuickPercent
        </Link>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">アプリの説明・使い方</h1>

        <section className="space-y-4 text-sm mb-8">
          <h2 className="text-lg font-semibold">QuickPercentとは</h2>
          <p>
            QuickPercentは、割合・セット割・割引・フリマ純利益の計算を素早く行えるWebアプリです。達成率や進捗、買い物時の価格比較、メルカリ・ラクマなどの出品時の純利益など、日常でよく使う計算をブラウザで即座に算出できます。
          </p>
        </section>

        <section className="space-y-4 text-sm mb-8">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Percent size={18} />
            割合モード
          </h2>
          <p>全体数と成果数を入力して、割合（パーセント）を計算します。</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>全体数</strong>：分母（例：目標100件）</li>
            <li><strong>成果数</strong>：分子（例：達成80件）</li>
          </ul>
          <p>計算結果は「〇〇 / △△ = XX%」の形式で表示されます。矢印ボタンで「残り（補数）」表示に切り替え可能です。</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>「履歴に追加」で計算結果を保存（無料50件、Premium 200件）</li>
            <li>共有ボタンで式をコピー</li>
            <li>Escキーで入力をクリア</li>
          </ul>
        </section>

        <section className="space-y-4 text-sm mb-8">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ArrowUpDown size={18} />
            セット割モード
          </h2>
          <p>「1袋〇〇円」「2袋目△△円」のようなセット販売の実質単価を比較します。</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>通常時の単価</strong>：1袋あたりの定価（円）</li>
            <li><strong>2袋目の単価</strong>：2袋目のみの価格（円）</li>
          </ul>
          <p>実質単価・お得額・割引率を算出し、「リストに追加」で比較リストを作成できます（無料50件、Premium 100件）。</p>
        </section>

        <section className="space-y-4 text-sm mb-8">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Tag size={18} />
            割引モード
          </h2>
          <p>元の価格と割引率、またはセール価格から割引額・割引後の価格を計算します。</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>元の価格</strong>：定価（円）</li>
            <li><strong>割引率</strong>：〇〇%OFF の数値</li>
            <li><strong>セール価格</strong>：割引後の価格（割引率の代わりに入力可）</li>
          </ul>
          <p>割引率とセール価格のどちらか一方を入力すれば、もう一方は自動計算されます。「履歴に追加」で保存（無料50件、Premium 200件）。</p>
        </section>

        <section className="space-y-4 text-sm mb-8">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Store size={18} />
            フリマモード
          </h2>
          <p>メルカリ・ラクマ・Yahoo!フリマなどのフリマアプリで出品したときの純利益を計算します。</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>売値</strong>：商品の販売価格（円）</li>
            <li><strong>販売手数料率</strong>：プラットフォームの手数料（例：メルカリ10%）</li>
            <li><strong>振込手数料</strong>：銀行振込時の手数料（例：メルカリ200円）</li>
            <li><strong>送料</strong>：出品者負担の送料（0の場合は省略可）</li>
            <li><strong>原価</strong>：仕入れ価格（純利益の計算に使用、0の場合は入金予定額を表示）</li>
          </ul>
          <p>「メルカリ」「ラクマ」ボタンで手数料を一括入力できます。「履歴に追加」で保存（無料50件、Premium 200件）。</p>
        </section>

        <section className="space-y-4 text-sm mb-8">
          <h2 className="text-lg font-semibold">Premium機能</h2>
          <p>Premiumでは以下の機能が利用できます。</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>アクセントカラーの変更（7色から選択）</li>
            <li>履歴・比較リストの上限拡張</li>
            <li>CSVエクスポート（履歴・比較リスト・割引履歴をダウンロード）</li>
          </ul>
        </section>

        <section className="space-y-4 text-sm mb-8">
          <h2 className="text-lg font-semibold">データの保存について</h2>
          <p>
            計算履歴はブラウザのローカルストレージに保存されます。サーバーへ送信されないため、プライバシーを保護したまま利用できます。端末やブラウザを変えると履歴は引き継がれません。
          </p>
        </section>

        <nav className="flex flex-wrap gap-4 text-sm">
          <Link href="/" className="text-accent hover:underline">
            ← トップに戻る
          </Link>
          <Link href="/tips" className="text-muted hover:text-accent hover:underline">
            計算のコツ
          </Link>
          <Link href="/faq" className="text-muted hover:text-accent hover:underline">
            よくある質問
          </Link>
          <Link href="/privacy" className="text-muted hover:text-accent hover:underline">
            プライバシーポリシー
          </Link>
          <Link href="/terms" className="text-muted hover:text-accent hover:underline">
            利用規約
          </Link>
        </nav>
      </main>
    </div>
  );
}
