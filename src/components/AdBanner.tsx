"use client";

import { useEffect } from "react";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
const ADSENSE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID;

let adsensePushed = false;

type AdBannerProps = {
  slot?: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  className?: string;
};

export function AdBanner({ slot, format = "auto", className = "" }: AdBannerProps) {
  useEffect(() => {
    if (!ADSENSE_CLIENT || typeof window === "undefined" || adsensePushed) return;
    try {
      adsensePushed = true;
      ((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle =
        (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle || []).push({});
    } catch {
      adsensePushed = false;
    }
  }, []);

  const effectiveSlot = slot ?? ADSENSE_SLOT ?? "1234567890";
  const isPlaceholder = effectiveSlot === "1234567890";

  if (!ADSENSE_CLIENT || isPlaceholder) {
    return (
      <div
        className={`flex items-center justify-center min-h-[90px] rounded-lg bg-subtle/50 border border-page text-muted text-xs ${className}`}
      >
        {!ADSENSE_CLIENT ? "広告枠" : "広告枠（NEXT_PUBLIC_ADSENSE_SLOT_IDを設定）"}
      </div>
    );
  }

  return (
    <ins
      className={`adsbygoogle block ${className}`}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={effectiveSlot}
      data-ad-format={format}
      data-full-width-responsive={format === "auto" ? "true" : undefined}
      style={{ display: "block", minHeight: format === "auto" ? 90 : 50 }}
    />
  );
}
