"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { Copy, Trash2, ArrowRightLeft, Share2, Sun, Moon } from "lucide-react";

const STORAGE_KEY = "percent-quick-history";
const APP_NAME = "QuickPercent";

type HistoryItem = {
  id: string;
  total: number;
  target: number;
  percent: number;
  createdAt: number;
};

type Mode = "normal" | "reverse";

const QUICK_PRESETS = [25, 50, 75, 100] as const;

function calcPercent(total: number, target: number): number | null {
  if (total <= 0 || !Number.isFinite(total) || !Number.isFinite(target)) return null;
  return Math.round((target / total) * 10000) / 100;
}

function calcTargetFromPercent(total: number, percent: number): number | null {
  if (total <= 0 || !Number.isFinite(total) || !Number.isFinite(percent)) return null;
  return Math.round((total * (percent / 100)) * 100) / 100;
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
  const [mode, setMode] = useState<Mode>("normal");
  const [total, setTotal] = useState<string>("");
  const [target, setTarget] = useState<string>("");
  const [percentInput, setPercentInput] = useState<string>("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const totalNum = parseFloat(total) || 0;
  const targetNum = parseFloat(target) || 0;
  const percentInputNum = parseFloat(percentInput) || 0;

  const percent = mode === "normal" ? calcPercent(totalNum, targetNum) : percentInputNum;
  const reverseTarget = mode === "reverse" ? calcTargetFromPercent(totalNum, percentInputNum) : null;

  const displayValue = mode === "normal" ? (percent ?? 0) : (reverseTarget ?? 0);
  const animatedPercent = useAnimatedValue(displayValue, mode === "normal", 350);
  const animatedTarget = useAnimatedValue(displayValue, false, 350);

  const addToHistory = useCallback(() => {
    if (mode === "normal") {
      if (percent === null || totalNum <= 0) return;
      const item: HistoryItem = {
        id: crypto.randomUUID(),
        total: totalNum,
        target: targetNum,
        percent,
        createdAt: Date.now(),
      };
      setHistory((prev) => [item, ...prev].slice(0, 50));
    } else {
      if (reverseTarget === null || totalNum <= 0) return;
      const item: HistoryItem = {
        id: crypto.randomUUID(),
        total: totalNum,
        target: reverseTarget,
        percent: percentInputNum,
        createdAt: Date.now(),
      };
      setHistory((prev) => [item, ...prev].slice(0, 50));
    }
  }, [mode, percent, totalNum, targetNum, percentInputNum, reverseTarget]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const handleCopy = useCallback(async () => {
    if (mode === "normal") {
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
    } else {
      if (reverseTarget === null) return;
      const text = String(reverseTarget);
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setToastVisible(true);
        setTimeout(() => setCopied(false), 1500);
        setTimeout(() => setToastVisible(false), 2500);
      } catch {
        // fallback
      }
    }
  }, [mode, percent, reverseTarget]);

  const handleClear = useCallback(() => {
    setTotal("");
    setTarget("");
    setPercentInput("");
  }, []);

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

  const applyPreset = (p: number) => {
    if (mode === "normal" && totalNum > 0) {
      const val = Math.round((totalNum * p) / 100 * 100) / 100;
      setTarget(String(val));
    } else if (mode === "reverse") {
      setPercentInput(String(p));
    }
  };

  const progressValue =
    mode === "normal"
      ? percent !== null
        ? Math.min(100, Math.max(0, percent))
        : 0
      : Math.min(100, Math.max(0, percentInputNum));

  return (
    <div className="min-h-dvh sm:min-h-screen h-dvh sm:h-auto bg-page text-page flex flex-col overflow-hidden sm:overflow-visible">
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
        {/* Mode toggle */}
        <div className="shrink-0 flex rounded-xl sm:rounded-2xl bg-card p-1 sm:p-1.5 shadow-sm border border-page">
          <button
            onClick={() => setMode("normal")}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold transition-all duration-200 ${
              mode === "normal" ? "bg-accent text-white shadow-md shadow-[#ff6b6b]/30" : "text-muted hover:text-accent hover:bg-subtle"
            }`}
          >
            通常
          </button>
          <button
            onClick={() => setMode("reverse")}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold transition-all duration-200 ${
              mode === "reverse" ? "bg-accent text-white shadow-md shadow-[#ff6b6b]/30" : "text-muted hover:text-accent hover:bg-subtle"
            }`}
          >
            <ArrowRightLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
            逆算
          </button>
        </div>

        {/* Input fields */}
        <div className="shrink-0 space-y-2 sm:space-y-4">
          <label className="block">
            <span className="text-xs sm:text-sm font-medium text-label">全体数</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="mt-1 sm:mt-2 w-full h-11 sm:h-14 px-3 sm:px-4 text-lg sm:text-xl font-semibold rounded-lg sm:rounded-xl bg-input border border-input text-page placeholder:text-result-empty focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:border-transparent shadow-sm transition-shadow"
            />
          </label>
          {mode === "normal" ? (
            <label className="block">
              <span className="text-xs sm:text-sm font-medium text-label">成果数</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                className="mt-1 sm:mt-2 w-full h-11 sm:h-14 px-3 sm:px-4 text-lg sm:text-xl font-semibold rounded-lg sm:rounded-xl bg-input border border-input text-page placeholder:text-result-empty focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:border-transparent shadow-sm transition-shadow"
              />
            </label>
          ) : (
            <label className="block">
              <span className="text-xs sm:text-sm font-medium text-label">目標%</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={percentInput}
                onChange={(e) => setPercentInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                className="mt-1 sm:mt-2 w-full h-11 sm:h-14 px-3 sm:px-4 text-lg sm:text-xl font-semibold rounded-lg sm:rounded-xl bg-input border border-input text-page placeholder:text-result-empty focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:border-transparent shadow-sm transition-shadow"
              />
            </label>
          )}
        </div>

        {/* クイックプリセット */}
        {totalNum > 0 && (
          <div className="shrink-0 flex gap-1.5 sm:gap-2">
            {QUICK_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => applyPreset(p)}
                className="flex-1 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold bg-card text-muted border border-page hover:border-accent hover:text-accent hover:bg-subtle transition-colors shadow-sm"
              >
                {p}%
              </button>
            ))}
          </div>
        )}

        {/* Result display */}
        <div className="shrink-0 flex flex-col items-center justify-center py-3 sm:py-6 relative">
          {mode === "normal" ? (
            <>
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
            </>
          ) : (
            <>
              <p className="text-sm text-muted mb-1 relative z-10">必要な成果数</p>
              <div
                key={displayValue}
                className={`text-5xl sm:text-6xl md:text-7xl font-bold tabular-nums relative z-10 result-pop ${reverseTarget !== null ? "text-accent" : "text-result-empty"}`}
              >
                {reverseTarget !== null ? animatedTarget : "—"}
              </div>
              {reverseTarget !== null && totalNum > 0 && (
                <p className="text-muted mt-2 text-sm relative z-10">
                  {totalNum} の {percentInputNum}%
                </p>
              )}
            </>
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
          disabled={mode === "normal" ? percent === null : reverseTarget === null}
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
        {((mode === "normal" && percent !== null) || (mode === "reverse" && reverseTarget !== null)) &&
          totalNum > 0 && (
            <button
              onClick={addToHistory}
              className="shrink-0 w-full h-10 sm:h-12 flex items-center justify-center rounded-lg sm:rounded-xl text-sm sm:text-base font-medium border-2 border-dashed border-accent/40 text-accent hover:bg-subtle hover:border-accent transition-colors"
            >
              履歴に追加
            </button>
          )}

        {/* History list - 共有ボタン付き */}
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
      </main>
    </div>
  );
}
