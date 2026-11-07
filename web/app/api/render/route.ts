import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";
import { analysisSchema } from "@/lib/analysis-schema";
import { isOwnBlobUrl } from "@/lib/blob-url";
import { renderReel } from "@/lib/ffmpeg";
import { MAX_CLIPS, planReel } from "@/lib/plan";

export const maxDuration = 300;

const requestSchema = z.object({
  clips: z
    .array(
      z.object({
        id: z.string(),
        url: z.string(),
        durationS: z.number().positive(),
        analysis: analysisSchema,
      }),
    )
    .min(1)
    .max(MAX_CLIPS),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!parsed.success || !parsed.data.clips.every(({ url }) => isOwnBlobUrl(url, token))) {
    return NextResponse.json({ error: "Neplatné údaje o klipoch." }, { status: 400 });
  }

  const { clips } = parsed.data;
  const plan = planReel(clips);
  const urls = new Map(clips.map(({ id, url }) => [id, url]));
  const dir = await mkdtemp(join(tmpdir(), "bbb-"));
  try {
    const timeline = plan.timeline.map((clip) => ({ ...clip, url: urls.get(clip.id) as string }));
    const reel = await readFile(await renderReel(timeline, dir));
    const { url, downloadUrl } = await put("reely/reel.mp4", reel, {
      access: "public",
      addRandomSuffix: true,
      contentType: "video/mp4",
    });

    // Clips whose analysis failed are not in this list; the reset in useReel removes them.
    await del(clips.map((clip) => clip.url)).catch((error) => console.error("clip cleanup failed", error));
    return NextResponse.json({ url, downloadUrl });
  } catch (error) {
    console.error("render failed", error);
    return NextResponse.json({ error: "Render zlyhal." }, { status: 502 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
