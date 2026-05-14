import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { extractText } from "unpdf";

const DATA_DIR = path.join(process.cwd(), "data", "references");

interface ReferenceEntry {
  id: string;
  title: string;
  category: "knowledge" | "reference";
  fileName: string;
  mimeType: string;
  textContent: string;
  createdAt: string;
}

async function getManifest(courseId: string): Promise<ReferenceEntry[]> {
  const manifestPath = path.join(DATA_DIR, courseId, "manifest.json");
  try {
    const data = await fs.readFile(manifestPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveManifest(courseId: string, entries: ReferenceEntry[]) {
  const dir = path.join(DATA_DIR, courseId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "manifest.json"), JSON.stringify(entries, null, 2));
}

export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) {
    return NextResponse.json({ error: "缺少 courseId" }, { status: 400 });
  }

  const entries = await getManifest(courseId);
  const list = entries.map(({ textContent, ...rest }) => rest);
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const courseId = formData.get("courseId") as string;
  const title = formData.get("title") as string;
  const category = formData.get("category") as string;
  const file = formData.get("file") as File | null;
  const textInput = formData.get("textInput") as string | null;

  if (!courseId || !title || !category) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }

  if (!file && !textInput) {
    return NextResponse.json({ error: "请提供文件或文本内容" }, { status: 400 });
  }

  try {
    const id = crypto.randomUUID();
    const dir = path.join(DATA_DIR, courseId);
    await fs.mkdir(dir, { recursive: true });

    let fileName: string;
    let mimeType: string;
    let textContent: string;

    if (textInput) {
      fileName = `${id}.md`;
      mimeType = "text/markdown";
      textContent = textInput;
      await fs.writeFile(path.join(dir, fileName), textInput, "utf-8");
    } else {
      const f = file!;
      fileName = `${id}-${f.name}`;
      mimeType = f.type;
      const buffer = Buffer.from(await f.arrayBuffer());
      await fs.writeFile(path.join(dir, fileName), buffer);

      if (f.type === "application/pdf") {
        const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
        textContent = text;
      } else if (f.type.startsWith("image/")) {
        const base64 = buffer.toString("base64");
        textContent = `{{IMAGE:data:${f.type};base64,${base64}}}`;
      } else {
        textContent = buffer.toString("utf-8");
      }
    }

    const entry: ReferenceEntry = {
      id,
      title,
      category: category as "knowledge" | "reference",
      fileName,
      mimeType,
      textContent,
      createdAt: new Date().toISOString(),
    };

    const entries = await getManifest(courseId);
    entries.push(entry);
    await saveManifest(courseId, entries);

    const { textContent: _, ...response } = entry;
    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error("Reference upload error:", err);
    return NextResponse.json(
      { error: "保存失败: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
