import { GoogleGenAI } from "@google/genai";
import { analysisJsonSchema, analysisSchema } from "./analysis-schema";

// Sebo tunes this text in AI Studio.
const PROMPT = `You analyse one raw video clip from a construction site in Slovakia for an Instagram Reel. Report only what you can see or hear.

- phase: the construction phase shown. Use "unknown" when the footage is not enough.
- highlight_score_0_10: how interesting the shot is for a Reel. 0 is useless, 10 is excellent.
- best_window: the best continuous 3 to 6 seconds, in seconds from the start of the clip.
- subject: a short Slovak description of the action, with correct diacritics.
- caption_seed: a short Slovak caption of at most 6 words, with correct diacritics, based only on what is seen or heard.
- Never invent anything.`;

// One retry covers a temporary Gemini error or a broken JSON answer.
export async function analyzeVideo(video: Buffer) {
  try {
    return await callGemini(video);
  } catch (error) {
    console.warn("gemini retry", error);
    return callGemini(video);
  }
}

async function callGemini(video: Buffer) {
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
