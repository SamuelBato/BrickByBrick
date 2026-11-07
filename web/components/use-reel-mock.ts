// Fake hook with the exact shape of @/lib/use-reel. Step 2: swap the import in page.tsx, delete this file.
// Name hints: "spz" = plate veto, "osoba" = bystander veto, "zle" = upload error, "chyba" = render error.
// Without hints every 3rd clip gets a plate veto so both chips show.
"use client";

import { useMemo, useRef, useState } from "react";
import type { AssetAnalysis } from "@/lib/analysis-schema";
import { MAX_CLIP_BYTES, MAX_CLIPS, planReel } from "@/lib/plan";
import type { ReelClip } from "@/lib/use-reel";

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

function fakeAnalysis(name: string, index: number): AssetAnalysis {
  const lower = name.toLowerCase();
  const flag = (type: AssetAnalysis["risk_flags"][number]["type"]) => ({
    type, severity: "high" as const, t_start_s: 0, t_end_s: 2, confidence: 0.9, evidence: "mock", recommended_action: "drop_asset" as const,
  });
  const plate = lower.includes("spz") || (!lower.includes("osoba") && index % 3 === 2);
  return {
    phase: { value: (["foundations", "rough_build", "roof"] as const)[index % 3], confidence: 0.8 },
    highlight_score_0_10: 7,
    quality: { usable: true, problems: [] },
    best_window: { start_s: 0, end_s: 5 },
    subject: "stavba",
    caption_seed: `Klip ${index + 1}`,
    speech: { has_speech: false, language: "none", transcript: "", confidence: 0 },
    people: { count_visible: 0, faces_visible: false, bystander_present: false },
    risk_flags: [...(plate ? [flag("license_plate_visible")] : []), ...(lower.includes("osoba") ? [flag("bystander_visible")] : [])],
  };
}

export function useReel() {
  const [clips, setClips] = useState<ReelClip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [reel, setReel] = useState<{ url: string; downloadUrl: string } | null>(null);
  const firstFile = useRef<File | null>(null);

  const update = (id: string, patch: Partial<ReelClip>) =>
    setClips((current) => current.map((clip) => (clip.id === id ? { ...clip, ...patch } : clip)));

  async function processClip(id: string, file: File, index: number) {
    if (!file.type.startsWith("video/")) return update(id, { status: "error", error: "Súbor nie je video." });
    if (file.size > MAX_CLIP_BYTES) return update(id, { status: "error", error: "Klip je väčší ako 500 MB." });
    for (const progress of [30, 70, 100]) {
      await wait(400);
      update(id, { progress });
    }
    if (file.name.toLowerCase().includes("zle")) return update(id, { status: "error", error: "Nahrávanie klipu zlyhalo." });
    update(id, { status: "analyzing", url: "mock" });
    await wait(1500);
    update(id, { status: "done", durationS: 10, analysis: fakeAnalysis(file.name, index) });
  }

  async function addClips(files: File[]) {
    if (clips.length + files.length > MAX_CLIPS) {
      setError(`Naraz sa dá spracovať najviac ${MAX_CLIPS} klipov.`);
      return;
    }
    setError(null);
    firstFile.current ??= files[0] ?? null;
    const start = clips.length;
    const queue = files.map((file) => ({ file, id: crypto.randomUUID() }));
    setClips((current) => [
      ...current,
      ...queue.map(({ file, id }): ReelClip => ({ id, name: file.name, status: "uploading", progress: 0 })),
    ]);
    await Promise.all(queue.map(({ file, id }, i) => processClip(id, file, start + i)));
  }

  const plan = useMemo(
    () =>
      planReel(
        clips.flatMap(({ id, durationS, analysis }) =>
          analysis && durationS !== undefined ? [{ id, durationS, analysis }] : [],
        ),
      ),
    [clips],
  );

  async function createReel() {
    setRendering(true);
    setError(null);
    await wait(5000);
    if (clips.some(({ name }) => name.toLowerCase().includes("chyba"))) setError("Render zlyhal.");
    else {
      // the "reel" is just your first local clip, nothing leaves the laptop
      const url = firstFile.current ? URL.createObjectURL(firstFile.current) : "";
      setReel({ url, downloadUrl: url });
    }
    setRendering(false);
  }

  const busy = rendering || clips.some(({ status }) => status === "uploading" || status === "analyzing");
  const reset = () => {
    setClips([]);
    setError(null);
    setReel(null);
    firstFile.current = null;
  };

  return { clips, plan, busy, rendering, reel, error, addClips, createReel, reset };
}
