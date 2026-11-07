import assert from "node:assert/strict";
import { test } from "node:test";
import type { AssetAnalysis } from "../lib/analysis-schema.ts";
import { planReel, type PlanClip } from "../lib/plan.ts";

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
  const plan = planReel([clip("a", { highlight_score_0_10: 0 })]);
  assert.deepEqual(plan.verdicts, [{ id: "a", status: "used" }]);
  assert.equal(plan.timeline.length, 1);
});

test("the timeline keeps upload order, the best clips and the 30 s limit", () => {
  const window = { best_window: { start_s: 0, end_s: 6 } };
  const clips = ["a", "b", "c", "d", "e", "f"].map((id, index) =>
    clip(id, { ...window, highlight_score_0_10: id === "c" ? 3 : 9 - index }),
  );
  const plan = planReel(clips);
  assert.deepEqual(plan.timeline.map(({ id }) => id), ["a", "b", "d", "e", "f"]);
  assert.equal(plan.verdicts[2].status, "spare");
});

test("windows stay inside the clip and the analysed part", () => {
  const outside = clip("a", { best_window: { start_s: 40, end_s: 90 } }, 10);
  const [first] = planReel([outside]).timeline;
  assert.ok(first.startS >= 0 && first.endS <= 10 && first.endS > first.startS);

  const longClip = clip("b", { best_window: { start_s: 80, end_s: 85 } }, 300);
  const [second] = planReel([longClip]).timeline;
  assert.ok(second.endS <= 60);

  const reversed = clip("c", { best_window: { start_s: 5, end_s: 2 } }, 10);
  const [third] = planReel([reversed]).timeline;
  assert.ok(third.endS > third.startS);
});

test("the phase badge is skipped when the phase is unknown", () => {
  assert.equal(planReel([clip("a")]).timeline[0].badge, "STRECHA");
  const unknown = clip("b", { phase: { value: "unknown", confidence: 0.2 } });
  assert.equal(planReel([unknown]).timeline[0].badge, null);
});
