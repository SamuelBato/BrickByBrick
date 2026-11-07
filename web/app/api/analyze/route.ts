import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { isOwnBlobUrl } from "@/lib/blob-url";
import { makeProxy } from "@/lib/ffmpeg";
import { analyzeVideo } from "@/lib/gemini";

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const url: unknown = body?.url;
  if (!isOwnBlobUrl(url, process.env.BLOB_READ_WRITE_TOKEN)) {
    return NextResponse.json({ error: "Neplatná adresa klipu." }, { status: 400 });
  }

  const dir = await mkdtemp(join(tmpdir(), "bbb-"));
  try {
    const { file, durationS } = await makeProxy(url as string, dir);
    const analysis = await analyzeVideo(await readFile(file));
    return NextResponse.json({ analysis, durationS });
  } catch (error) {
    console.error("analysis failed", error);
    return NextResponse.json({ error: "Analýza klipu zlyhala." }, { status: 502 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
