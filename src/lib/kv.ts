import { Redis } from "@upstash/redis";

const PREFIX = "qp:";
const LICENSE_PREFIX = `${PREFIX}license:`;
const PAYMENT_PREFIX = `${PREFIX}payment:`;
const EMAIL_PREFIX = `${PREFIX}email:`;

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

export function isKvConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}
