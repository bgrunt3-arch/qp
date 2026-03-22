import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI not configured" }, { status: 500 });
  }

  let imageBase64: string;
  let mimeType: string;
  try {
    const body = await req.json();
    imageBase64 = body.image;
    mimeType = body.mimeType ?? "image/jpeg";
    if (!imageBase64) throw new Error("missing image");
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "low" },
            },
            {
              type: "text",
              text: "この画像に写っている商品名をできるだけ具体的に日本語で答えてください。ブランド名・型番・色・サイズなど検索に役立つ情報を含め、30文字以内で商品名だけを出力してください。商品が写っていない場合は「不明」とだけ答えてください。",
            },
          ],
        },
      ],
    });

    const productName = response.choices[0]?.message?.content?.trim() ?? "不明";
    return NextResponse.json({ productName });
  } catch (err) {
    console.error("[image-search] OpenAI error:", err);
    return NextResponse.json({ error: "Recognition failed" }, { status: 500 });
  }
}
