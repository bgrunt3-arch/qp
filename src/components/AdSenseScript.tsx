import Script from "next/script";

/** 開発時はAdSenseを読み込まない（localhost iframeエラー回避） */
export function AdSenseScript() {
  if (process.env.NODE_ENV === "development") return null;

  return (
    <Script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6880608133692345"
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
