import { z } from "zod";

export const analysisSchema = z.object({
  phase: z.object({
    value: z.enum(["foundations", "rough_build", "roof", "plaster_facade", "interior", "unknown"]),
    confidence: z.number().min(0).max(1),
  }),
  highlight_score_0_10: z.number().min(0).max(10),
  best_window: z.object({ start_s: z.number().min(0), end_s: z.number().min(0) }),
  subject: z.string(),
  caption_seed: z.string(),
});

export type AssetAnalysis = z.infer<typeof analysisSchema>;

const { $schema: _dialect, ...jsonSchema } = z.toJSONSchema(analysisSchema);
export const analysisJsonSchema = jsonSchema;
