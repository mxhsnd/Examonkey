import { NextRequest, NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/server/storage";
import type { Material } from "@/lib/types";

export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });
  const materials = await readJson<Material[]>(`courses/${courseId}/materials.json`, []);
  return NextResponse.json(materials);
}

export async function POST(req: Request) {
  const body = await req.json() as Omit<Material, "id" | "createdAt">;
  const materials = await readJson<Material[]>(`courses/${body.courseId}/materials.json`, []);
  const material: Material = {
    ...body,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  materials.push(material);
  await writeJson(`courses/${body.courseId}/materials.json`, materials);
  return NextResponse.json(material, { status: 201 });
}
