import Link from "next/link";
import { Lightbulb, TrendingUp, ShoppingBag, Target } from "lucide-react";

export const metadata = {
  title: "割合計算のコツ・例",
  description: "割合・達成率・割引の計算例とコツ",
};

export default function TipsPage() {
  return (
    <div className="min-h-dvh bg-page text-foreground">
      <header className="border-b border-page px-4 py-4">
        <Link href="/" className="text-accent font-bold text-lg hover:opacity-90">
          QuickPercent
        </Link>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Lightbulb size={28} className="text-accent" />
          割合計算のコツ・例
        </h1>

        <section className="space-y-4 text-sm mb-8">
          <h2 className="text-lg font-semibold">割合の基本</h2>
          <p>
            割合 = 成果数 ÷ 全体数 × 100（%）。「全体のうち、どれだけ達成したか」を表します。
          </p>
          <div className="rounded-lg bg-card border border-page p-4 font-mono text-sm">
            <p>例：目標100件のうち80件達成</p>
            <p className="text-accent font-semibold mt-1">80 ÷ 100 × 100 = 80%</p>
          </div>
        </section>

        <section className="space-y-4 text-sm mb-8">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Target size={18} />
            達成率・進捗の例
          </h2>
          <ul className="space-y-3">
            <li>
              <strong>営業目標</strong>：月間100件のうち65件成約 → 65%
            </li>
            <li>
              <strong>タスク進捗</strong>：10個中7個完了 → 70%
            </li>
            <li>
              <strong>テストの得点</strong>：100点満点で78点 → 78%
            </li>
            <li>
              <strong>在庫率</strong>：定数50個のうち42個在庫 → 84%
            </li>
          </ul>
          <p className="text-muted text-xs">
            「残り」表示にすると、未達成分（例：100% - 80% = 20%）が一目で分かります。
          </p>
        </section>

        <section className="space-y-4 text-sm mb-8">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingBag size={18} />
            割引・セット割の例
          </h2>
          <h3 className="font-medium">割引計算</h3>
          <ul className="space-y-2 ml-2">
            <li>定価1,000円が30%OFF → 700円（300円お得）</li>
            <li>定価2,980円がセール価格1,990円 → 約33%OFF（990円お得）</li>
          </ul>
          <h3 className="font-medium mt-4">セット割の比較</h3>
          <ul className="space-y-2 ml-2">
            <li>1袋198円 vs 2袋目98円 → 2袋で296円、実質148円/袋（約25%お得）</li>
            <li>1本298円 vs 2本目半額 → 2本で447円、実質約224円/本（約25%お得）</li>
          </ul>
        </section>

        <section className="space-y-4 text-sm mb-8">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp size={18} />
            計算のコツ
          </h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>分母を先に</strong>：全体数（目標・定価など）を先に入力するとミスが減ります</li>
            <li><strong>端数は気にしない</strong>：QuickPercentは四捨五入で表示。概算で十分な場面が多いです</li>
            <li><strong>割引率とセール価格</strong>：どちらか一方が分かれば、もう一方は自動計算されます</li>
            <li><strong>セット割</strong>：「2袋目〇〇円」は2袋目のみの価格。2袋セットの合計ではありません</li>
          </ul>
        </section>

        <section className="space-y-4 text-sm mb-8">
          <h2 className="text-lg font-semibold">よくある使い方</h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>日報・週報の達成率をサッと計算</li>
            <li>スーパーの「〇〇%OFF」が実際いくらになるか確認</li>
            <li>「2個で〇〇円」と単品、どちらがお得か比較</li>
            <li>割引後の価格から逆算して割引率を確認</li>
          </ul>
        </section>

        <nav className="flex flex-wrap gap-4 text-sm">
          <Link href="/" className="text-accent hover:underline">
            ← トップに戻る
          </Link>
          <Link href="/about" className="text-muted hover:text-accent hover:underline">
            アプリの説明
          </Link>
          <Link href="/faq" className="text-muted hover:text-accent hover:underline">
            よくある質問
          </Link>
        </nav>
      </main>
    </div>
  );
}
