"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-[#e53e3e] mb-4">エラーが発生しました</h1>
          <p className="text-[#b3b3b3] mb-6">
            申し訳ありません。問題が発生しました。ページを再読み込みしてください。
          </p>
          <button
            onClick={() => reset()}
            className="px-6 py-3 rounded-xl font-semibold bg-[#1db954] text-black hover:bg-[#1ed760] transition-colors"
          >
            再試行
          </button>
        </div>
      </body>
    </html>
  );
}
