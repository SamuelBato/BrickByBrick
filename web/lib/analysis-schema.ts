import { z } from "zod";

const confidence = z.number().min(0).max(1);

export const analysisSchema = z.object({
  phase: z.object({
    value: z.enum(["foundations", "rough_build", "roof", "plaster_facade", "interior", "unknown"]),
    confidence,
  }),
  highlight_score_0_10: z.number().min(0).max(10),
  quality: z.object({
    usable: z.boolean(),
    problems: z.array(
      z.enum(["dark", "blurry", "shaky", "overexposed", "too_short", "no_subject", "noisy_audio", "other"]),
    ),
  }),
  best_window: z.object({ start_s: z.number().min(0), end_s: z.number().min(0) }),
  subject: z.string(),
  caption_seed: z.string(),
  speech: z.object({
    has_speech: z.boolean(),
    language: z.enum(["sk", "cs", "en", "pl", "uk", "other", "none"]),
    transcript: z.string(),
    confidence,
  }),
  people: z.object({
    count_visible: z.number().int().min(0),
    faces_visible: z.boolean(),
    bystander_present: z.boolean(),
  }),
  risk_flags: z.array(
    z.object({
      type: z.enum([
        "missing_ppe",
        "fall_hazard",
        "unsafe_ladder_or_scaffold",
        "unsecured_load",
        "machinery_proximity",
        "face_visible",
        "bystander_visible",
        "license_plate_visible",
        "address_or_sign_visible",
        "minor_visible",
        "client_interior_private",
        "sensitive_speech",
        "other",
      ]),
      severity: z.enum(["low", "medium", "high", "critical"]),
      t_start_s: z.number().min(0),
      t_end_s: z.number().min(0),
      confidence,
      evidence: z.string(),
      recommended_action: z.enum(["blur", "cut_out", "drop_asset", "add_label", "require_human_review", "none"]),
    }),
  ),
});

export type AssetAnalysis = z.infer<typeof analysisSchema>;

const { $schema: _dialect, ...jsonSchema } = z.toJSONSchema(analysisSchema);
export const analysisJsonSchema = jsonSchema;
