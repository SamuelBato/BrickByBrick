import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { badgeImage, captionImage } from "./overlay";
import { MAX_ANALYZED_S, type TimelineClip } from "./plan";

const STDERR_TAIL = 20_000;
const FFMPEG_TIMEOUT_MS = 280_000;
const BADGE_SECONDS = "between(t,0.3,2.8)";
// Forces the MP4/MOV reader, so a crafted playlist in Blob cannot make ffmpeg fetch other addresses.
const CLIP_FORMAT = ["-f", "mov"];

function runFfmpeg(args: string[], cwd?: string) {
  return new Promise<string>((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("ffmpeg binary is missing"));

    // -nostats keeps progress lines from pushing the Duration line out of the stderr tail.
    const child = spawn(ffmpegPath, ["-hide_banner", "-nostats", "-y", ...args], {
      stdio: ["ignore", "ignore", "pipe"],
      cwd,
    });
    const timeout = setTimeout(() => child.kill("SIGKILL"), FFMPEG_TIMEOUT_MS);
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk).slice(-STDERR_TAIL);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(stderr);
      else reject(new Error(`ffmpeg exited with ${code}: ${stderr}`));
    });
  });
}

// shortcut: only the first 60 s are analysed, and planReel only cuts from those 60 s, so nothing unchecked is published.
export async function makeProxy(url: string, dir: string) {
  const file = join(dir, "proxy.mp4");
  const stderr = await runFfmpeg([
    "-t", String(MAX_ANALYZED_S),
    ...CLIP_FORMAT,
    "-i", url,
    "-map", "0:v:0",
    "-map", "0:a:0?",
    "-vf", "scale=-2:'min(720,ih)'",
    "-r", "15",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "30",
    "-maxrate", "1500k",
    "-bufsize", "3000k",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "48k",
    "-ac", "1",
    "-movflags", "+faststart",
    file,
  ]);

  const match = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr);
  if (!match) throw new Error("ffmpeg did not report a duration");
  const durationS = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  return { file, durationS };
}

// Clips are encoded one at a time to stay inside the Vercel memory limit. The Reel is silent on purpose.
export async function renderReel(clips: (TimelineClip & { url: string })[], dir: string) {
  const parts: string[] = [];
  for (const [index, clip] of clips.entries()) {
    const overlays: { file: string; enable?: string }[] = [];

    if (clip.caption) {
      const file = `caption-${index}.png`;
      await writeFile(join(dir, file), await captionImage(clip.caption));
      overlays.push({ file });
    }
    if (clip.badge && clip.badge !== clips[index - 1]?.badge) {
      const file = `badge-${index}.png`;
      await writeFile(join(dir, file), await badgeImage(clip.badge));
      overlays.push({ file, enable: BADGE_SECONDS });
    }

    let filter = "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30[base]";
    let last = "base";
    for (const [position, { enable }] of overlays.entries()) {
      const next = `layer${position}`;
      // Inputs 0 and 1 are the clip and the silent audio, so overlay images start at 2.
      filter += `;[${last}][${position + 2}:v]overlay${enable ? `=enable='${enable}'` : ""}[${next}]`;
      last = next;
    }
    filter += `;[${last}]format=yuv420p[video]`;

    const part = `part-${index}.mp4`;
    const seconds = String(clip.endS - clip.startS);
    await runFfmpeg(
      [
        "-ss", String(clip.startS),
        "-t", seconds,
        ...CLIP_FORMAT,
        "-i", clip.url,
        "-f", "lavfi",
        "-i", "anullsrc=r=48000:cl=stereo",
        ...overlays.flatMap(({ file }) => ["-i", file]),
        "-filter_complex", filter,
        "-map", "[video]",
        "-map", "1:a:0",
        "-shortest",
        // -shortest alone lets audio overrun the video, which freezes the picture at each cut after concat.
        "-t", seconds,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "21",
        "-c:a", "aac",
        "-b:a", "128k",
        part,
      ],
      dir,
    );
    parts.push(part);
  }

  await writeFile(join(dir, "list.txt"), parts.map((part) => `file '${part}'`).join("\n"));
  await runFfmpeg(["-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "-movflags", "+faststart", "reel.mp4"], dir);
  return join(dir, "reel.mp4");
}
