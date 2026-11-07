import assert from "node:assert/strict";
import { test } from "node:test";
import type { AssetAnalysis } from "../lib/analysis-schema.ts";
import { planReel, type PlanClip } from "../lib/plan.ts";

type Flag = AssetAnalysis["risk_flags"][number];

const flag = (type: Flag["type"], confidence: number, severity: Flag["severity"] = "high"): Flag => ({
  type,
  severity,
  t_start_s: 0,
  t_end_s: 1,
  confidence,
  evidence: "",
  recommended_action: "none",
});

function clip(id: string, changes: Partial<AssetAnalysis> = {}, durationS = 10): PlanClip {
  return {
    id,
    durationS,
    analysis: {
      phase: { value: "roof", confidence: 0.9 },
      highlight_score_0_10: 7,
      quality: { usable: true, problems: [] },
      best_window: { start_s: 1, end_s: 5 },
      subject: "Pokládka krytiny",
      caption_seed: "Strecha rastie",
      speech: { has_speech: false, language: "none", transcript: "", confidence: 0 },
      people: { count_visible: 1, faces_visible: false, bystander_present: false },
      risk_flags: [],
      ...changes,
    },
  };
}

const verdictOf = (input: PlanClip) => planReel([input]).verdicts[0];

test("hard vetoes drop the clip at their thresholds", () => {
  const cases: [Flag["type"], number, string][] = [
    ["license_plate_visible", 0.5, "ŠPZ"],
    ["bystander_visible", 0.5, "Cudzia osoba"],
    ["address_or_sign_visible", 0.5, "Adresa"],
    ["minor_visible", 0.3, "Neplnoletý"],
  ];
  for (const [type, threshold, reason] of cases) {
    assert.deepEqual(verdictOf(clip("a", { risk_flags: [flag(type, threshold)] })), {
      id: "a",
      status: "dropped",
      reason,
    });
    assert.equal(verdictOf(clip("a", { risk_flags: [flag(type, threshold - 0.01)] })).status, "used");
  }
});

test("a bystander with a visible face is dropped even without a flag", () => {
  const people = { count_visible: 2, faces_visible: true, bystander_present: true };
  assert.equal(verdictOf(clip("a", { people })).reason, "Cudzia osoba");
});

test("a hard veto wins over a safety risk on the same clip", () => {
  const risk_flags = [flag("missing_ppe", 0.9), flag("license_plate_visible", 0.9)];
  assert.equal(verdictOf(clip("a", { risk_flags })).status, "dropped");
});

test("a safety risk drops softly and adds a warning", () => {
  const plan = planReel([clip("a", { risk_flags: [flag("missing_ppe", 0.8, "medium")] })]);
  assert.deepEqual(plan.verdicts[0], { id: "a", status: "soft_dropped", reason: "Bezpečnosť" });
  assert.equal(plan.timeline.length, 0);
  assert.equal(plan.warnings.length, 1);
});

test("a bad shot is dropped", () => {
  assert.equal(verdictOf(clip("a", { highlight_score_0_10: 2.9 })).reason, "Zlý záber");
  assert.equal(verdictOf(clip("a", { quality: { usable: false, problems: ["dark"] } })).reason, "Zlý záber");
  assert.equal(verdictOf(clip("a", { highlight_score_0_10: 3 })).status, "used");
});

test("fewer than 3 usable clips asks for more", () => {
  const plate = { risk_flags: [flag("license_plate_visible", 0.9)] };
  const plan = planReel([clip("a"), clip("b"), clip("c", plate)]);
  assert.equal(plan.gate, "needs_more_clips");
  assert.equal(plan.missingClips, 1);
  assert.equal(planReel([clip("a"), clip("b"), clip("c")]).gate, "ready");
});

test("a critical flag on a clip in the Reel blocks the render", () => {
  const risk_flags = [flag("other", 0.9, "critical")];
  assert.equal(planReel([clip("a"), clip("b"), clip("c", { risk_flags })]).gate, "blocked");
});

test("a dropped clip with a critical flag does not block the render", () => {
  const risk_flags = [flag("license_plate_visible", 0.9, "critical")];
  assert.equal(planReel([clip("a"), clip("b"), clip("c"), clip("d", { risk_flags })]).gate, "ready");
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
