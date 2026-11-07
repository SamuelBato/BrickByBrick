import type { AssetAnalysis } from "./analysis-schema";

export const MAX_CLIPS = 12;
export const MAX_CLIP_BYTES = 500 * 1024 * 1024;
export const MAX_ANALYZED_S = 60;
const MIN_SHOT_S = 3;

export const REEL_LENGTHS = [15, 30, 45, 60] as const;

export const REEL_STYLES = {
  cut: { label: "Čistý strih", transition: null, overlapS: 0, grade: null },
  fade: { label: "Prelínanie", transition: "fade", overlapS: 0.5, grade: null },
  slide: { label: "Dynamický", transition: "slideleft", overlapS: 0.3, grade: "eq=contrast=1.1:saturation=1.25" },
  film: { label: "Filmový", transition: "fadeblack", overlapS: 0.6, grade: "eq=contrast=1.05:saturation=0.85,vignette" },
} as const;

export const CAPTION_MODES = { bottom: "Dole", center: "V strede", off: "Vypnuté" } as const;

export type ReelOptions = {
  lengthS: (typeof REEL_LENGTHS)[number];
  style: keyof typeof REEL_STYLES;
  captions: keyof typeof CAPTION_MODES;
  badges: boolean;
};

export const DEFAULT_OPTIONS: ReelOptions = { lengthS: 30, style: "fade", captions: "bottom", badges: true };

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
export type ReelPlan = { verdicts: ClipVerdict[]; timeline: TimelineClip[]; lengthS: number };

const usableS = ({ durationS }: PlanClip) => Math.min(durationS, MAX_ANALYZED_S);

// The shot is centred on the best moment Gemini found, whatever length the Reel needs from this clip.
function windowOf(clip: PlanClip, lengthS: number) {
  const { start_s, end_s } = clip.analysis.best_window;
  const startS = Math.max(0, Math.min((start_s + end_s - lengthS) / 2, usableS(clip) - lengthS));
  return { startS, endS: startS + lengthS };
}

// The best clips fill the chosen length and the rest stay spare.
export function planReel(clips: PlanClip[], options: ReelOptions): ReelPlan {
  const byHighlight = [...clips].sort(
    (a, b) => b.analysis.highlight_score_0_10 - a.analysis.highlight_score_0_10,
  );
  const picked = byHighlight.slice(0, Math.floor(options.lengthS / MIN_SHOT_S));

  // Transitions overlap neighbouring shots, so together the shots run longer than the Reel.
  let leftS = options.lengthS + REEL_STYLES[options.style].overlapS * Math.max(0, picked.length - 1);
  const lengths = new Map<string, number>();
  // Equal shares; a clip too short for its share hands the rest to the longer ones.
  [...picked]
    .sort((a, b) => usableS(a) - usableS(b))
    .forEach((clip, index) => {
      const lengthS = Math.min(usableS(clip), leftS / (picked.length - index));
      lengths.set(clip.id, lengthS);
      leftS -= lengthS;
    });

  return {
    verdicts: clips.map(({ id }) => ({ id, status: lengths.has(id) ? "used" : "spare" })),
    timeline: clips.flatMap((clip) => {
      const lengthS = lengths.get(clip.id);
      if (lengthS === undefined) return [];
      return {
        id: clip.id,
        ...windowOf(clip, lengthS),
        caption: options.captions === "off" ? "" : clip.analysis.caption_seed.trim(),
        badge: options.badges ? (BADGES[clip.analysis.phase.value] ?? null) : null,
      };
    }),
    lengthS: picked.length === 0 ? 0 : options.lengthS - leftS,
  };
}
