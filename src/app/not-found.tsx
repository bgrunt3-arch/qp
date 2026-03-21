import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-page text-foreground flex flex-col">
      <header className="border-b border-page px-4 py-4">
        <Link href="/" className="text-accent font-bold text-lg hover:opacity-90">
          QuickPercent
        </Link>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <h1 className="text-6xl font-bold text-muted/50">404</h1>
        <p className="mt-4 text-lg font-semibold text-foreground">ページが見つかりません</p>
        <p className="mt-2 text-sm text-muted text-center max-w-sm">
          お探しのページは存在しないか、移動した可能性があります。
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="px-6 py-3 rounded-xl font-semibold bg-accent text-white hover:opacity-90 transition-opacity"
          >
            トップに戻る
          </Link>
          <Link href="/about" className="px-6 py-3 rounded-xl font-medium border border-page hover:bg-subtle transition-colors">
            アプリの説明
          </Link>
        </div>
      </main>
    </div>
  );
}
