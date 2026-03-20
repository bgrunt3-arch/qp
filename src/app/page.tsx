"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { Copy, Trash2, Share2, Sun, Moon, Percent, Tag } from "lucide-react";

const STORAGE_KEY = "percent-quick-history";
const COMPARE_STORAGE_KEY = "percent-quick-compare";
const APP_NAME = "QuickPercent";

type AppMode = "percent" | "compare" | "discount";

type HistoryItem = {
  id: string;
  total: number;
  target: number;
  percent: number;
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

const QUICK_PRESETS = [25, 50, 75, 100] as const;

/** iOSのtype="number"の二重表示バグを避けるため、数値のみ許可する */
function sanitizeNumericInput(value: string): string {
  const filtered = value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
  return filtered;
}

function formatYen(n: number): string {
  return `${Math.round(n).toLocaleString("ja-JP")}円`;
}

function calcPercent(total: number, target: number): number | null {
  if (total <= 0 || !Number.isFinite(total) || !Number.isFinite(target)) return null;
  return Math.round((target / total) * 10000) / 100;
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

  return isPercent ? `${Math.round(display * 100) / 100}%` : String(Math.round(display * 100) / 100);
}

export default function Home() {
  const [appMode, setAppMode] = useState<AppMode>("percent");
  const [total, setTotal] = useState<string>("");
  const [target, setTarget] = useState<string>("");
  const [originalPrice, setOriginalPrice] = useState<string>("");
  const [discountRate, setDiscountRate] = useState<string>("");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [secondBagUnitPrice, setSecondBagUnitPrice] = useState<string>("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [compareList, setCompareList] = useState<CompareItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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
  const discountRateNum = Math.min(100, Math.max(0, parseFloat(discountRate) || 0));
  const discountAmount = originalPriceNum > 0 ? Math.round(originalPriceNum * (discountRateNum / 100) * 100) / 100 : 0;
  const priceAfterDiscount = originalPriceNum > 0 ? Math.round(originalPriceNum * (1 - discountRateNum / 100) * 100) / 100 : 0;

  const percent = calcPercent(totalNum, targetNum);
  const displayValue = percent ?? 0;
  const animatedPercent = useAnimatedValue(displayValue, true, 350);

  const addToHistory = useCallback(() => {
    if (percent === null || totalNum <= 0) return;
    const item: HistoryItem = {
      id: crypto.randomUUID(),
      total: totalNum,
      target: targetNum,
      percent,
      createdAt: Date.now(),
    };
    setHistory((prev) => [item, ...prev].slice(0, 50));
  }, [percent, totalNum, targetNum]);

  useEffect(() => {
    setHistory(loadHistory());
    setCompareList(loadCompareList());
  }, []);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

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
    setUnitPrice("");
    setSecondBagUnitPrice("");
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

  const shareHistoryItem = async (item: HistoryItem) => {
    const text = `${item.target} は ${item.total} の ${item.percent}% です`;
    try {
      await navigator.clipboard.writeText(text);
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2500);
    } catch {
      // ignore
    }
  };

  const progressValue = percent !== null ? Math.min(100, Math.max(0, percent)) : 0;

  return (
    <div className="min-h-dvh sm:min-h-screen h-dvh sm:h-auto bg-page text-foreground flex flex-col overflow-hidden sm:overflow-visible">
      {/* Toast */}
      {toastVisible && (
        <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 sm:px-6 sm:py-3 rounded-xl bg-toast text-white font-semibold text-sm sm:text-base shadow-lg shadow-[#ff6b6b]/30 toast-enter">
          コピーしました
        </div>
      )}

      <header className="shrink-0 py-2 sm:py-4 px-3 sm:px-4 text-center border-b border-page bg-card/80 backdrop-blur-sm relative">
        {mounted && (
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-lg text-muted hover:text-accent hover:bg-subtle transition-colors"
            aria-label={resolvedTheme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
          >
            {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}
        <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-accent">{APP_NAME}</h1>
        <p className="text-xs sm:text-sm text-muted mt-0.5 sm:mt-1 hidden sm:block">全体と成果を入力して割合を即座に算出</p>
        <p className="text-[10px] sm:text-xs text-muted mt-1 sm:mt-2 opacity-80">Esc: クリア</p>
      </header>

      <main className="flex-1 min-h-0 max-w-md mx-auto w-full px-3 sm:px-4 py-3 sm:py-6 flex flex-col gap-3 sm:gap-6 overflow-hidden sm:overflow-visible">
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
            key={displayValue}
            className={`text-5xl sm:text-6xl md:text-7xl font-bold tabular-nums relative z-10 result-pop ${percent !== null ? "text-accent" : "text-result-empty"}`}
          >
            {percent !== null ? animatedPercent : "—"}
          </div>
          {percent !== null && totalNum > 0 && (
            <p className="text-muted mt-2 text-sm relative z-10">
              {targetNum} / {totalNum}
            </p>
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
              履歴に追加
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
                  <span className="text-xs sm:text-sm text-label truncate flex-1 min-w-0">
                    {item.target} / {item.total} ={" "}
                    <span className="text-accent font-semibold">{item.percent}%</span>
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
              placeholder="0"
              value={discountRate}
              onChange={(e) => setDiscountRate(sanitizeNumericInput(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="mt-1 sm:mt-2 w-full h-11 sm:h-14 px-3 sm:px-4 text-lg sm:text-xl font-semibold rounded-lg sm:rounded-xl bg-input border border-input text-input-foreground placeholder:text-result-empty focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:border-transparent shadow-sm transition-shadow"
            />
          </label>
        </div>

        {/* 割引モード クイックプリセット */}
        {originalPriceNum > 0 && (
          <div className="shrink-0 flex gap-1.5 sm:gap-2">
            {QUICK_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setDiscountRate(String(p))}
                className="flex-1 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold bg-card text-muted border border-page hover:border-accent hover:text-accent hover:bg-subtle transition-colors shadow-sm"
              >
                {p}%
              </button>
            ))}
          </div>
        )}

        {/* 割引モード 結果 */}
        <div className="shrink-0 rounded-lg sm:rounded-xl bg-card border border-page shadow-sm overflow-hidden">
          {originalPriceNum > 0 ? (
            <ul className="divide-y divide-[var(--border)]">
              <li className="flex justify-between items-center gap-3 py-3 px-4">
                <span className="text-sm text-muted">割引率</span>
                <span className="text-base sm:text-lg font-semibold text-foreground tabular-nums">
                  {discountRateNum}%
                </span>
              </li>
              <li className="flex justify-between items-center gap-3 py-3 px-4">
                <span className="text-sm text-muted">割引額</span>
                <span className="text-base sm:text-lg font-bold text-[#22c55e] tabular-nums">
                  -{formatYen(discountAmount)}
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
              <p className="text-result-empty text-lg">元の価格を入力</p>
            </div>
          )}
        </div>

        <button
          onClick={() => handleCopy()}
          disabled={originalPriceNum <= 0}
          className="shrink-0 w-full h-11 sm:h-14 flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold bg-accent text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40 transition-all shadow-md shadow-[#ff6b6b]/30"
        >
          <Copy size={18} className="sm:w-5 sm:h-5" />
          結果をコピー
        </button>
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
            リストに追加
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
                  <div className="flex-1 min-w-0">
                    <span className="text-xs sm:text-sm text-label block truncate">
                      {item.quantity}個 × {formatYen(item.unitPrice)} → {formatYen(item.actualPrice)}
                    </span>
                    <span className="text-sm sm:text-base font-bold text-[#22c55e]">
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
    </div>
  );
}
