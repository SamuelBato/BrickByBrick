import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";
import { analysisSchema } from "@/lib/analysis-schema";
import { isOwnBlobUrl } from "@/lib/blob-url";
import { renderReel } from "@/lib/ffmpeg";
import { writePopis } from "@/lib/gemini";
import { MAX_CLIPS, planReel, REEL_LENGTHS } from "@/lib/plan";
import { addReel, getStavba } from "@/lib/store";

export const maxDuration = 300;

const POPIS_WAIT_MS = 10_000;

const requestSchema = z.object({
  stavbaId: z.uuid(),
  options: z.object({
    lengthS: z.literal(REEL_LENGTHS),
    style: z.enum(["cut", "fade", "slide", "film"]),
    captions: z.enum(["bottom", "center", "off"]),
    badges: z.boolean(),
  }),
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

  const { stavbaId, options, clips } = parsed.data;
  const stavba = await getStavba(stavbaId);
  if (!stavba) return NextResponse.json({ error: "Stavba neexistuje." }, { status: 404 });

  const plan = planReel(clips, options);
  const urls = new Map(clips.map(({ id, url }) => [id, url]));
  const dir = await mkdtemp(join(tmpdir(), "bbb-"));
  try {
    // Runs beside the render so it adds no waiting time; the Reel still works without a description.
    const used = new Set(plan.timeline.map(({ id }) => id));
    const subjects = clips.filter(({ id }) => used.has(id)).map(({ analysis }) => analysis.subject);
    const popis = writePopis(stavba.name, subjects).catch((error) => {
      console.error("description failed", error);
      return "";
    });

    const timeline = plan.timeline.map((clip) => ({ ...clip, url: urls.get(clip.id) as string }));
    const reel = await readFile(await renderReel(timeline, dir, options));
    const { url, downloadUrl } = await put("reely/reel.mp4", reel, {
      access: "public",
      addRandomSuffix: true,
      contentType: "video/mp4",
    });

    // A hanging Gemini call must not push a finished Reel past the function limit.
    const saved = { url, downloadUrl, popis: await Promise.race([popis, sleep(POPIS_WAIT_MS, "")]) };
    await addReel(stavbaId, saved).catch((error) => console.error("reel record failed", error));

    // Clips whose analysis failed are not in this list; the reset in useReel removes them.
    await del(clips.map((clip) => clip.url)).catch((error) => console.error("clip cleanup failed", error));
    return NextResponse.json(saved);
  } catch (error) {
    console.error("render failed", error);
    return NextResponse.json({ error: "Render zlyhal." }, { status: 502 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
