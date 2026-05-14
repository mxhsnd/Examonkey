import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "未提供文件" }, { status: 400 });
  }

  try {
    const buffer = await file.arrayBuffer();
    const { text, totalPages } = await extractText(new Uint8Array(buffer), {
      mergePages: true,
    });

    return NextResponse.json({ text, pages: totalPages });
  } catch (err) {
    console.error("PDF parse error:", err);
    return NextResponse.json(
      { error: "PDF 解析失败: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
