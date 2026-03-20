"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Copy, Trash2, ArrowRightLeft, Share2 } from "lucide-react";

const STORAGE_KEY = "percent-quick-history";
const LAST_VALUES_KEY = "percent-quick-last";
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

const TEMPLATES = [
  { id: "goal", label: "目標達成率", total: 100, target: 50 },
  { id: "progress", label: "進捗率", total: 10, target: 7 },
  { id: "sales", label: "売上達成率", total: 1000000, target: 750000 },
] as const;

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

type LastValues = { mode: Mode; total: string; target: string; percentInput: string };

function loadLastValues(): Partial<LastValues> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_VALUES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const p = parsed as Record<string, unknown>;
    return {
      mode: p.mode === "normal" || p.mode === "reverse" ? p.mode : undefined,
      total: typeof p.total === "string" ? p.total : undefined,
      target: typeof p.target === "string" ? p.target : undefined,
      percentInput: typeof p.percentInput === "string" ? p.percentInput : undefined,
    };
  } catch {
    return null;
  }
}

function saveLastValues(values: LastValues): void {
  if (typeof window === "undefined") return;
  scheduleStorageWrite(() => {
    localStorage.setItem(LAST_VALUES_KEY, JSON.stringify(values));
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
    const last = loadLastValues();
    if (last) {
      if (last.mode) setMode(last.mode);
      if (last.total !== undefined) setTotal(last.total);
      if (last.target !== undefined) setTarget(last.target);
      if (last.percentInput !== undefined) setPercentInput(last.percentInput);
    }
  }, []);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  useEffect(() => {
    saveLastValues({ mode, total, target, percentInput });
  }, [mode, total, target, percentInput]);

  const handleCopy = useCallback(async () => {
    if (mode === "normal") {
      if (percent === null) return;
      const text = `${targetNum} は ${totalNum} の ${percent}% です`;
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
      const text = `${reverseTarget} は ${totalNum} の ${percentInputNum}% です`;
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
  }, [mode, percent, totalNum, targetNum, percentInputNum, reverseTarget]);

  const handleClear = useCallback(() => {
    setTotal("");
    setTarget("");
    setPercentInput("");
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.repeat) {
        e.preventDefault();
        if (mode === "normal" ? percent !== null : reverseTarget !== null) handleCopy();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        handleClear();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleCopy, handleClear, mode, percent, reverseTarget]);

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

  const applyTemplate = (t: (typeof TEMPLATES)[number]) => {
    setTotal(String(t.total));
    setTarget(String(t.target));
    setMode("normal");
  };

  const progressValue =
    mode === "normal"
      ? percent !== null
        ? Math.min(100, Math.max(0, percent))
        : 0
      : Math.min(100, Math.max(0, percentInputNum));

  const sliderMax = mode === "normal" && totalNum > 0 ? totalNum : 100;
  const sliderValue = mode === "normal" ? targetNum : percentInputNum;
  const showSlider = mode === "normal" ? totalNum > 0 : true;

  return (
    <div className="min-h-screen bg-[#fffbf5] text-[#2d3748] flex flex-col">
      {/* Toast */}
      {toastVisible && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-[#ff6b6b] text-white font-semibold shadow-lg shadow-[#ff6b6b]/30 toast-enter">
          コピーしました
        </div>
      )}

      <header className="py-6 px-4 text-center border-b border-[#f0e6dc] bg-white/80 backdrop-blur-sm">
        <h1 className="text-2xl font-bold tracking-tight text-[#ff6b6b]">{APP_NAME}</h1>
        <p className="text-sm text-[#718096] mt-1">全体と成果を入力して割合を即座に算出</p>
        <p className="text-xs text-[#a0aec0] mt-2">Enter: コピー / Esc: クリア</p>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-8 flex flex-col gap-8">
        {/* Mode toggle */}
        <div className="flex rounded-2xl bg-white p-1.5 shadow-sm border border-[#f0e6dc]">
          <button
            onClick={() => setMode("normal")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all duration-200 ${
              mode === "normal" ? "bg-[#ff6b6b] text-white shadow-md shadow-[#ff6b6b]/30" : "text-[#718096] hover:text-[#ff6b6b] hover:bg-[#fff5f5]"
            }`}
          >
            通常
          </button>
          <button
            onClick={() => setMode("reverse")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all duration-200 ${
              mode === "reverse" ? "bg-[#ff6b6b] text-white shadow-md shadow-[#ff6b6b]/30" : "text-[#718096] hover:text-[#ff6b6b] hover:bg-[#fff5f5]"
            }`}
          >
            <ArrowRightLeft size={18} />
            逆算
          </button>
        </div>

        {/* 用途別テンプレート */}
        <div>
          <span className="text-xs text-[#718096] block mb-2">用途別テンプレート</span>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t)}
                className="px-3 py-1.5 rounded-xl text-sm font-medium bg-white text-[#718096] border border-[#f0e6dc] hover:border-[#ff6b6b] hover:text-[#ff6b6b] hover:bg-[#fff5f5] transition-colors shadow-sm"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input fields */}
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-[#4a5568]">全体数</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="mt-2 w-full h-14 px-4 text-xl font-semibold rounded-xl bg-white border border-[#f0e6dc] text-[#2d3748] placeholder:text-[#cbd5e0] focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:border-transparent shadow-sm transition-shadow"
            />
          </label>
          {mode === "normal" ? (
            <label className="block">
              <span className="text-sm font-medium text-[#4a5568]">成果数</span>
              <div className="flex gap-3 mt-2">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="flex-1 h-14 px-4 text-xl font-semibold rounded-xl bg-white border border-[#f0e6dc] text-[#2d3748] placeholder:text-[#cbd5e0] focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:border-transparent shadow-sm transition-shadow"
                />
                {showSlider && (
                  <input
                    type="range"
                    min={0}
                    max={sliderMax}
                    step={sliderMax > 1000 ? sliderMax / 100 : 1}
                    value={Math.min(sliderValue, sliderMax)}
                    onChange={(e) => setTarget(e.target.value)}
                    className="w-24 self-center accent-[#ff6b6b]"
                  />
                )}
              </div>
            </label>
          ) : (
            <label className="block">
              <span className="text-sm font-medium text-[#4a5568]">目標%</span>
              <div className="flex gap-3 mt-2">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={percentInput}
                  onChange={(e) => setPercentInput(e.target.value)}
                  className="flex-1 h-14 px-4 text-xl font-semibold rounded-xl bg-white border border-[#f0e6dc] text-[#2d3748] placeholder:text-[#cbd5e0] focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:border-transparent shadow-sm transition-shadow"
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.5}
                  value={Math.min(percentInputNum, 100)}
                  onChange={(e) => setPercentInput(e.target.value)}
                  className="w-24 self-center accent-[#ff6b6b]"
                />
              </div>
            </label>
          )}
        </div>

        {/* クイックプリセット */}
        {totalNum > 0 && (
          <div className="flex gap-2">
            {QUICK_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => applyPreset(p)}
                className="flex-1 py-2.5 rounded-xl font-semibold bg-white text-[#718096] border border-[#f0e6dc] hover:border-[#ff6b6b] hover:text-[#ff6b6b] hover:bg-[#fff5f5] transition-colors shadow-sm"
              >
                {p}%
              </button>
            ))}
          </div>
        )}

        {/* Result display */}
        <div className="flex flex-col items-center justify-center py-8 relative">
          {mode === "normal" ? (
            <>
              <div
                key={displayValue}
                className={`text-6xl sm:text-7xl font-bold tabular-nums relative z-10 result-pop ${percent !== null ? "text-[#ff6b6b]" : "text-[#cbd5e0]"}`}
              >
                {percent !== null ? animatedPercent : "—"}
              </div>
              {percent !== null && totalNum > 0 && (
                <p className="text-[#718096] mt-2 text-sm relative z-10">
                  {targetNum} / {totalNum}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-[#718096] mb-1 relative z-10">必要な成果数</p>
              <div
                key={displayValue}
                className={`text-6xl sm:text-7xl font-bold tabular-nums relative z-10 result-pop ${reverseTarget !== null ? "text-[#ff6b6b]" : "text-[#cbd5e0]"}`}
              >
                {reverseTarget !== null ? animatedTarget : "—"}
              </div>
              {reverseTarget !== null && totalNum > 0 && (
                <p className="text-[#718096] mt-2 text-sm relative z-10">
                  {totalNum} の {percentInputNum}%
                </p>
              )}
            </>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full">
          <div className="h-3 w-full rounded-full bg-[#f0e6dc] overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-[#ff6b6b] transition-all duration-300 ease-out shadow-sm"
              style={{ width: `${progressValue}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[#a0aec0] mt-1">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Copy button */}
        <button
          onClick={() => handleCopy()}
          disabled={mode === "normal" ? percent === null : reverseTarget === null}
          className="w-full h-14 flex items-center justify-center gap-2 rounded-xl font-semibold bg-[#ff6b6b] text-white hover:bg-[#ff8c8c] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#ff6b6b] transition-all shadow-md shadow-[#ff6b6b]/30"
        >
          {copied ? (
            <>コピーしました</>
          ) : (
            <>
              <Copy size={20} />
              計算結果をコピー
            </>
          )}
        </button>

        {/* Add to history */}
        {((mode === "normal" && percent !== null) || (mode === "reverse" && reverseTarget !== null)) &&
          totalNum > 0 && (
            <button
              onClick={addToHistory}
              className="w-full h-12 flex items-center justify-center rounded-xl font-medium border-2 border-dashed border-[#ff6b6b]/40 text-[#ff6b6b] hover:bg-[#fff5f5] hover:border-[#ff6b6b] transition-colors"
            >
              履歴に追加
            </button>
          )}

        {/* History list - 共有ボタン付き */}
        {history.length > 0 && (
          <section className="pt-6 border-t border-[#f0e6dc]">
            <h2 className="text-sm font-semibold text-[#4a5568] mb-4">履歴</h2>
            <ul className="space-y-2">
              {history.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-3 px-4 rounded-xl bg-white border border-[#f0e6dc] shadow-sm hover:shadow-md transition-shadow"
                >
                  <span className="text-sm text-[#4a5568] truncate flex-1 min-w-0">
                    {item.target} / {item.total} ={" "}
                    <span className="text-[#ff6b6b] font-semibold">{item.percent}%</span>
                  </span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => shareHistoryItem(item)}
                      className="p-2 rounded-lg text-[#a0aec0] hover:text-[#ff6b6b] hover:bg-[#fff5f5] transition-colors"
                      aria-label="共有"
                    >
                      <Share2 size={18} />
                    </button>
                    <button
                      onClick={() => removeFromHistory(item.id)}
                      className="p-2 rounded-lg text-[#a0aec0] hover:text-[#ff6b6b] hover:bg-[#fff5f5] transition-colors"
                      aria-label="削除"
                    >
                      <Trash2 size={18} />
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
