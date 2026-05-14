import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) {
    return NextResponse.json({ error: "缺少 courseId" }, { status: 400 });
  }

  const entries = await getManifest(courseId);
  const entry = entries.find((e) => e.id === id);
  if (!entry) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }

  return NextResponse.json(entry);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) {
    return NextResponse.json({ error: "缺少 courseId" }, { status: 400 });
  }

  const entries = await getManifest(courseId);
  const entry = entries.find((e) => e.id === id);
  if (!entry) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }

  const filePath = path.join(DATA_DIR, courseId, entry.fileName);
  try {
    await fs.unlink(filePath);
  } catch {}

  const updated = entries.filter((e) => e.id !== id);
  await saveManifest(courseId, updated);

  return NextResponse.json({ success: true });
}
