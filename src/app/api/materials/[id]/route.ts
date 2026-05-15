import { NextRequest, NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/server/storage";
import type { Material } from "@/lib/types";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });
  const materials = await readJson<Material[]>(`courses/${courseId}/materials.json`, []);
  const filtered = materials.filter((m) => m.id !== id);
  await writeJson(`courses/${courseId}/materials.json`, filtered);
  return NextResponse.json({ ok: true });
}
