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
  const [milestone, setMilestone] = useState<50 | 100 | null>(null);

  const totalNum = parseFloat(total) || 0;
  const targetNum = parseFloat(target) || 0;
  const percentInputNum = parseFloat(percentInput) || 0;

  const percent = mode === "normal" ? calcPercent(totalNum, targetNum) : percentInputNum;
  const reverseTarget = mode === "reverse" ? calcTargetFromPercent(totalNum, percentInputNum) : null;

  const displayValue = mode === "normal" ? (percent ?? 0) : (reverseTarget ?? 0);
  const animatedPercent = useAnimatedValue(displayValue, mode === "normal", 350);
  const animatedTarget = useAnimatedValue(displayValue, false, 350);

  useEffect(() => {
    const p = mode === "normal" ? percent : percentInputNum;
    if (p === 50) {
      setMilestone(50);
      const t = setTimeout(() => setMilestone(null), 800);
      return () => clearTimeout(t);
    }
    if (p === 100) {
      setMilestone(100);
      const t = setTimeout(() => setMilestone(null), 800);
      return () => clearTimeout(t);
    }
    setMilestone(null);
  }, [percent, percentInputNum, mode]);

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

  const getProgressColor = (p: number) => {
    if (p < 30) return "bg-[#e53e3e]";
    if (p < 70) return "bg-[#eab308]";
    return "bg-[#1db954]";
  };
  const progressColor = getProgressColor(progressValue);
  const percentTextColor =
    progressValue < 30 ? "text-[#e53e3e]" : progressValue < 70 ? "text-[#eab308]" : "text-[#1db954]";

  const sliderMax = mode === "normal" && totalNum > 0 ? totalNum : 100;
  const sliderValue = mode === "normal" ? targetNum : percentInputNum;
  const showSlider = mode === "normal" ? totalNum > 0 : true;

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col">
      {/* Toast */}
      {toastVisible && (
        <div className="fixed bottom-24 left-1/2 z-50 px-6 py-3 rounded-xl bg-[#1db954] text-black font-semibold shadow-lg toast-enter">
          コピーしました
        </div>
      )}

      <header className="py-6 px-4 text-center border-b border-[#282828]">
        <h1 className="text-2xl font-bold tracking-tight text-[#1db954]">{APP_NAME}</h1>
        <p className="text-sm text-[#b3b3b3] mt-1">全体と成果を入力して割合を即座に算出</p>
        <p className="text-xs text-[#6a6a6a] mt-2">Enter: コピー / Esc: クリア</p>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-8 flex flex-col gap-8">
        {/* Mode toggle */}
        <div className="flex rounded-xl bg-[#282828] p-1">
          <button
            onClick={() => setMode("normal")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors ${
              mode === "normal" ? "bg-[#1db954] text-black" : "text-[#b3b3b3] hover:text-white"
            }`}
          >
            通常
          </button>
          <button
            onClick={() => setMode("reverse")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors ${
              mode === "reverse" ? "bg-[#1db954] text-black" : "text-[#b3b3b3] hover:text-white"
            }`}
          >
            <ArrowRightLeft size={18} />
            逆算
          </button>
        </div>

        {/* 用途別テンプレート */}
        <div>
          <span className="text-xs text-[#6a6a6a] block mb-2">用途別テンプレート</span>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[#282828] text-[#b3b3b3] hover:bg-[#404040] hover:text-white transition-colors"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input fields */}
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-[#b3b3b3]">全体数 (vvv)</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="mt-2 w-full h-14 px-4 text-xl font-semibold rounded-xl bg-[#282828] border border-[#404040] text-white placeholder:text-[#6a6a6a] focus:outline-none focus:ring-2 focus:ring-[#1db954] focus:border-transparent"
            />
          </label>
          {mode === "normal" ? (
            <label className="block">
              <span className="text-sm font-medium text-[#b3b3b3]">成果数 (xxx)</span>
              <div className="flex gap-3 mt-2">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="flex-1 h-14 px-4 text-xl font-semibold rounded-xl bg-[#282828] border border-[#404040] text-white placeholder:text-[#6a6a6a] focus:outline-none focus:ring-2 focus:ring-[#1db954] focus:border-transparent"
                />
                {showSlider && (
                  <input
                    type="range"
                    min={0}
                    max={sliderMax}
                    step={sliderMax > 1000 ? sliderMax / 100 : 1}
                    value={Math.min(sliderValue, sliderMax)}
                    onChange={(e) => setTarget(e.target.value)}
                    className="w-24 self-center accent-[#1db954]"
                  />
                )}
              </div>
            </label>
          ) : (
            <label className="block">
              <span className="text-sm font-medium text-[#b3b3b3]">目標%</span>
              <div className="flex gap-3 mt-2">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={percentInput}
                  onChange={(e) => setPercentInput(e.target.value)}
                  className="flex-1 h-14 px-4 text-xl font-semibold rounded-xl bg-[#282828] border border-[#404040] text-white placeholder:text-[#6a6a6a] focus:outline-none focus:ring-2 focus:ring-[#1db954] focus:border-transparent"
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.5}
                  value={Math.min(percentInputNum, 100)}
                  onChange={(e) => setPercentInput(e.target.value)}
                  className="w-24 self-center accent-[#1db954]"
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
                className="flex-1 py-2.5 rounded-xl font-semibold bg-[#282828] text-[#b3b3b3] hover:bg-[#404040] hover:text-[#1db954] transition-colors"
              >
                {p}%
              </button>
            ))}
          </div>
        )}

        {/* Result display - アニメーション + マイルストーン */}
        <div
          className={`flex flex-col items-center justify-center py-8 relative transition-transform duration-300 ${
            milestone ? "scale-110" : "scale-100"
          }`}
        >
          {milestone && (
            <div
              className={`absolute inset-0 rounded-full animate-ping opacity-20 ${
                milestone === 50 ? "bg-[#eab308]" : "bg-[#1db954]"
              }`}
              style={{ animationDuration: "0.8s" }}
            />
          )}
          {mode === "normal" ? (
            <>
              <div
                className={`text-6xl sm:text-7xl font-bold tabular-nums relative z-10 ${percent !== null ? percentTextColor : "text-[#6a6a6a]"}`}
              >
                {percent !== null ? animatedPercent : "—"}
              </div>
              {percent !== null && totalNum > 0 && (
                <p className="text-[#b3b3b3] mt-2 text-sm relative z-10">
                  {targetNum} / {totalNum}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-[#b3b3b3] mb-1 relative z-10">必要な成果数</p>
              <div
                className={`text-6xl sm:text-7xl font-bold tabular-nums relative z-10 ${reverseTarget !== null ? percentTextColor : "text-[#6a6a6a]"}`}
              >
                {reverseTarget !== null ? animatedTarget : "—"}
              </div>
              {reverseTarget !== null && totalNum > 0 && (
                <p className="text-[#b3b3b3] mt-2 text-sm relative z-10">
                  {totalNum} の {percentInputNum}%
                </p>
              )}
            </>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full">
          <div className="h-3 w-full rounded-full bg-[#282828] overflow-hidden">
            <div
              className={`h-full rounded-full ${progressColor} transition-all duration-300 ease-out`}
              style={{ width: `${progressValue}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[#6a6a6a] mt-1">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Copy button */}
        <button
          onClick={() => handleCopy()}
          disabled={mode === "normal" ? percent === null : reverseTarget === null}
          className="w-full h-14 flex items-center justify-center gap-2 rounded-xl font-semibold bg-[#1db954] text-black hover:bg-[#1ed760] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#1db954] transition-colors"
        >
          {copied ? (
            <>コピーしました</>
          ) : (
            <>
              <Copy size={20} />
              文章をコピー
            </>
          )}
        </button>

        {/* Add to history */}
        {((mode === "normal" && percent !== null) || (mode === "reverse" && reverseTarget !== null)) &&
          totalNum > 0 && (
            <button
              onClick={addToHistory}
              className="w-full h-12 flex items-center justify-center rounded-xl font-medium border border-[#404040] text-[#b3b3b3] hover:bg-[#282828] hover:text-white transition-colors"
            >
              履歴に追加
            </button>
          )}

        {/* History list - 共有ボタン付き */}
        {history.length > 0 && (
          <section className="pt-6 border-t border-[#282828]">
            <h2 className="text-sm font-semibold text-[#b3b3b3] mb-4">履歴</h2>
            <ul className="space-y-2">
              {history.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-3 px-4 rounded-xl bg-[#181818] border border-[#282828]"
                >
                  <span className="text-sm text-[#b3b3b3] truncate flex-1 min-w-0">
                    {item.target} / {item.total} ={" "}
                    <span className="text-[#1db954] font-semibold">{item.percent}%</span>
                  </span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => shareHistoryItem(item)}
                      className="p-2 rounded-lg text-[#6a6a6a] hover:text-[#1db954] hover:bg-[#282828] transition-colors"
                      aria-label="共有"
                    >
                      <Share2 size={18} />
                    </button>
                    <button
                      onClick={() => removeFromHistory(item.id)}
                      className="p-2 rounded-lg text-[#6a6a6a] hover:text-red-400 hover:bg-[#282828] transition-colors"
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
