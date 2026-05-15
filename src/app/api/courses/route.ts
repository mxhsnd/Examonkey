import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/server/storage";
import type { Course } from "@/lib/types";

export async function GET() {
  const courses = await readJson<Course[]>("courses.json", []);
  return NextResponse.json(courses);
}

export async function POST(req: Request) {
  const { name } = await req.json() as { name: string };
  const courses = await readJson<Course[]>("courses.json", []);
  const course: Course = {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
  };
  courses.push(course);
  await writeJson("courses.json", courses);
  return NextResponse.json(course, { status: 201 });
}
