import { NextRequest, NextResponse } from "next/server";
import { normalizeLicenseKey } from "@/lib/license";
import { verifyLicense, isKvConfigured } from "@/lib/kv";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const raw = typeof body?.licenseKey === "string" ? body.licenseKey : "";
    const licenseKey = normalizeLicenseKey(raw);

    if (!licenseKey) {
      return NextResponse.json(
        { valid: false, error: "ライセンスキーの形式が正しくありません" },
        { status: 400 }
      );
    }

    if (!isKvConfigured()) {
      return NextResponse.json(
        { valid: false, error: "ライセンス検証は現在利用できません" },
        { status: 503 }
      );
    }

    const valid = await verifyLicense(licenseKey);
    return NextResponse.json({ valid });
  } catch {
    return NextResponse.json(
      { valid: false, error: "検証中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
