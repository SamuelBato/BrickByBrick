import type { AssetAnalysis } from "./analysis-schema";

// Thresholds come from the original plan and are estimates; Sebo tunes them on real clips.
const VETO_CONFIDENCE = 0.5;
const MINOR_CONFIDENCE = 0.3;
const MIN_HIGHLIGHT = 3;
const HAZARDS = ["missing_ppe", "fall_hazard", "unsafe_ladder_or_scaffold", "unsecured_load", "machinery_proximity"];

export const MIN_CLIPS = 3;
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
export type ClipVerdict = {
  id: string;
  status: "used" | "spare" | "dropped" | "soft_dropped";
  reason: string | null;
};
export type TimelineClip = { id: string; startS: number; endS: number; caption: string; badge: string | null };
export type ReelPlan = {
  verdicts: ClipVerdict[];
  timeline: TimelineClip[];
  warnings: string[];
  gate: "ready" | "needs_more_clips" | "blocked";
  missingClips: number;
};

const hasFlag = (analysis: AssetAnalysis, type: string, minConfidence: number) =>
  analysis.risk_flags.some((flag) => flag.type === type && flag.confidence >= minConfidence);

function veto(analysis: AssetAnalysis): Pick<ClipVerdict, "status" | "reason"> | null {
  const dropped = (reason: string) => ({ status: "dropped" as const, reason });

  if (hasFlag(analysis, "license_plate_visible", VETO_CONFIDENCE)) return dropped("ŠPZ");
  if (
    hasFlag(analysis, "bystander_visible", VETO_CONFIDENCE) ||
    (analysis.people.bystander_present && analysis.people.faces_visible)
  ) {
    return dropped("Cudzia osoba");
  }
  if (hasFlag(analysis, "address_or_sign_visible", VETO_CONFIDENCE)) return dropped("Adresa");
  if (hasFlag(analysis, "minor_visible", MINOR_CONFIDENCE)) return dropped("Neplnoletý");
  if (!analysis.quality.usable || analysis.highlight_score_0_10 < MIN_HIGHLIGHT) return dropped("Zlý záber");
  // The plan names no threshold for hazards, so they share the veto threshold.
  if (HAZARDS.some((type) => hasFlag(analysis, type, VETO_CONFIDENCE))) {
    return { status: "soft_dropped", reason: "Bezpečnosť" };
  }
  return null;
}

function windowOf({ durationS, analysis }: PlanClip) {
  const limit = Math.min(durationS, MAX_ANALYZED_S);
  const startS = Math.max(0, Math.min(analysis.best_window.start_s, limit - 1));
  const endS = Math.min(analysis.best_window.end_s, startS + MAX_CLIP_S, limit);
  return { startS, endS: endS - startS >= 1 ? endS : Math.min(startS + MAX_CLIP_S, limit) };
}

// Runs in the browser for the chips and again on the server before rendering.
export function planReel(clips: PlanClip[]): ReelPlan {
  const decided = clips.map((clip) => ({ clip, verdict: veto(clip.analysis) }));
  const eligible = decided.filter(({ verdict }) => !verdict).map(({ clip }) => clip);

  const picked = new Set<string>();
  let totalS = 0;
  const byHighlight = [...eligible].sort(
    (a, b) => b.analysis.highlight_score_0_10 - a.analysis.highlight_score_0_10,
  );
  for (const clip of byHighlight) {
    const { startS, endS } = windowOf(clip);
    if (totalS + endS - startS > MAX_REEL_S) continue;
    totalS += endS - startS;
    picked.add(clip.id);
  }

  const verdicts = decided.map(({ clip, verdict }): ClipVerdict => {
    if (verdict) return { id: clip.id, ...verdict };
    return picked.has(clip.id)
      ? { id: clip.id, status: "used", reason: null }
      : { id: clip.id, status: "spare", reason: "Nezmestil sa do Reelu" };
  });

  const timeline = eligible
    .filter((clip) => picked.has(clip.id))
    .map((clip): TimelineClip => ({
      id: clip.id,
      ...windowOf(clip),
      caption: clip.analysis.caption_seed.trim(),
      badge: BADGES[clip.analysis.phase.value] ?? null,
    }));

  const warnings = decided.flatMap(({ verdict }, index) =>
    verdict?.status === "soft_dropped" ? [`Klip ${index + 1}: bezpečnostné riziko, do Reelu nejde.`] : [],
  );

  const blocked = eligible.some(
    (clip) => picked.has(clip.id) && clip.analysis.risk_flags.some((flag) => flag.severity === "critical"),
  );
  if (blocked) warnings.push("Klip v Reeli má kritický príznak, render je zablokovaný.");

  const missingClips = Math.max(0, MIN_CLIPS - eligible.length);
  return {
    verdicts,
    timeline,
    warnings,
    gate: blocked ? "blocked" : missingClips > 0 ? "needs_more_clips" : "ready",
    missingClips,
  };
}
