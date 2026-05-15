import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

export async function readJson<T>(relativePath: string, fallback: T): Promise<T> {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, relativePath), "utf-8");
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

export async function writeJson(relativePath: string, data: unknown): Promise<void> {
  const fullPath = path.join(DATA_DIR, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, JSON.stringify(data, null, 2));
}

export async function removeDir(relativePath: string): Promise<void> {
  const fullPath = path.join(DATA_DIR, relativePath);
  await fs.rm(fullPath, { recursive: true, force: true });
}

export async function removeFile(relativePath: string): Promise<void> {
  const fullPath = path.join(DATA_DIR, relativePath);
  await fs.rm(fullPath, { force: true });
}
