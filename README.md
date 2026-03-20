# QuickPercent

全体と成果を入力して割合を即座に算出するWebアプリ。

## 機能

- **通常モード**: 全体数・成果数 → 割合（%）を計算
- **逆算モード**: 全体数・目標% → 必要な成果数を計算
- 進捗バー色分け（0-30%赤 / 30-70%黄 / 70-100%緑）
- クイックプリセット（25%, 50%, 75%, 100%）
- 用途別テンプレート
- 履歴保存（ローカルストレージ）
- コピー・共有
- キーボードショートカット（Enter: コピー / Esc: クリア）

## 開発

```bash
npm install
npm run dev
```

http://localhost:3000 で起動

## 本番ビルド

```bash
npm run build
npm start
```

## デプロイ（Vercel）

1. [Vercel](https://vercel.com) にリポジトリをインポート
2. ルートディレクトリをプロジェクトフォルダに設定（モノレポの場合）
3. デプロイ

### 環境変数（任意）

| 変数 | 説明 |
|------|------|
| `NEXT_PUBLIC_SITE_URL` | 本番URL（OGP・sitemap用）。例: `https://qp.vercel.app` |

## 技術スタック

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Lucide React
