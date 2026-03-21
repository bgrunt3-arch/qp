/** ライセンスキー形式: QP-XXXX-XXXX (英大文字・数字) */
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 紛らわしい I,O,0,1 を除外

function randomPart(length: number): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => CHARS[b % CHARS.length]).join("");
}

export function generateLicenseKey(): string {
  return `QP-${randomPart(4)}-${randomPart(4)}`;
}

export function normalizeLicenseKey(input: string): string | null {
  const s = input.trim().toUpperCase().replace(/\s/g, "");
  // QP-XXXX-XXXX または QPXXXXXXXX
  const match = s.match(/^QP-?([A-Z0-9]{4})-?([A-Z0-9]{4})$/);
  if (!match) return null;
  return `QP-${match[1]}-${match[2]}`;
}
