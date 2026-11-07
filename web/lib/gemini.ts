import { GoogleGenAI } from "@google/genai";
import { analysisJsonSchema, analysisSchema } from "./analysis-schema";

// Sebo tunes this text in AI Studio.
const PROMPT = `You analyse one raw video clip from a construction site in Slovakia. The result decides whether the clip may appear in a public Instagram Reel, so report only what you can see or hear.

- phase: the construction phase shown. Use "unknown" when the footage is not enough.
- highlight_score_0_10: how interesting the shot is for a Reel. 0 is useless, 10 is excellent.
- best_window: the best continuous 3 to 6 seconds, in seconds from the start of the clip.
- subject: a short Slovak description of the action, with correct diacritics.
- caption_seed: a short Slovak caption of at most 6 words, with correct diacritics, based only on what is seen or heard.
- people.bystander_present: true when a person is clearly not doing construction work, such as a passer-by or someone looking into the camera.
- risk_flags: report every risk, even a small or brief one, and always give the time range.
  - license_plate_visible: any vehicle plate, even partly visible or small.
  - address_or_sign_visible: a readable address, street sign, house number or company sign.
  - minor_visible: anyone who could be under 18.
  - bystander_visible: a person who is clearly not working on the site.
  - missing_ppe: a worker without a helmet or other required protection.
- severity: use "critical" only for an immediate danger to life. A missing helmet is "medium".
- When unsure, lower the confidence. Never invent anything.`;

export async function analyzeVideo(video: Buffer) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL_VLM ?? "gemini-3.5-flash-lite",
    contents: [
      {
        role: "user",
        parts: [{ inlineData: { mimeType: "video/mp4", data: video.toString("base64") } }, { text: PROMPT }],
      },
    ],
    config: { responseMimeType: "application/json", responseJsonSchema: analysisJsonSchema, temperature: 0.2 },
  });

  return analysisSchema.parse(JSON.parse(response.text ?? ""));
}
