import assert from "node:assert/strict";
import { test } from "node:test";
import type { AssetAnalysis } from "../lib/analysis-schema.ts";
import { DEFAULT_OPTIONS, planReel, type PlanClip, type ReelOptions } from "../lib/plan.ts";

const options: ReelOptions = { ...DEFAULT_OPTIONS, style: "cut" };

function clip(id: string, changes: Partial<AssetAnalysis> = {}, durationS = 10): PlanClip {
  return {
    id,
    durationS,
    analysis: {
      phase: { value: "roof", confidence: 0.9 },
      highlight_score_0_10: 7,
      best_window: { start_s: 1, end_s: 5 },
      subject: "Pokládka krytiny",
      caption_seed: "Strecha rastie",
      ...changes,
    },
  };
}

test("a single clip makes a Reel, even with a low score", () => {
  const plan = planReel([clip("a", { highlight_score_0_10: 0 })], options);
  assert.deepEqual(plan.verdicts, [{ id: "a", status: "used" }]);
  assert.equal(plan.timeline.length, 1);
});

test("the timeline keeps upload order and the best clips that fit the length", () => {
  const clips = ["a", "b", "c", "d", "e", "f"].map((id, index) =>
    clip(id, { highlight_score_0_10: id === "c" ? 3 : 9 - index }),
  );
  const plan = planReel(clips, { ...options, lengthS: 15 });
  assert.deepEqual(plan.timeline.map(({ id }) => id), ["a", "b", "d", "e", "f"]);
  assert.equal(plan.verdicts[2].status, "spare");
});

test("windows stay inside the clip and the analysed part", () => {
  const outside = clip("a", { best_window: { start_s: 40, end_s: 90 } }, 10);
  const [first] = planReel([outside], options).timeline;
  assert.ok(first.startS >= 0 && first.endS <= 10 && first.endS > first.startS);

  const longClip = clip("b", { best_window: { start_s: 80, end_s: 85 } }, 300);
  const [second] = planReel([longClip], options).timeline;
  assert.ok(second.endS <= 60);

  const reversed = clip("c", { best_window: { start_s: 5, end_s: 2 } }, 10);
  const [third] = planReel([reversed], options).timeline;
  assert.ok(third.endS > third.startS);
});

test("the phase badge is skipped when the phase is unknown", () => {
  assert.equal(planReel([clip("a")], options).timeline[0].badge, "STRECHA");
  const unknown = clip("b", { phase: { value: "unknown", confidence: 0.2 } });
  assert.equal(planReel([unknown], options).timeline[0].badge, null);
});

const lengthOf = ({ startS, endS }: { startS: number; endS: number }) => endS - startS;

test("a clip too short for its share hands the rest to the longer clips", () => {
  const clips = [clip("a", {}, 4), clip("b", {}, 100), clip("c", {}, 100)];
  const plan = planReel(clips, options);
  assert.deepEqual(plan.timeline.map(lengthOf), [4, 13, 13]);
  assert.equal(plan.lengthS, 30);
});

test("transitions overlap the shots, so the finished Reel still has the chosen length", () => {
  const clips = [clip("a", {}, 100), clip("b", {}, 100), clip("c", {}, 100)];
  const plan = planReel(clips, { ...options, style: "fade", lengthS: 15 });
  assert.equal(plan.timeline.map(lengthOf).reduce((sum, length) => sum + length), 16);
  assert.equal(plan.lengthS, 15);
});

test("with too little footage the Reel is as long as the footage", () => {
  const clips = [clip("a", {}, 4), clip("b", {}, 5)];
  assert.equal(planReel(clips, { ...options, lengthS: 45 }).lengthS, 9);
  assert.equal(planReel(clips, { ...options, lengthS: 45, style: "fade" }).lengthS, 8.5);
});

test("captions and badges can be switched off", () => {
  const [shot] = planReel([clip("a")], { ...options, captions: "off", badges: false }).timeline;
  assert.equal(shot.caption, "");
  assert.equal(shot.badge, null);
});
