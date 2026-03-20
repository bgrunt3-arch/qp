"use client";

import { useEffect } from "react";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

type AdBannerProps = {
  slot?: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  className?: string;
};

export function AdBanner({ slot = "1234567890", format = "auto", className = "" }: AdBannerProps) {
  useEffect(() => {
    if (ADSENSE_CLIENT && typeof window !== "undefined") {
      try {
        ((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle =
          (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle || []).push({});
      } catch {
        // ignore
      }
    }
  }, []);

  if (!ADSENSE_CLIENT) {
    return (
      <div
        className={`flex items-center justify-center min-h-[90px] rounded-lg bg-subtle/50 border border-page text-muted text-xs ${className}`}
      >
        広告枠
      </div>
    );
  }

  return (
    <ins
      className={`adsbygoogle block ${className}`}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={format === "auto" ? "true" : undefined}
      style={{ display: "block", minHeight: format === "auto" ? 90 : 50 }}
    />
  );
}
