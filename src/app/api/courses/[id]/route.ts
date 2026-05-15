import { NextResponse } from "next/server";
import { readJson, writeJson, removeDir } from "@/lib/server/storage";
import type { Course } from "@/lib/types";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name } = await req.json() as { name: string };
  const courses = await readJson<Course[]>("courses.json", []);
  const idx = courses.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  courses[idx].name = name;
  await writeJson("courses.json", courses);
  return NextResponse.json(courses[idx]);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const courses = await readJson<Course[]>("courses.json", []);
  const filtered = courses.filter((c) => c.id !== id);
  await writeJson("courses.json", filtered);
  await removeDir(`courses/${id}`);
  await removeDir(`references/${id}`);
  return NextResponse.json({ ok: true });
}
