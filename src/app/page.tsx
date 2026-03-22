"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Copy, Trash2, Share2, Sun, Moon, Percent, Tag, ArrowUpDown, Crown, X, Download, Store } from "lucide-react";
import { AdBanner } from "@/components/AdBanner";
import { usePremium } from "@/hooks/usePremium";
import { useAccentColor } from "@/hooks/useAccentColor";

const STORAGE_KEY = "percent-quick-history";
const COMPARE_STORAGE_KEY = "percent-quick-compare";
const DISCOUNT_STORAGE_KEY = "percent-quick-discount-history";
const FLEA_STORAGE_KEY = "percent-quick-flea-history";
const APP_NAME = "QuickPercent";

const HISTORY_LIMIT_FREE = 50;
const HISTORY_LIMIT_PREMIUM = 200;
const COMPARE_LIMIT_FREE = 50;
const COMPARE_LIMIT_PREMIUM = 100;
const DISCOUNT_LIMIT_FREE = 50;
const DISCOUNT_LIMIT_PREMIUM = 200;
const FLEA_LIMIT_FREE = 50;
const FLEA_LIMIT_PREMIUM = 200;

type AppMode = "percent" | "compare" | "discount" | "flea";

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

type FleaHistoryItem = {
  id: string;
  productName?: string;
  salePrice: number;
  commissionRate: number;
  transferFee: number;
  shippingCost: number;
  cost: number;
  commissionAmount: number;
  netProfit: number;
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

function downloadCSV(content: string, filename: string) {
  const bom = "\uFEFF";
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

function loadFleaHistory(): FleaHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FLEA_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FleaHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFleaHistory(items: FleaHistoryItem[]): void {
  if (typeof window === "undefined") return;
  scheduleStorageWrite(() => {
    localStorage.setItem(FLEA_STORAGE_KEY, JSON.stringify(items));
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
  const [fleaProductName, setFleaProductName] = useState<string>("");
  const [fleaSalePrice, setFleaSalePrice] = useState<string>("");
  const [fleaCommissionRate, setFleaCommissionRate] = useState<string>("10");
  const [fleaTransferFee, setFleaTransferFee] = useState<string>("200");
  const [fleaShipping, setFleaShipping] = useState<string>("");
  const [fleaCost, setFleaCost] = useState<string>("");
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>("");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fleaProductNameComposing = useRef(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [discountHistory, setDiscountHistory] = useState<DiscountHistoryItem[]>([]);
  const [fleaHistory, setFleaHistory] = useState<FleaHistoryItem[]>([]);
  const [compareList, setCompareList] = useState<CompareItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("コピーしました");
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [licenseVerifyLoading, setLicenseVerifyLoading] = useState(false);
  const [licenseVerifyError, setLicenseVerifyError] = useState<string | null>(null);
  const [claimEmail, setClaimEmail] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimedKey, setClaimedKey] = useState<string | null>(null);
  const { setTheme, resolvedTheme } = useTheme();
  const { isPremium, setPremium, mounted: premiumMounted } = usePremium();
  const { accentColor, setAccentColor, accentColors } = useAccentColor(isPremium);
  const [mounted, setMounted] = useState(false);

  const [paymentConfig, setPaymentConfig] = useState<{
    squareEnabled: boolean;
    paypayEnabled: boolean;
    premiumPurchaseUrl: string | null;
    imageSearchEnabled: boolean;
  } | null>(null);
  const useSquareCheckout = paymentConfig?.squareEnabled ?? false;
  const usePayPayCheckout = paymentConfig?.paypayEnabled ?? false;
  const premiumPurchaseUrl = paymentConfig?.premiumPurchaseUrl ?? process.env.NEXT_PUBLIC_PREMIUM_PURCHASE_URL ?? "";
  const imageSearchEnabled = paymentConfig?.imageSearchEnabled ?? false;

  useEffect(() => setMounted(true), []);

  // 決済画面から戻ったとき（bfcache復元時など）にローディングを解除
  useEffect(() => {
    const onPageShow = () => setCheckoutLoading(false);
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    fetch("/api/payment-config")
      .then((r) => r.json())
      .then((data: { squareEnabled?: boolean; paypayEnabled?: boolean; premiumPurchaseUrl?: string | null; imageSearchEnabled?: boolean }) =>
        setPaymentConfig({
          squareEnabled: Boolean(data.squareEnabled),
          paypayEnabled: Boolean(data.paypayEnabled),
          premiumPurchaseUrl: data.premiumPurchaseUrl ?? null,
          imageSearchEnabled: Boolean(data.imageSearchEnabled),
        })
      )
      .catch(() => setPaymentConfig({ squareEnabled: false, paypayEnabled: false, premiumPurchaseUrl: null, imageSearchEnabled: false }));
  }, []);

  // Square決済成功時のコールバック
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

  // PayPay決済完了の確認（リダイレクト戻り時にポーリング）
  useEffect(() => {
    if (typeof window === "undefined" || !premiumMounted) return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const merchantPaymentId = params.get("merchantPaymentId");
    if (checkout !== "paypay" || !merchantPaymentId) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/checkout-paypay/verify?merchantPaymentId=${encodeURIComponent(merchantPaymentId)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (data.completed) {
          setPremium(true);
          setPremiumModalOpen(false);
          const key = data.licenseKey;
          if (key) {
            setToastMessage(`Premiumを購入しました。ライセンスキー: ${key}（別のブラウザで使う場合は保存してください）`);
            try {
              await navigator.clipboard.writeText(key);
            } catch {
              // ignore
            }
          } else {
            setToastMessage("Premiumを購入しました");
          }
          setToastVisible(true);
          setTimeout(() => setToastVisible(false), 4000);
          setTimeout(() => setToastMessage("コピーしました"), 4000);
          window.history.replaceState({}, "", window.location.pathname);
          return;
        }
      } catch {
        // ignore
      }
      if (!cancelled) setTimeout(poll, 2500);
    };
    poll();
    return () => {
      cancelled = true;
    };
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

  const fleaSalePriceNum = parseFloat(fleaSalePrice) || 0;
  const fleaCommissionRateNum = Math.min(100, Math.max(0, parseFloat(fleaCommissionRate) || 0));
  const fleaTransferFeeNum = Math.max(0, parseFloat(fleaTransferFee) || 0);
  const fleaShippingNum = Math.max(0, parseFloat(fleaShipping) || 0);
  const fleaCostNum = Math.max(0, parseFloat(fleaCost) || 0);
  const fleaCommissionAmount =
    fleaSalePriceNum > 0
      ? Math.round(fleaSalePriceNum * (fleaCommissionRateNum / 100))
      : 0;
  const fleaPayoutAmount =
    fleaSalePriceNum > 0
      ? Math.round((fleaSalePriceNum - fleaCommissionAmount - fleaTransferFeeNum - fleaShippingNum) * 100) / 100
      : 0;
  const fleaNetProfit =
    fleaSalePriceNum > 0
      ? Math.round((fleaPayoutAmount - fleaCostNum) * 100) / 100
      : 0;

  const percent = calcPercent(totalNum, targetNum);
  const displayValue = percent ?? 0;
  const displayTarget = isInverted ? 100 - displayValue : displayValue;
  const animatedPercent = useAnimatedValue(displayTarget, true, 350);

  const historyLimit = isPremium ? HISTORY_LIMIT_PREMIUM : HISTORY_LIMIT_FREE;
  const compareLimit = isPremium ? COMPARE_LIMIT_PREMIUM : COMPARE_LIMIT_FREE;
  const discountLimit = isPremium ? DISCOUNT_LIMIT_PREMIUM : DISCOUNT_LIMIT_FREE;
  const fleaLimit = isPremium ? FLEA_LIMIT_PREMIUM : FLEA_LIMIT_FREE;

  const historySectionRef = useRef<HTMLElement>(null);

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
    const next = [item, ...history].slice(0, historyLimit);
    setHistory(next);
    saveHistory(next);
    setToastMessage("履歴に追加しました");
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
    setTimeout(() => historySectionRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [percent, totalNum, targetNum, isInverted, historyLimit, history]);

  useEffect(() => {
    setHistory(loadHistory());
    setDiscountHistory(loadDiscountHistory());
    setFleaHistory(loadFleaHistory());
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

  useEffect(() => {
    saveFleaHistory(fleaHistory);
  }, [fleaHistory]);

  const handleCopy = useCallback(async () => {
    if (appMode === "flea") {
      if (fleaSalePriceNum <= 0) return;
      const namePart = fleaProductName.trim() ? `（${fleaProductName.trim()}）` : "";
      const text = `${namePart}売値${formatYen(fleaSalePriceNum)} → 純利益${formatYen(fleaNetProfit)}（手数料${formatYen(fleaCommissionAmount)}、振込${formatYen(fleaTransferFeeNum)}）`;
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
  }, [appMode, percent, discountResult, originalPriceNum, priceAfterDiscount, discountAmount, fleaProductName, fleaSalePriceNum, fleaNetProfit, fleaCommissionAmount, fleaTransferFeeNum]);

  const handleClear = useCallback(() => {
    setTotal("");
    setTarget("");
    setOriginalPrice("");
    setDiscountRate("");
    setSalePrice("");
    setUnitPrice("");
    setSecondBagUnitPrice("");
    setFleaProductName("");
    setFleaSalePrice("");
    setFleaCommissionRate("10");
    setFleaTransferFee("200");
    setFleaShipping("");
    setFleaCost("");
    setIsInverted(false);
  }, []);

  const compareListSectionRef = useRef<HTMLElement>(null);

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
    const next = [item, ...compareList].slice(0, compareLimit);
    setCompareList(next);
    saveCompareList(next);
    setToastMessage("リストに追加しました");
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
    setTimeout(() => compareListSectionRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [discountResult, unitPriceNum, compareQuantity, compareLimit, compareList]);

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

  const discountHistorySectionRef = useRef<HTMLElement>(null);

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
    const next = [item, ...discountHistory].slice(0, discountLimit);
    setDiscountHistory(next);
    saveDiscountHistory(next);
    setToastMessage("履歴に追加しました");
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
    setTimeout(() => discountHistorySectionRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [originalPriceNum, discountRateNum, salePriceNum, discountAmount, priceAfterDiscount, discountLimit, discountHistory]);

  const removeFromDiscountHistory = (id: string) => {
    setDiscountHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const fleaHistorySectionRef = useRef<HTMLElement>(null);

  const addToFleaHistory = useCallback(() => {
    if (fleaSalePriceNum <= 0) return;
    const item: FleaHistoryItem = {
      id: crypto.randomUUID(),
      productName: fleaProductName.trim() || undefined,
      salePrice: fleaSalePriceNum,
      commissionRate: fleaCommissionRateNum,
      transferFee: fleaTransferFeeNum,
      shippingCost: fleaShippingNum,
      cost: fleaCostNum,
      commissionAmount: fleaCommissionAmount,
      netProfit: fleaNetProfit,
      createdAt: Date.now(),
    };
    const next = [item, ...fleaHistory].slice(0, fleaLimit);
    setFleaHistory(next);
    saveFleaHistory(next);
    setToastMessage("履歴に追加しました");
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
    setTimeout(() => fleaHistorySectionRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [
    fleaProductName,
    fleaSalePriceNum,
    fleaCommissionRateNum,
    fleaTransferFeeNum,
    fleaShippingNum,
    fleaCostNum,
    fleaCommissionAmount,
    fleaNetProfit,
    fleaLimit,
    fleaHistory,
  ]);

  const removeFromFleaHistory = (id: string) => {
    setFleaHistory((prev) => prev.filter((h) => h.id !== id));
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

  const exportHistory = useCallback(() => {
    const header = "全体,目標,割合(%),逆算,日時\n";
    const rows = history.map(
      (item) =>
        `${item.total},${item.target},${item.percent},${item.isInverted ? "はい" : "いいえ"},${new Date(item.createdAt).toLocaleString("ja-JP")}`
    );
    downloadCSV(header + rows.join("\n"), `qp-履歴-${new Date().toISOString().slice(0, 10)}.csv`);
    setToastMessage("履歴をエクスポートしました");
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  }, [history]);

  const exportCompareList = useCallback(() => {
    const header = "単価,個数,実際の価格,お得額,割引率(%),日時\n";
    const rows = compareList.map(
      (item) =>
        `${item.unitPrice},${item.quantity},${item.actualPrice},${item.savingAmount},${item.discountRate.toFixed(1)},${new Date(item.createdAt).toLocaleString("ja-JP")}`
    );
    downloadCSV(header + rows.join("\n"), `qp-比較リスト-${new Date().toISOString().slice(0, 10)}.csv`);
    setToastMessage("比較リストをエクスポートしました");
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  }, [compareList]);

  const exportDiscountHistory = useCallback(() => {
    const header = "元の価格,割引率(%),割引額,割引後価格,日時\n";
    const rows = discountHistory.map(
      (item) =>
        `${item.originalPrice},${item.discountRate},${item.discountAmount},${item.priceAfterDiscount},${new Date(item.createdAt).toLocaleString("ja-JP")}`
    );
    downloadCSV(header + rows.join("\n"), `qp-割引履歴-${new Date().toISOString().slice(0, 10)}.csv`);
    setToastMessage("割引履歴をエクスポートしました");
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  }, [discountHistory]);

  const exportFleaHistory = useCallback(() => {
    const escapeCsv = (s: string) => (s.includes(",") || s.includes('"') ? `"${String(s).replace(/"/g, '""')}"` : s);
    const header = "商品名,売値,手数料率(%),振込手数料,送料,原価,販売手数料,純利益,日時\n";
    const rows = fleaHistory.map(
      (item) =>
        `${escapeCsv(item.productName ?? "")},${item.salePrice},${item.commissionRate},${item.transferFee},${item.shippingCost},${item.cost},${item.commissionAmount},${item.netProfit},${new Date(item.createdAt).toLocaleString("ja-JP")}`
    );
    downloadCSV(header + rows.join("\n"), `qp-フリマ履歴-${new Date().toISOString().slice(0, 10)}.csv`);
    setToastMessage("フリマ履歴をエクスポートしました");
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  }, [fleaHistory]);

  const progressValue = percent !== null ? Math.min(100, Math.max(0, percent)) : 0;

  const FLEA_MARKETS = [
    { name: "メルカリ", url: (q: string) => `https://www.mercari.com/jp/search/?keyword=${encodeURIComponent(q)}` },
    { name: "ヤフオク", url: (q: string) => `https://auctions.yahoo.co.jp/search/search?p=${encodeURIComponent(q)}` },
    { name: "ラクマ",   url: (q: string) => `https://fril.jp/search?query=${encodeURIComponent(q)}` },
    { name: "PayPayフリマ", url: (q: string) => `https://paypayflea.jp/search?keyword=${encodeURIComponent(q)}` },
  ];

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraLoading(true);
    setCameraError("");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/image-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType: file.type }),
      });
      const data = await res.json();
      if (!res.ok || !data.productName) throw new Error(data.error ?? "認識失敗");
      if (data.productName === "不明") {
        setCameraError("商品を認識できませんでした。もう一度撮影してください。");
      } else {
        setFleaProductName(data.productName);
      }
    } catch {
      setCameraError("認識に失敗しました。再度お試しください。");
    } finally {
      setCameraLoading(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleSquareCheckout = async () => {
    setCheckoutLoading(true);
    let redirecting = false;
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Checkout failed (${res.status})`);
      if (data.url) {
        redirecting = true;
        window.location.href = data.url;
        return;
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "エラーが発生しました";
      setToastMessage(msg);
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 4000);
    } finally {
      if (!redirecting) setCheckoutLoading(false);
    }
  };

  const handlePayPayCheckout = async () => {
    setCheckoutLoading(true);
    let redirecting = false;
    try {
      const res = await fetch("/api/checkout-paypay", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `PayPay failed (${res.status})`);
      if (data.url) {
        redirecting = true;
        window.location.href = data.url;
        return;
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "エラーが発生しました";
      setToastMessage(msg);
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 4000);
    } finally {
      if (!redirecting) setCheckoutLoading(false);
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
              className={`absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-lg transition-colors flex items-center gap-1 ${
                isPremium ? "text-accent hover:bg-subtle" : "text-muted hover:text-accent hover:bg-subtle"
              }`}
              aria-label={isPremium ? "Premium（カラー変更）" : "Premiumを購入"}
              title={isPremium ? "Premium（アクセントカラー変更可）" : "Premiumを購入"}
            >
              <Crown size={18} />
              {isPremium && (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: accentColor }}
                  aria-hidden
                />
              )}
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

      <main className="flex-1 min-h-0 max-w-md mx-auto w-full px-3 sm:px-4 py-3 sm:py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col gap-3 sm:gap-6 overflow-y-auto overflow-x-hidden sm:overflow-visible relative z-10">
        {/* 上部広告もスクロール内に配置（履歴が隠れないように） */}
        {premiumMounted && !isPremium && (
          <aside aria-label="広告" className="shrink-0 py-2 isolate border-b border-page bg-subtle/30">
            <AdBanner format="auto" className="max-w-md mx-auto" />
          </aside>
        )}
        {/* Intro */}
        <p className="shrink-0 text-xs sm:text-sm text-muted">
          達成率・割引・セット割・フリマ純利益をすぐ計算。<br />
          <Link href="/about" className="text-accent hover:underline">使い方</Link>や<Link href="/tips" className="text-accent hover:underline">計算のコツ</Link>もご覧ください。
        </p>
        {/* App mode toggle: 割合 / セット割 / 割引 / フリマ */}
        <div className="shrink-0 flex flex-wrap rounded-xl sm:rounded-2xl bg-card p-1 sm:p-1.5 shadow-sm border border-page">
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
          <button
            onClick={() => setAppMode("flea")}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
              appMode === "flea" ? "bg-accent text-white shadow-md shadow-[#ff6b6b]/30" : "text-muted hover:text-accent hover:bg-subtle"
            }`}
          >
            <Store size={14} className="sm:w-4 sm:h-4" />
            フリマ
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
              履歴に追加
            </button>
          )}

        {/* History list */}
        {history.length > 0 && (
          <section ref={historySectionRef} className="shrink-0 pt-3 sm:pt-6 border-t border-page">
            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-4">
              <h2 className="text-xs sm:text-sm font-semibold text-label">履歴</h2>
              {isPremium && (
                <button
                  onClick={exportHistory}
                  className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-subtle transition-colors"
                  aria-label="エクスポート"
                  title="CSVでダウンロード"
                >
                  <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
              )}
            </div>
            <ul className="space-y-1.5 sm:space-y-2 -mr-1 pr-1">
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
            履歴に追加
          </button>
        )}

        {discountHistory.length > 0 && (
          <section ref={discountHistorySectionRef} className="shrink-0 pt-3 sm:pt-6 border-t border-page">
            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-4">
              <h2 className="text-xs sm:text-sm font-semibold text-label">履歴</h2>
              {isPremium && (
                <button
                  onClick={exportDiscountHistory}
                  className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-subtle transition-colors"
                  aria-label="エクスポート"
                  title="CSVでダウンロード"
                >
                  <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
              )}
            </div>
            <ul className="space-y-1.5 sm:space-y-2 -mr-1 pr-1">
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
        ) : appMode === "flea" ? (
          <>
        <div className="shrink-0 flex flex-wrap gap-2 mb-2">
          <button
            onClick={() => {
              setFleaCommissionRate("10");
              setFleaTransferFee("200");
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-subtle text-muted hover:text-accent"
          >
            メルカリ
          </button>
          <button
            onClick={() => {
              setFleaCommissionRate("10");
              setFleaTransferFee("210");
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-subtle text-muted hover:text-accent"
          >
            ラクマ
          </button>
          <button
            onClick={() => {
              setFleaCommissionRate("5");
              setFleaTransferFee("100");
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-subtle text-muted hover:text-accent"
          >
            Yahoo!フリマ
          </button>
        </div>
        <div className="shrink-0 space-y-2 sm:space-y-4">
          <div className="block">
            <span className="text-xs sm:text-sm font-medium text-label">商品名</span>
            <div className="relative mt-1 sm:mt-2 flex gap-2">
              <input
                type="text"
                autoComplete="off"
                placeholder="例: 未使用の本"
                value={fleaProductName}
                onChange={(e) => { if (!fleaProductNameComposing.current) setFleaProductName(e.target.value); }}
                onCompositionStart={() => { fleaProductNameComposing.current = true; }}
                onCompositionEnd={(e) => { fleaProductNameComposing.current = false; setFleaProductName((e.target as HTMLInputElement).value); }}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                className="flex-1 w-full h-11 sm:h-14 px-3 sm:px-4 text-base sm:text-lg font-medium rounded-lg sm:rounded-xl bg-input border border-input text-input-foreground placeholder:text-result-empty focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:border-transparent shadow-sm transition-shadow"
              />
              {/* カメラボタン */}
              {imageSearchEnabled && (
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={cameraLoading}
                className="shrink-0 h-11 sm:h-14 w-11 sm:w-14 flex items-center justify-center rounded-lg sm:rounded-xl bg-subtle border border-input text-muted hover:text-accent hover:border-accent transition-colors disabled:opacity-50"
                title="カメラで商品を認識"
              >
                {cameraLoading ? (
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                )}
              </button>
              )}
            </div>
            {cameraError && <p className="mt-1 text-xs text-accent">{cameraError}</p>}
            {/* 相場検索ボタン */}
            {fleaProductName.trim() && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-xs text-muted self-center">相場を検索:</span>
                {FLEA_MARKETS.map((m) => (
                  <a
                    key={m.name}
                    href={m.url(fleaProductName.trim())}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-subtle text-muted hover:text-accent hover:bg-accent/10 border border-input transition-colors"
                  >
                    {m.name} →
                  </a>
                ))}
              </div>
            )}
          </div>
          {/* ファイル input は label の外に置く（label 内だと click が干渉する） */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCameraCapture}
          />
          <label className="block">
            <span className="text-xs sm:text-sm font-medium text-label">売値（円）</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={fleaSalePrice}
              onChange={(e) => setFleaSalePrice(sanitizeNumericInput(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="mt-1 sm:mt-2 w-full h-11 sm:h-14 px-3 sm:px-4 text-lg sm:text-xl font-semibold rounded-lg sm:rounded-xl bg-input border border-input text-input-foreground placeholder:text-result-empty focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:border-transparent shadow-sm transition-shadow"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <label className="block">
              <span className="text-xs sm:text-sm font-medium text-label">販売手数料率（%）</span>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="10"
                value={fleaCommissionRate}
                onChange={(e) => setFleaCommissionRate(sanitizeNumericInput(e.target.value))}
                className="mt-1 sm:mt-2 w-full h-11 sm:h-14 px-3 sm:px-4 text-lg font-semibold rounded-lg sm:rounded-xl bg-input border border-input text-input-foreground placeholder:text-result-empty focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:border-transparent"
              />
            </label>
            <label className="block">
              <span className="text-xs sm:text-sm font-medium text-label">振込手数料（円）</span>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="200"
                value={fleaTransferFee}
                onChange={(e) => setFleaTransferFee(sanitizeNumericInput(e.target.value))}
                className="mt-1 sm:mt-2 w-full h-11 sm:h-14 px-3 sm:px-4 text-lg font-semibold rounded-lg sm:rounded-xl bg-input border border-input text-input-foreground placeholder:text-result-empty focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:border-transparent"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <label className="block">
              <span className="text-xs sm:text-sm font-medium text-label">送料（出品者負担・円）</span>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={fleaShipping}
                onChange={(e) => setFleaShipping(sanitizeNumericInput(e.target.value))}
                className="mt-1 sm:mt-2 w-full h-11 sm:h-14 px-3 sm:px-4 text-lg font-semibold rounded-lg sm:rounded-xl bg-input border border-input text-input-foreground placeholder:text-result-empty focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:border-transparent"
              />
            </label>
          </div>
        </div>

        <div className="shrink-0 rounded-lg sm:rounded-xl bg-card border border-page shadow-sm overflow-hidden">
          {fleaSalePriceNum > 0 ? (
            <ul className="divide-y divide-[var(--border)]">
              <li className="flex justify-between items-center gap-3 py-3 px-4">
                <span className="text-sm text-muted">販売手数料</span>
                <span className="text-base font-semibold text-accent tabular-nums">
                  -{formatYen(fleaCommissionAmount)}（{fleaCommissionRateNum}%）
                </span>
              </li>
              <li className="flex justify-between items-center gap-3 py-3 px-4">
                <span className="text-sm text-muted">振込手数料</span>
                <span className="text-base font-semibold tabular-nums">-{formatYen(fleaTransferFeeNum)}</span>
              </li>
              {fleaShippingNum > 0 && (
                <li className="flex justify-between items-center gap-3 py-3 px-4">
                  <span className="text-sm text-muted">送料</span>
                  <span className="text-base font-semibold tabular-nums">-{formatYen(fleaShippingNum)}</span>
                </li>
              )}
              <li className="flex justify-between items-center gap-3 py-3 px-4">
                <span className="text-sm text-muted">入金予定</span>
                <span className="text-base font-semibold tabular-nums">{formatYen(fleaPayoutAmount)}</span>
              </li>
              <li className="flex justify-between items-center gap-3 py-3 px-4 bg-accent/5">
                <span className="text-sm font-semibold text-label">純利益</span>
                <span className={`text-lg font-bold tabular-nums ${fleaNetProfit >= 0 ? "text-[#22c55e]" : "text-accent"}`}>
                  {formatYen(fleaNetProfit)}
                </span>
              </li>
            </ul>
          ) : (
            <div className="py-8 text-center">
              <p className="text-result-empty text-lg">売値を入力してください</p>
            </div>
          )}
        </div>

        <button
          onClick={() => handleCopy()}
          disabled={fleaSalePriceNum <= 0}
          className="shrink-0 w-full h-11 sm:h-14 flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold bg-accent text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[#ff6b6b]/30"
        >
          <Copy size={18} className="sm:w-5 sm:h-5" />
          結果をコピー
        </button>

        {fleaSalePriceNum > 0 && (
          <button
            onClick={addToFleaHistory}
            className="shrink-0 w-full h-10 sm:h-12 flex items-center justify-center rounded-lg sm:rounded-xl text-sm sm:text-base font-medium border-2 border-dashed border-accent/40 text-accent hover:bg-subtle hover:border-accent transition-colors"
          >
            履歴に追加
          </button>
        )}

        {fleaHistory.length > 0 && (
          <section ref={fleaHistorySectionRef} className="shrink-0 pt-3 sm:pt-6 border-t border-page">
            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-4">
              <h2 className="text-xs sm:text-sm font-semibold text-label">履歴</h2>
              {isPremium && (
                <button
                  onClick={exportFleaHistory}
                  className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-subtle transition-colors"
                  aria-label="エクスポート"
                  title="CSVでダウンロード"
                >
                  <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
              )}
            </div>
            <ul className="space-y-1.5 sm:space-y-2 -mr-1 pr-1">
              {fleaHistory.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 sm:gap-3 py-2 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl bg-card border border-page shadow-sm hover:shadow-md transition-shadow shrink-0"
                >
                  <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden pr-1">
                    <span className="text-xs sm:text-sm text-label block whitespace-nowrap">
                      {item.productName ? `（${item.productName}）` : ""}売値{formatYen(item.salePrice)} → 純利益{formatYen(item.netProfit)}
                    </span>
                    <span className="text-xs text-muted block">
                      手数料{formatYen(item.commissionAmount)}・振込{formatYen(item.transferFee)}
                      {item.cost > 0 ? `・原価${formatYen(item.cost)}` : ""}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => {
                        const namePart = item.productName ? `（${item.productName}）` : "";
                        const t = `${namePart}売値${formatYen(item.salePrice)} → 純利益${formatYen(item.netProfit)}`;
                        navigator.clipboard.writeText(t);
                        setToastVisible(true);
                        setTimeout(() => setToastVisible(false), 2500);
                      }}
                      className="p-1.5 sm:p-2 rounded-lg text-muted hover:text-accent hover:bg-subtle transition-colors"
                      aria-label="共有"
                    >
                      <Share2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                    <button
                      onClick={() => removeFromFleaHistory(item.id)}
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
            リストに追加
          </button>
        )}

        {/* 比較リスト（プレイリスト風） */}
        {compareList.length > 0 && (
          <section ref={compareListSectionRef} className="shrink-0 pt-3 sm:pt-6 border-t border-page">
            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-4">
              <h2 className="text-xs sm:text-sm font-semibold text-label">比較リスト</h2>
              {isPremium && (
                <button
                  onClick={exportCompareList}
                  className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-subtle transition-colors"
                  aria-label="エクスポート"
                  title="CSVでダウンロード"
                >
                  <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
              )}
            </div>
            <ul className="space-y-1.5 sm:space-y-2 -mr-1 pr-1">
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
        {/* 広告・フッターをスクロール内に配置（モバイルで履歴と被らない） */}
        {premiumMounted && !isPremium && (
          <aside aria-label="広告" className="shrink-0 px-3 sm:px-4 py-4 sm:py-5 border-t border-page isolate bg-subtle/30 mt-4">
            <AdBanner format="auto" className="max-w-md mx-auto" />
          </aside>
        )}
        <footer className="shrink-0 px-3 sm:px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-page mt-4">
          <div className="max-w-md mx-auto flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted">
          <a href="/about" className="hover:text-accent">アプリの説明</a>
          <a href="/tips" className="hover:text-accent">計算のコツ</a>
          <a href="/faq" className="hover:text-accent">よくある質問</a>
          <a href="/privacy" className="hover:text-accent">プライバシーポリシー</a>
          <a href="/terms" className="hover:text-accent">利用規約</a>
          <a href="/tokushoho" className="hover:text-accent">特定商取引法に基づく表記</a>
          <a href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@qp-lime.vercel.app"}`} className="hover:text-accent">お問い合わせ</a>
          </div>
        </footer>
      </main>

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
              広告非表示・アクセントカラー変更・履歴の上限拡張・CSVエクスポート。買い切りで永続的に有効です。
            </p>
            <p className="text-2xl font-bold text-accent mb-6">100円</p>
            {isPremium ? (
              <div className="space-y-4">
                <p className="text-sm text-[#22c55e] font-medium">ご購入済みです</p>
                <div>
                  <p className="text-xs text-muted mb-2">アクセントカラー（Premium限定）</p>
                  <div className="flex flex-wrap gap-2">
                    {accentColors.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setAccentColor(c.value)}
                        className={`w-8 h-8 rounded-full transition-all ${
                          accentColor === c.value
                            ? "ring-2 ring-offset-2 ring-offset-card ring-foreground scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: c.value }}
                        aria-label={c.name}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : paymentConfig === null ? (
              <button
                disabled
                className="w-full py-3 rounded-xl font-semibold bg-muted text-muted-foreground cursor-not-allowed"
              >
                読み込み中...
              </button>
            ) : (
              <>
            <div className="border-t border-page pt-4 mt-4">
              <p className="text-xs font-medium text-label mb-2">ライセンスキーをお持ちの方</p>
              <p className="text-xs text-muted mb-2">別のブラウザ・端末でPremiumを使う場合は、購入時に発行されたキーを入力してください。</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="QP-XXXX-XXXX"
                  value={licenseKeyInput}
                  onChange={(e) => {
                    setLicenseKeyInput(e.target.value.toUpperCase());
                    setLicenseVerifyError(null);
                  }}
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-input border border-input text-input-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:border-transparent"
                />
                <button
                  onClick={async () => {
                    const key = licenseKeyInput.trim();
                    if (!key) return;
                    setLicenseVerifyLoading(true);
                    setLicenseVerifyError(null);
                    try {
                      const res = await fetch("/api/verify-license", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ licenseKey: key }),
                      });
                      const data = await res.json();
                      if (data.valid) {
                        setPremium(true);
                        setLicenseKeyInput("");
                        setLicenseVerifyError(null);
                        setToastMessage("Premiumを有効にしました");
                        setToastVisible(true);
                        setTimeout(() => setToastVisible(false), 2500);
                      } else {
                        setLicenseVerifyError(data.error ?? "無効なライセンスキーです");
                      }
                    } catch {
                      setLicenseVerifyError("検証中にエラーが発生しました");
                    } finally {
                      setLicenseVerifyLoading(false);
                    }
                  }}
                  disabled={!licenseKeyInput.trim() || licenseVerifyLoading}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {licenseVerifyLoading ? "確認中..." : "有効化"}
                </button>
              </div>
              {licenseVerifyError && (
                <p className="text-xs text-accent mt-1">{licenseVerifyError}</p>
              )}
            </div>
            <div className="border-t border-page pt-4 mt-4">
              <p className="text-xs font-medium text-label mb-2">Squareで購入したがメールが届かない場合</p>
              <p className="text-xs text-muted mb-2">決済時に使用したメールアドレスを入力してライセンスキーを取得できます。</p>
              {claimedKey ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[#22c55e]">ライセンスキー: {claimedKey}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(claimedKey);
                      setToastMessage("コピーしました");
                      setToastVisible(true);
                      setTimeout(() => setToastVisible(false), 2000);
                    }}
                    className="text-xs text-accent hover:underline"
                  >
                    コピー
                  </button>
                  <button
                    onClick={() => {
                      setPremium(true);
                      setClaimedKey(null);
                      setClaimEmail("");
                      setPremiumModalOpen(false);
                      setToastMessage("Premiumを有効にしました");
                      setToastVisible(true);
                      setTimeout(() => setToastVisible(false), 2500);
                    }}
                    className="block w-full py-2 text-sm font-medium rounded-lg bg-accent text-white"
                  >
                    このキーで有効化
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="your@email.com"
                    value={claimEmail}
                    onChange={(e) => {
                      setClaimEmail(e.target.value);
                      setClaimError(null);
                    }}
                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-input border border-input text-input-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:border-transparent"
                  />
                  <button
                    onClick={async () => {
                      const email = claimEmail.trim();
                      if (!email) return;
                      setClaimLoading(true);
                      setClaimError(null);
                      try {
                        const res = await fetch("/api/claim-license", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email }),
                        });
                        const data = await res.json();
                        if (res.ok && data.licenseKey) {
                          setClaimedKey(data.licenseKey);
                          setClaimError(null);
                        } else {
                          setClaimError(data.error ?? data.hint ?? "取得できませんでした");
                        }
                      } catch {
                        setClaimError("エラーが発生しました");
                      } finally {
                        setClaimLoading(false);
                      }
                    }}
                    disabled={!claimEmail.trim() || claimLoading}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {claimLoading ? "取得中..." : "取得"}
                  </button>
                </div>
              )}
              {claimError && (
                <p className="text-xs text-accent mt-1">{claimError}</p>
              )}
            </div>
            {useSquareCheckout || usePayPayCheckout ? (
              <div className="space-y-2">
                {useSquareCheckout && (
                  <button
                    onClick={handleSquareCheckout}
                    disabled={checkoutLoading}
                    className="w-full py-3 rounded-xl font-semibold bg-accent text-white hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {checkoutLoading ? "決済画面へ移動中..." : "カードで購入（Square）"}
                  </button>
                )}
                {usePayPayCheckout && (
                  <button
                    onClick={handlePayPayCheckout}
                    disabled={checkoutLoading}
                    className="w-full py-3 rounded-xl font-semibold bg-[#00b900] text-white hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {checkoutLoading ? "決済画面へ移動中..." : "PayPayで購入"}
                  </button>
                )}
              </div>
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
            </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
