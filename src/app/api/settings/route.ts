import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/server/storage";
import type { AISettings } from "@/lib/types";

export async function GET() {
  const settings = await readJson<AISettings | null>("settings.json", null);
  return NextResponse.json(settings);
}

export async function PUT(req: Request) {
  const body = await req.json() as AISettings;
  await writeJson("settings.json", body);
  return NextResponse.json(body);
}
