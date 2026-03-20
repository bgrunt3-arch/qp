"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { Copy, Trash2, Share2, Sun, Moon, Percent, Tag, ArrowUpDown, Crown, X } from "lucide-react";
import { AdBanner } from "@/components/AdBanner";
import { usePremium } from "@/hooks/usePremium";

const STORAGE_KEY = "percent-quick-history";
const COMPARE_STORAGE_KEY = "percent-quick-compare";
const DISCOUNT_STORAGE_KEY = "percent-quick-discount-history";
const APP_NAME = "QuickPercent";

type AppMode = "percent" | "compare" | "discount";

type HistoryItem = {
  id: string;
  total: number;
  target: number;
  percent: number;
  isInverted?: boolean;
  createdAt: number;
};


type CompareItem = {
  id: string;
  unitPrice: number;
  quantity: number;
  actualPrice: number;
  savingAmount: number;
  discountRate: number;
  createdAt: number;
};

type DiscountHistoryItem = {
  id: string;
  originalPrice: number;
  discountRate: number;
  discountAmount: number;
  priceAfterDiscount: number;
  createdAt: number;
};

/** iOSのtype="number"の二重表示バグを避けるため、数値のみ許可する。全角数字も半角に変換 */
function sanitizeNumericInput(value: string): string {
  const fullToHalf = value.replace(/[０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0)
  );
  const filtered = fullToHalf.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
  return filtered;
}

function formatYen(n: number): string {
  return `${Math.round(n).toLocaleString("ja-JP")}円`;
}

function calcPercent(total: number, target: number): number | null {
  if (total <= 0 || !Number.isFinite(total) || !Number.isFinite(target)) return null;
  return Math.round((target / total) * 100);
}

function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let storageWritePending = false;
let storageWriteTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleStorageWrite(write: () => void): void {
  const run = () => {
    if (storageWritePending) {
      storageWriteTimer = setTimeout(run, 50);
      return;
    }
    storageWritePending = true;
    try {
      write();
    } catch {
      // ignore
    } finally {
      storageWritePending = false;
    }
  };
  if (storageWriteTimer) clearTimeout(storageWriteTimer);
  storageWriteTimer = setTimeout(run, 100);
}

function saveHistory(items: HistoryItem[]): void {
  if (typeof window === "undefined") return;
  scheduleStorageWrite(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  });
}

function loadCompareList(): CompareItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CompareItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadDiscountHistory(): DiscountHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DISCOUNT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DiscountHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDiscountHistory(items: DiscountHistoryItem[]): void {
  if (typeof window === "undefined") return;
  scheduleStorageWrite(() => {
    localStorage.setItem(DISCOUNT_STORAGE_KEY, JSON.stringify(items));
  });
}

function saveCompareList(items: CompareItem[]): void {
  if (typeof window === "undefined") return;
  scheduleStorageWrite(() => {
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(items));
  });
}

function calcDiscount(unitPrice: number, quantity: number, actualPrice: number) {
  const totalNormalPrice = unitPrice * quantity;
  if (totalNormalPrice <= 0 || !Number.isFinite(totalNormalPrice)) return null;
  const savingAmount = Math.round((totalNormalPrice - actualPrice) * 100) / 100;
  const discountRate = totalNormalPrice > 0 ? (savingAmount / totalNormalPrice) * 100 : 0;
  return { totalNormalPrice, savingAmount, discountRate, actualPrice };
}

function useAnimatedValue(target: number, isPercent: boolean, duration = 300) {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = prevRef.current;
    const end = target;
    if (start === end) return;
    prevRef.current = end;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - (1 - t) * (1 - t);
      const v = start + (end - start) * eased;
      setDisplay(v);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return isPercent ? `${Math.round(display)}%` : String(Math.round(display));
}

export default function Home() {
  const [appMode, setAppMode] = useState<AppMode>("percent");
  const [isInverted, setIsInverted] = useState(false);
  const [total, setTotal] = useState<string>("");
  const [target, setTarget] = useState<string>("");
  const [originalPrice, setOriginalPrice] = useState<string>("");
  const [discountRate, setDiscountRate] = useState<string>("");
  const [salePrice, setSalePrice] = useState<string>("");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [secondBagUnitPrice, setSecondBagUnitPrice] = useState<string>("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [discountHistory, setDiscountHistory] = useState<DiscountHistoryItem[]>([]);
  const [compareList, setCompareList] = useState<CompareItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("コピーしました");
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const { isPremium, setPremium, mounted: premiumMounted } = usePremium();
  const [mounted, setMounted] = useState(false);

  const premiumPurchaseUrl = process.env.NEXT_PUBLIC_PREMIUM_PURCHASE_URL;
  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const useStripeCheckout = Boolean(stripePublishableKey);

  useEffect(() => setMounted(true), []);

  // Stripe決済成功時のコールバック
  useEffect(() => {
    if (typeof window === "undefined" || !premiumMounted) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      setPremium(true);
      setPremiumModalOpen(false);
      setToastMessage("Premiumを購入しました");
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2500);
      setTimeout(() => setToastMessage("コピーしました"), 2500);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [premiumMounted, setPremium]);

  const unitPriceNum = parseFloat(unitPrice) || 0;
  const secondBagUnitPriceNum = parseFloat(secondBagUnitPrice) || 0;
  const compareQuantity = 2; // 購入個数は2で固定
  const actualPriceNum =
    unitPriceNum > 0
      ? Math.round(
          (unitPriceNum + (secondBagUnitPriceNum > 0 ? secondBagUnitPriceNum : unitPriceNum)) *
            100
        ) / 100
      : 0;
  const discountResult = calcDiscount(unitPriceNum, compareQuantity, actualPriceNum);

  const totalNum = parseFloat(total) || 0;
  const targetNum = parseFloat(target) || 0;
  const originalPriceNum = parseFloat(originalPrice) || 0;
  const salePriceNum = parseFloat(salePrice) || 0;
  const discountRateFromSale =
    originalPriceNum > 0 && salePriceNum > 0
      ? Math.round(((originalPriceNum - salePriceNum) / originalPriceNum) * 10000) / 100
      : null;
  const discountRateNum =
    discountRateFromSale !== null
      ? Math.min(100, Math.max(0, discountRateFromSale))
      : Math.min(100, Math.max(0, parseFloat(discountRate) || 0));
  const discountAmount =
    originalPriceNum > 0
      ? Math.round(
          (discountRateFromSale !== null
            ? originalPriceNum - salePriceNum
            : originalPriceNum * (discountRateNum / 100)) *
            100
        ) / 100
      : 0;
  const priceAfterDiscount =
    originalPriceNum > 0
      ? Math.round(
          (discountRateFromSale !== null ? salePriceNum : originalPriceNum * (1 - discountRateNum / 100)) * 100
        ) / 100
      : 0;

  const percent = calcPercent(totalNum, targetNum);
  const displayValue = percent ?? 0;
  const displayTarget = isInverted ? 100 - displayValue : displayValue;
  const animatedPercent = useAnimatedValue(displayTarget, true, 350);

  const addToHistory = useCallback(() => {
    if (percent === null || totalNum <= 0) return;
    const item: HistoryItem = {
      id: crypto.randomUUID(),
      total: totalNum,
      target: targetNum,
      percent: isInverted ? 100 - percent : percent,
      isInverted: isInverted || undefined,
      createdAt: Date.now(),
    };
    setHistory((prev) => [item, ...prev].slice(0, 50));
  }, [percent, totalNum, targetNum, isInverted]);

  useEffect(() => {
    setHistory(loadHistory());
    setDiscountHistory(loadDiscountHistory());
    setCompareList(loadCompareList());
  }, []);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  useEffect(() => {
    saveDiscountHistory(discountHistory);
  }, [discountHistory]);

  useEffect(() => {
    saveCompareList(compareList);
  }, [compareList]);

  const handleCopy = useCallback(async () => {
    if (appMode === "compare") {
      if (!discountResult) return;
      const text = `${formatYen(discountResult.savingAmount)} (${discountResult.discountRate.toFixed(1)}%) 安く購入できます`;
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setToastVisible(true);
        setTimeout(() => setCopied(false), 1500);
        setTimeout(() => setToastVisible(false), 2500);
      } catch {
        // fallback
      }
      return;
    }
    if (appMode === "discount") {
      if (originalPriceNum <= 0) return;
      const text = `割引後 ${formatYen(priceAfterDiscount)}（${formatYen(discountAmount)} お得）`;
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setToastVisible(true);
        setTimeout(() => setCopied(false), 1500);
        setTimeout(() => setToastVisible(false), 2500);
      } catch {
        // fallback
      }
      return;
    }
    if (percent === null) return;
    const text = `${percent}%`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setToastVisible(true);
      setTimeout(() => setCopied(false), 1500);
      setTimeout(() => setToastVisible(false), 2500);
    } catch {
      // fallback
    }
  }, [appMode, percent, discountResult, originalPriceNum, priceAfterDiscount, discountAmount]);

  const handleClear = useCallback(() => {
    setTotal("");
    setTarget("");
    setOriginalPrice("");
    setDiscountRate("");
    setSalePrice("");
    setUnitPrice("");
    setSecondBagUnitPrice("");
    setIsInverted(false);
  }, []);

  const addToCompareList = useCallback(() => {
    if (!discountResult || unitPriceNum <= 0) return;
    const item: CompareItem = {
      id: crypto.randomUUID(),
      unitPrice: unitPriceNum,
      quantity: compareQuantity,
      actualPrice: discountResult.actualPrice,
      savingAmount: discountResult.savingAmount,
      discountRate: discountResult.discountRate,
      createdAt: Date.now(),
    };
    setCompareList((prev) => [item, ...prev].slice(0, 50));
  }, [discountResult, unitPriceNum, compareQuantity]);

  const removeFromCompareList = (id: string) => {
    setCompareList((prev) => prev.filter((c) => c.id !== id));
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClear();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleClear]);

  const removeFromHistory = (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const addToDiscountHistory = useCallback(() => {
    if (originalPriceNum <= 0 || (discountRateNum <= 0 && salePriceNum <= 0)) return;
    const item: DiscountHistoryItem = {
      id: crypto.randomUUID(),
      originalPrice: originalPriceNum,
      discountRate: discountRateNum,
      discountAmount,
      priceAfterDiscount,
      createdAt: Date.now(),
    };
    setDiscountHistory((prev) => [item, ...prev].slice(0, 50));
  }, [originalPriceNum, discountRateNum, salePriceNum, discountAmount, priceAfterDiscount]);

  const removeFromDiscountHistory = (id: string) => {
    setDiscountHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const shareDiscountHistoryItem = async (item: DiscountHistoryItem) => {
    const text =
      item.discountAmount >= 0
        ? `(${formatYen(item.originalPrice)} - ${formatYen(item.priceAfterDiscount)}) / ${formatYen(item.originalPrice)} × 100 = ${item.discountRate}%、${formatYen(item.originalPrice)} - ${formatYen(item.priceAfterDiscount)} = ${formatYen(item.discountAmount)}`
        : `${formatYen(item.priceAfterDiscount)} - ${formatYen(item.originalPrice)} = ${formatYen(-item.discountAmount)}（値上げ額）`;
    try {
      await navigator.clipboard.writeText(text);
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2500);
    } catch {
      // ignore
    }
  };

  const shareHistoryItem = async (item: HistoryItem) => {
    const text = item.isInverted
      ? `残り: (${item.total} - ${item.target}) / ${item.total} = ${item.percent}%`
      : `${item.target} は ${item.total} の ${item.percent}% です`;
    try {
      await navigator.clipboard.writeText(text);
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2500);
    } catch {
      // ignore
    }
  };

  const progressValue = percent !== null ? Math.min(100, Math.max(0, percent)) : 0;

  const handleStripeCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "エラーが発生しました");
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3000);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-dvh sm:min-h-screen h-dvh sm:h-auto bg-page text-foreground flex flex-col overflow-hidden sm:overflow-visible">
      {/* Toast */}
      {toastVisible && (
        <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 sm:px-6 sm:py-3 rounded-xl bg-toast text-white font-semibold text-sm sm:text-base shadow-lg shadow-[#ff6b6b]/30 toast-enter">
          {toastMessage}
        </div>
      )}

      <header className="shrink-0 py-2 sm:py-4 px-3 sm:px-4 text-center border-b border-page bg-card/80 backdrop-blur-sm relative">
        {mounted && (
          <>
            <button
              onClick={() => setPremiumModalOpen(true)}
              className={`absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-lg transition-colors ${
                isPremium ? "text-amber-500" : "text-muted hover:text-accent hover:bg-subtle"
              }`}
              aria-label={isPremium ? "Premium" : "Premiumを購入"}
            >
              <Crown size={18} />
            </button>
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-lg text-muted hover:text-accent hover:bg-subtle transition-colors"
              aria-label={resolvedTheme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
            >
              {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </>
        )}
        <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-accent">{APP_NAME}</h1>
        <p className="text-xs sm:text-sm text-muted mt-0.5 sm:mt-1 hidden sm:block">全体と成果を入力して割合を即座に算出</p>
        <p className="text-[10px] sm:text-xs text-muted mt-1 sm:mt-2 opacity-80">Esc: クリア</p>
      </header>

      {premiumMounted && !isPremium && (
        <div className="shrink-0 px-3 sm:px-4 py-2 isolate">
          <AdBanner format="auto" className="max-w-md mx-auto" />
        </div>
      )}

      <main className="flex-1 min-h-0 max-w-md mx-auto w-full px-3 sm:px-4 py-3 sm:py-6 flex flex-col gap-3 sm:gap-6 overflow-y-auto overflow-x-hidden sm:overflow-visible relative z-10">
        {/* App mode toggle: 割合 / セット割 / 割引 */}
        <div className="shrink-0 flex rounded-xl sm:rounded-2xl bg-card p-1 sm:p-1.5 shadow-sm border border-page">
          <button
            onClick={() => setAppMode("percent")}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
              appMode === "percent" ? "bg-accent text-white shadow-md shadow-[#ff6b6b]/30" : "text-muted hover:text-accent hover:bg-subtle"
            }`}
          >
            <Percent size={14} className="sm:w-4 sm:h-4" />
            割合
          </button>
          <button
            onClick={() => setAppMode("compare")}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
              appMode === "compare" ? "bg-accent text-white shadow-md shadow-[#ff6b6b]/30" : "text-muted hover:text-accent hover:bg-subtle"
            }`}
          >
            セット割
          </button>
          <button
            onClick={() => setAppMode("discount")}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
              appMode === "discount" ? "bg-accent text-white shadow-md shadow-[#ff6b6b]/30" : "text-muted hover:text-accent hover:bg-subtle"
            }`}
          >
            <Tag size={14} className="sm:w-4 sm:h-4" />
            割引
          </button>
        </div>

        {appMode === "percent" ? (
          <>
        {/* 割合モード: 全体数・成果数 */}
        <div className="shrink-0 space-y-2 sm:space-y-4">
          <label className="block">
            <span className="text-xs sm:text-sm font-medium text-label">全体数</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={total}
              onChange={(e) => setTotal(sanitizeNumericInput(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="mt-1 sm:mt-2 w-full h-11 sm:h-14 px-3 sm:px-4 text-lg sm:text-xl font-semibold rounded-lg sm:rounded-xl bg-input border border-input text-input-foreground placeholder:text-result-empty focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:border-transparent shadow-sm transition-shadow"
            />
          </label>
          <label className="block">
            <span className="text-xs sm:text-sm font-medium text-label">成果数</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={target}
              onChange={(e) => setTarget(sanitizeNumericInput(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="mt-1 sm:mt-2 w-full h-11 sm:h-14 px-3 sm:px-4 text-lg sm:text-xl font-semibold rounded-lg sm:rounded-xl bg-input border border-input text-input-foreground placeholder:text-result-empty focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:border-transparent shadow-sm transition-shadow"
            />
          </label>
        </div>

        {/* Result display */}
        <div className="shrink-0 flex flex-col items-center justify-center py-3 sm:py-6 relative">
          <div
            key={`${displayValue}-${isInverted}`}
            className={`text-5xl sm:text-6xl md:text-7xl font-bold tabular-nums relative z-10 result-pop ${percent !== null ? (isInverted ? "text-[#22c55e]" : "text-accent") : "text-result-empty"}`}
          >
            {percent !== null ? animatedPercent : "—"}
          </div>
          {percent !== null && totalNum > 0 && (
            <button
              onClick={() => setIsInverted((v) => !v)}
              className={`mt-2 p-2 sm:p-2.5 rounded-lg transition-colors shrink-0 ${isInverted ? "bg-accent/20 text-accent" : "text-muted hover:text-accent hover:bg-subtle"}`}
              aria-label={isInverted ? "割合を表示" : "残り（補数）を表示"}
              title={isInverted ? "割合を表示" : "残り（補数）を表示"}
            >
              <ArrowUpDown size={24} className="sm:w-6 sm:h-6" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="shrink-0 w-full">
          <div className="h-2 sm:h-3 w-full rounded-full bg-progress-track overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300 ease-out shadow-sm"
              style={{ width: `${progressValue}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted mt-1 opacity-80">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Copy button */}
        <button
          onClick={() => handleCopy()}
          disabled={percent === null}
          className="shrink-0 w-full h-11 sm:h-14 flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold bg-accent text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40 transition-all shadow-md shadow-[#ff6b6b]/30"
        >
          {copied ? (
            <>コピーしました</>
          ) : (
            <>
              <Copy size={18} className="sm:w-5 sm:h-5" />
              計算結果をコピー
            </>
          )}
        </button>

        {/* Add to history */}
        {percent !== null && totalNum > 0 && (
            <button
              onClick={addToHistory}
              className="shrink-0 w-full h-10 sm:h-12 flex items-center justify-center rounded-lg sm:rounded-xl text-sm sm:text-base font-medium border-2 border-dashed border-accent/40 text-accent hover:bg-subtle hover:border-accent transition-colors"
            >
              履歴に追加（式を表示）
            </button>
          )}

        {/* History list */}
        {history.length > 0 && (
          <section className="shrink min-h-0 flex flex-col pt-3 sm:pt-6 border-t border-page">
            <h2 className="text-xs sm:text-sm font-semibold text-label mb-2 sm:mb-4 shrink-0">履歴</h2>
            <ul className="space-y-1.5 sm:space-y-2 min-h-0 overflow-y-auto -mr-1 pr-1">
              {history.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 sm:gap-3 py-2 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl bg-card border border-page shadow-sm hover:shadow-md transition-shadow shrink-0"
                >
                  <span className="text-xs sm:text-sm text-label flex-1 min-w-0 overflow-x-auto overflow-y-hidden block pr-1">
                    {item.isInverted ? (
                      <>
                        残り: ({item.total} - {item.target}) / {item.total} ={" "}
                        <span className="text-[#22c55e] font-semibold">{item.percent}%</span>
                      </>
                    ) : (
                      <>
                        {item.target} / {item.total} ={" "}
                        <span className="text-accent font-semibold">{item.percent}%</span>
                      </>
                    )}
                  </span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => shareHistoryItem(item)}
                      className="p-1.5 sm:p-2 rounded-lg text-muted hover:text-accent hover:bg-subtle transition-colors"
                      aria-label="共有"
                    >
                      <Share2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                    <button
                      onClick={() => removeFromHistory(item.id)}
                      className="p-1.5 sm:p-2 rounded-lg text-muted hover:text-accent hover:bg-subtle transition-colors"
                      aria-label="削除"
                    >
                      <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
          </>
        ) : appMode === "discount" ? (
          <>
        <div className="shrink-0 space-y-2 sm:space-y-4">
          <label className="block">
            <span className="text-xs sm:text-sm font-medium text-label">元の価格（円）</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(sanitizeNumericInput(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="mt-1 sm:mt-2 w-full h-11 sm:h-14 px-3 sm:px-4 text-lg sm:text-xl font-semibold rounded-lg sm:rounded-xl bg-input border border-input text-input-foreground placeholder:text-result-empty focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:border-transparent shadow-sm transition-shadow"
            />
          </label>
          <label className="block">
            <span className="text-xs sm:text-sm font-medium text-label">割引率（%）</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={discountRate}
              onChange={(e) => setDiscountRate(sanitizeNumericInput(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="mt-1 sm:mt-2 w-full h-11 sm:h-14 px-3 sm:px-4 text-lg sm:text-xl font-semibold rounded-lg sm:rounded-xl bg-input border border-input text-input-foreground placeholder:text-result-empty focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:border-transparent shadow-sm transition-shadow"
            />
          </label>
          <label className="block">
            <span className="text-xs sm:text-sm font-medium text-label">セール価格（円）</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={salePrice}
              onChange={(e) => setSalePrice(sanitizeNumericInput(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="mt-1 sm:mt-2 w-full h-11 sm:h-14 px-3 sm:px-4 text-lg sm:text-xl font-semibold rounded-lg sm:rounded-xl bg-input border border-input text-input-foreground placeholder:text-result-empty focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:border-transparent shadow-sm transition-shadow"
            />
          </label>
        </div>

        {/* 割引モード 結果 */}
        <div className="shrink-0 rounded-lg sm:rounded-xl bg-card border border-page shadow-sm overflow-hidden">
          {originalPriceNum > 0 && (discountRateNum > 0 || salePriceNum > 0) ? (
            <ul className="divide-y divide-[var(--border)]">
              <li className="flex justify-between items-center gap-3 py-3 px-4">
                <span className="text-sm text-muted">割引率</span>
                <span className="text-base sm:text-lg font-semibold text-foreground tabular-nums">
                  {discountRateNum}%
                </span>
              </li>
              <li className="flex justify-between items-center gap-3 py-3 px-4">
                <span className="text-sm text-muted">割引額</span>
                <span
                  className={`text-base sm:text-lg font-bold tabular-nums ${discountAmount >= 0 ? "text-[#22c55e]" : "text-accent"}`}
                >
                  {discountAmount >= 0 ? `-${formatYen(discountAmount)}` : `+${formatYen(-discountAmount)}`}
                </span>
              </li>
              <li className="flex justify-between items-center gap-3 py-3 px-4">
                <span className="text-sm text-muted">割引後の価格</span>
                <span className="text-base sm:text-lg font-semibold text-foreground tabular-nums">
                  {formatYen(priceAfterDiscount)}
                </span>
              </li>
            </ul>
          ) : (
            <div className="py-8 text-center">
              <p className="text-result-empty text-lg">元の価格と割引率、またはセール価格を入力</p>
            </div>
          )}
        </div>

        <button
          onClick={() => handleCopy()}
          disabled={originalPriceNum <= 0 || (discountRateNum <= 0 && salePriceNum <= 0)}
          className="shrink-0 w-full h-11 sm:h-14 flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold bg-accent text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40 transition-all shadow-md shadow-[#ff6b6b]/30"
        >
          <Copy size={18} className="sm:w-5 sm:h-5" />
          結果をコピー
        </button>

        {originalPriceNum > 0 && (discountRateNum > 0 || salePriceNum > 0) && (
          <button
            onClick={addToDiscountHistory}
            className="shrink-0 w-full h-10 sm:h-12 flex items-center justify-center rounded-lg sm:rounded-xl text-sm sm:text-base font-medium border-2 border-dashed border-accent/40 text-accent hover:bg-subtle hover:border-accent transition-colors"
          >
            履歴に追加（式を表示）
          </button>
        )}

        {discountHistory.length > 0 && (
          <section className="shrink min-h-0 flex flex-col pt-3 sm:pt-6 border-t border-page">
            <h2 className="text-xs sm:text-sm font-semibold text-label mb-2 sm:mb-4 shrink-0">履歴</h2>
            <ul className="space-y-1.5 sm:space-y-2 min-h-0 overflow-y-auto -mr-1 pr-1">
              {discountHistory.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 sm:gap-3 py-2 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl bg-card border border-page shadow-sm hover:shadow-md transition-shadow shrink-0"
                >
                  <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden pr-1">
                    {item.discountAmount >= 0 ? (
                      <>
                        <span className="text-xs sm:text-sm text-label block whitespace-nowrap">
                          ({formatYen(item.originalPrice)} - {formatYen(item.priceAfterDiscount)}) /{" "}
                          {formatYen(item.originalPrice)} × 100 = {item.discountRate}%（割引率）
                        </span>
                        <span className="text-xs sm:text-sm text-label block whitespace-nowrap">
                          {formatYen(item.originalPrice)} - {formatYen(item.priceAfterDiscount)} ={" "}
                          {formatYen(item.discountAmount)}（割引額）
                        </span>
                        <span className="text-sm sm:text-base font-bold text-[#22c55e] block mt-0.5">
                          {formatYen(item.discountAmount)} ({item.discountRate}%OFF) お得
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs sm:text-sm text-label block whitespace-nowrap">
                          {formatYen(item.priceAfterDiscount)} - {formatYen(item.originalPrice)} ={" "}
                          {formatYen(-item.discountAmount)}（値上げ額）
                        </span>
                        <span className="text-sm sm:text-base font-bold text-accent block mt-0.5">
                          +{formatYen(-item.discountAmount)}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => shareDiscountHistoryItem(item)}
                      className="p-1.5 sm:p-2 rounded-lg text-muted hover:text-accent hover:bg-subtle transition-colors"
                      aria-label="共有"
                    >
                      <Share2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                    <button
                      onClick={() => removeFromDiscountHistory(item.id)}
                      className="p-1.5 sm:p-2 rounded-lg text-muted hover:text-accent hover:bg-subtle transition-colors"
                      aria-label="削除"
                    >
                      <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
          </>
        ) : (
          /* セット割モード */
          <>
        <div className="shrink-0 space-y-2 sm:space-y-4">
          <label className="block">
            <span className="text-xs sm:text-sm font-medium text-label">通常時の単価（円）</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={unitPrice}
              onChange={(e) => setUnitPrice(sanitizeNumericInput(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="mt-1 sm:mt-2 w-full h-11 sm:h-14 px-3 sm:px-4 text-lg sm:text-xl font-semibold rounded-lg sm:rounded-xl bg-input border border-input text-input-foreground placeholder:text-result-empty focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:border-transparent shadow-sm transition-shadow"
            />
          </label>
          <label className="block">
            <span className="text-xs sm:text-sm font-medium text-label">2袋目の単価（円）</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={secondBagUnitPrice}
              onChange={(e) => setSecondBagUnitPrice(sanitizeNumericInput(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="mt-1 sm:mt-2 w-full h-11 sm:h-14 px-3 sm:px-4 text-lg sm:text-xl font-semibold rounded-lg sm:rounded-xl bg-input border border-input text-input-foreground placeholder:text-result-empty focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:border-transparent shadow-sm transition-shadow"
            />
          </label>
        </div>

        {/* 比較モード結果 */}
        <div className="shrink-0 rounded-lg sm:rounded-xl bg-card border border-page shadow-sm overflow-hidden">
          {unitPriceNum > 0 ? (
            <ul className="divide-y divide-[var(--border)]">
              <li className="flex justify-between items-center gap-3 py-3 px-4">
                <span className="text-sm text-muted">通常の合計金額</span>
                <span className="text-base sm:text-lg font-semibold text-foreground tabular-nums">
                  {formatYen(unitPriceNum * compareQuantity)}
                </span>
              </li>
              <li className="flex justify-between items-center gap-3 py-3 px-4">
                <span className="text-sm text-muted">実際の支払い合計</span>
                <span className="text-base sm:text-lg font-semibold text-foreground tabular-nums">
                  {formatYen(actualPriceNum)}
                </span>
              </li>
              <li className="flex justify-between items-center gap-3 py-3 px-4">
                <span className="text-sm text-muted">差額（割引率）</span>
                <span className={`text-base sm:text-lg font-bold tabular-nums ${(discountResult?.savingAmount ?? 0) > 0 ? "text-[#22c55e]" : (discountResult?.savingAmount ?? 0) < 0 ? "text-accent" : "text-foreground"}`}>
                  {(() => {
                    const s = discountResult?.savingAmount ?? 0;
                    return s > 0 ? `-${formatYen(s)}` : s < 0 ? `+${formatYen(-s)}` : formatYen(0);
                  })()}
                  （{(discountResult?.discountRate ?? 0).toFixed(1)}%）
                </span>
              </li>
            </ul>
          ) : (
            <div className="py-8 text-center">
              <p className="text-result-empty text-lg">通常時の単価と2袋目の単価を入力</p>
            </div>
          )}
        </div>

        {/* 比較モード コピー・追加 */}
        <button
          onClick={() => handleCopy()}
          disabled={!discountResult || unitPriceNum <= 0 || discountResult.savingAmount <= 0}
          className="shrink-0 w-full h-11 sm:h-14 flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold bg-accent text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[#ff6b6b]/30"
        >
          <Copy size={18} className="sm:w-5 sm:h-5" />
          結果をコピー
        </button>

        {discountResult && unitPriceNum > 0 && discountResult.savingAmount > 0 && (
          <button
            onClick={addToCompareList}
            className="shrink-0 w-full h-10 sm:h-12 flex items-center justify-center rounded-lg sm:rounded-xl text-sm sm:text-base font-medium border-2 border-dashed border-accent/40 text-accent hover:bg-subtle hover:border-accent transition-colors"
          >
            リストに追加（式を表示）
          </button>
        )}

        {/* 比較リスト（プレイリスト風） */}
        {compareList.length > 0 && (
          <section className="shrink min-h-0 flex flex-col pt-3 sm:pt-6 border-t border-page">
            <h2 className="text-xs sm:text-sm font-semibold text-label mb-2 sm:mb-4 shrink-0">比較リスト</h2>
            <ul className="space-y-1.5 sm:space-y-2 min-h-0 overflow-y-auto -mr-1 pr-1">
              {compareList.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 sm:gap-3 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl bg-card border border-page shadow-sm hover:shadow-md transition-shadow shrink-0"
                >
                  <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden pr-1">
                    <span className="text-xs sm:text-sm text-label block whitespace-nowrap">
                      {formatYen(item.unitPrice)} + {formatYen(item.actualPrice - item.unitPrice)} ={" "}
                      {formatYen(item.actualPrice)}（1袋目+2袋目）
                    </span>
                    <span className="text-xs sm:text-sm text-label block whitespace-nowrap">
                      {formatYen(item.unitPrice * item.quantity)} - {formatYen(item.actualPrice)} ={" "}
                      {formatYen(item.savingAmount)}（差額）
                    </span>
                    <span className="text-xs sm:text-sm text-label block whitespace-nowrap">
                      {formatYen(item.savingAmount)} / {formatYen(item.unitPrice * item.quantity)} × 100 ={" "}
                      {item.discountRate.toFixed(1)}%（割引率）
                    </span>
                    <span className="text-sm sm:text-base font-bold text-[#22c55e] block mt-0.5">
                      {formatYen(item.savingAmount)} ({item.discountRate.toFixed(1)}%) お得
                    </span>
                  </div>
                  <button
                    onClick={() => removeFromCompareList(item.id)}
                    className="p-1.5 sm:p-2 rounded-lg text-muted hover:text-accent hover:bg-subtle transition-colors shrink-0"
                    aria-label="削除"
                  >
                    <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
          </>
        )}
      </main>

      {premiumMounted && !isPremium && (
        <div className="shrink-0 px-3 sm:px-4 py-3 border-t border-page isolate">
          <AdBanner format="auto" className="max-w-md mx-auto" />
        </div>
      )}

      <footer className="shrink-0 px-3 sm:px-4 py-4 border-t border-page">
        <div className="max-w-md mx-auto flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted">
          <a href="/privacy" className="hover:text-accent">プライバシーポリシー</a>
          <a href="/terms" className="hover:text-accent">利用規約</a>
          <a href="/tokushoho" className="hover:text-accent">特定商取引法に基づく表記</a>
          <a href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@qp-lime.vercel.app"}`} className="hover:text-accent">お問い合わせ</a>
        </div>
      </footer>

      {premiumModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setPremiumModalOpen(false)}>
          <div
            className="bg-card border border-page rounded-xl shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Crown className="text-amber-500" size={24} />
                Premium
              </h2>
              <button
                onClick={() => setPremiumModalOpen(false)}
                className="p-2 rounded-lg text-muted hover:bg-subtle"
                aria-label="閉じる"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-muted mb-4">
              広告を非表示にして、快適にご利用いただけます。買い切りで永続的に有効です。
            </p>
            <p className="text-2xl font-bold text-accent mb-6">100円</p>
            {isPremium ? (
              <div className="space-y-3">
                <p className="text-sm text-[#22c55e] font-medium">ご購入済みです</p>
                <button
                  onClick={() => {
                    setPremium(false);
                    setPremiumModalOpen(false);
                    setToastMessage("Premiumをリセットしました");
                    setToastVisible(true);
                    setTimeout(() => {
                      setToastVisible(false);
                      setToastMessage("コピーしました");
                    }, 2500);
                  }}
                  className="text-xs text-muted hover:text-foreground underline"
                >
                  購入をやり直す（リセット）
                </button>
              </div>
            ) : useStripeCheckout ? (
              <button
                onClick={handleStripeCheckout}
                disabled={checkoutLoading}
                className="w-full py-3 rounded-xl font-semibold bg-accent text-white hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {checkoutLoading ? "処理中..." : "プレミアムプランを試す"}
              </button>
            ) : premiumPurchaseUrl ? (
              <a
                href={premiumPurchaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 text-center rounded-xl font-semibold bg-accent text-white hover:opacity-90"
              >
                購入する
              </a>
            ) : (
              <button
                onClick={() => {
                  setPremium(true);
                  setPremiumModalOpen(false);
                  setToastMessage("Premiumを購入しました");
                  setToastVisible(true);
                  setTimeout(() => {
                    setToastVisible(false);
                    setToastMessage("コピーしました");
                  }, 2500);
                }}
                className="w-full py-3 rounded-xl font-semibold bg-accent text-white hover:opacity-90"
              >
                購入する（デモ）
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
