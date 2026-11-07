import type { AssetAnalysis } from "./analysis-schema";

export const MAX_CLIPS = 12;
export const MAX_CLIP_BYTES = 500 * 1024 * 1024;
export const MAX_ANALYZED_S = 60;
const MAX_CLIP_S = 6;
const MAX_REEL_S = 30;

const BADGES: Partial<Record<AssetAnalysis["phase"]["value"], string>> = {
  foundations: "ZÁKLADY",
  rough_build: "HRUBÁ STAVBA",
  roof: "STRECHA",
  plaster_facade: "OMIETKY",
  interior: "INTERIÉR",
};

export type PlanClip = { id: string; durationS: number; analysis: AssetAnalysis };
export type ClipVerdict = { id: string; status: "used" | "spare" };
export type TimelineClip = { id: string; startS: number; endS: number; caption: string; badge: string | null };
export type ReelPlan = { verdicts: ClipVerdict[]; timeline: TimelineClip[] };

function windowOf({ durationS, analysis }: PlanClip) {
  const limit = Math.min(durationS, MAX_ANALYZED_S);
  const startS = Math.max(0, Math.min(analysis.best_window.start_s, limit - 1));
  const endS = Math.min(analysis.best_window.end_s, startS + MAX_CLIP_S, limit);
  return { startS, endS: endS - startS >= 1 ? endS : Math.min(startS + MAX_CLIP_S, limit) };
}

// Every clip is eligible; the best ones fill the 30 s Reel and the rest stay spare.
export function planReel(clips: PlanClip[]): ReelPlan {
  const picked = new Set<string>();
  let totalS = 0;
  const byHighlight = [...clips].sort(
    (a, b) => b.analysis.highlight_score_0_10 - a.analysis.highlight_score_0_10,
  );
  for (const clip of byHighlight) {
    const { startS, endS } = windowOf(clip);
    if (totalS + endS - startS > MAX_REEL_S) continue;
    totalS += endS - startS;
    picked.add(clip.id);
  }

  return {
    verdicts: clips.map(({ id }) => ({ id, status: picked.has(id) ? "used" : "spare" })),
    timeline: clips
      .filter((clip) => picked.has(clip.id))
      .map((clip) => ({
        id: clip.id,
        ...windowOf(clip),
        caption: clip.analysis.caption_seed.trim(),
        badge: BADGES[clip.analysis.phase.value] ?? null,
      })),
  };
}
