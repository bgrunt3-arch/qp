import { Redis } from "@upstash/redis";

const PREFIX = "qp:";
const LICENSE_PREFIX = `${PREFIX}license:`;
const PAYMENT_PREFIX = `${PREFIX}payment:`;
const EMAIL_PREFIX = `${PREFIX}email:`;
const EVENT_PREFIX = `${PREFIX}event:`;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export type LicenseRecord = {
  paymentId: string;
  source: "paypay" | "square";
  createdAt: number;
};

/** ライセンスキーを保存（paymentId で重複防止） */
export async function saveLicense(
  licenseKey: string,
  paymentId: string,
  source: "paypay" | "square"
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  const record: LicenseRecord = {
    paymentId,
    source,
    createdAt: Date.now(),
  };
  await redis.set(`${LICENSE_PREFIX}${licenseKey}`, JSON.stringify(record));
  await redis.set(`${PAYMENT_PREFIX}${source}:${paymentId}`, licenseKey);
  return true;
}

/**
 * 決済の処理権をアトミックに取得する（SET NX）。
 * 同一 paymentId に対して最初に呼び出したリクエストのみ true を返す。
 * 並列リトライによるメール重複送信を防ぐために使用する。
 */
export async function claimPaymentProcessing(
  paymentId: string,
  source: "paypay" | "square"
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true; // Redis 未設定時は処理を通す
  const key = `${PAYMENT_PREFIX}${source}:${paymentId}:claimed`;
  // NX = 存在しない場合のみセット。成功すれば "OK"、既存なら null
  const result = await redis.set(key, "1", { nx: true, ex: 60 * 60 * 24 });
  return result !== null;
}

/** 既にこの決済でライセンスを発行済みか */
export async function getLicenseByPayment(
  paymentId: string,
  source: "paypay" | "square"
): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  return redis.get<string>(`${PAYMENT_PREFIX}${source}:${paymentId}`);
}

/** メールアドレスとライセンスキーを紐付け（Square購入者向け・7日間有効） */
export async function saveLicenseByEmail(
  email: string,
  licenseKey: string
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const key = `${EMAIL_PREFIX}${email.trim().toLowerCase()}`;
  await redis.set(key, licenseKey, { ex: 60 * 60 * 24 * 7 }); // 7日
  return true;
}

/** メールアドレスでライセンスキーを取得 */
export async function getLicenseByEmail(email: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  return redis.get<string>(`${EMAIL_PREFIX}${email.trim().toLowerCase()}`);
}

/** ライセンスキーを検証 */
export async function verifyLicense(licenseKey: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const data = await redis.get<string>(`${LICENSE_PREFIX}${licenseKey}`);
  return data != null;
}

/**
 * Webhook event_id の冪等性チェック（SET NX）。
 * 同一 event_id を持つ Webhook が再送されても最初の1件だけ処理する。
 * paymentId ベースの claimPaymentProcessing と二重で守る構成。
 */
export async function claimEventProcessing(eventId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;
  const key = `${EVENT_PREFIX}${eventId}`;
  // 7日間保持（Square のリトライ期間より十分長い）
  const result = await redis.set(key, "1", { nx: true, ex: 60 * 60 * 24 * 7 });
  return result !== null;
}

export function isKvConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}
