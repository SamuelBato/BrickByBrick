"use client";

import { upload } from "@vercel/blob/client";
import { useMemo, useState } from "react";
import type { AssetAnalysis } from "./analysis-schema";
import { MAX_CLIP_BYTES, MAX_CLIPS, planReel } from "./plan";

const PARALLEL_CLIPS = 3;

export type ReelClip = {
  id: string;
  name: string;
  status: "uploading" | "analyzing" | "done" | "error";
  progress: number;
  url?: string;
  durationS?: number;
  analysis?: AssetAnalysis;
  error?: string;
};

export function useReel() {
  const [clips, setClips] = useState<ReelClip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [reel, setReel] = useState<{ url: string; downloadUrl: string } | null>(null);

  const update = (id: string, patch: Partial<ReelClip>) =>
    setClips((current) => current.map((clip) => (clip.id === id ? { ...clip, ...patch } : clip)));

  async function processClip(id: string, file: File) {
    try {
      if (!file.type.startsWith("video/")) throw new Error("Súbor nie je video.");
      if (file.size > MAX_CLIP_BYTES) throw new Error("Klip je väčší ako 500 MB.");

      const { url } = await upload(`klipy/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        multipart: true,
        onUploadProgress: ({ percentage }) => update(id, { progress: percentage }),
      }).catch(() => {
        throw new Error("Nahrávanie klipu zlyhalo.");
      });
      update(id, { status: "analyzing", url });

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const result = await response.json().catch(() => ({ error: "Analýza klipu zlyhala." }));
      if (!response.ok) throw new Error(result.error);

      update(id, { status: "done", analysis: result.analysis, durationS: result.durationS });
    } catch (failure) {
      update(id, { status: "error", error: (failure as Error).message });
    }
  }

  async function addClips(files: File[]) {
    if (clips.length + files.length > MAX_CLIPS) {
      setError(`Naraz sa dá spracovať najviac ${MAX_CLIPS} klipov.`);
      return;
    }
    setError(null);

    const queue = files.map((file) => ({ file, id: crypto.randomUUID() }));
    setClips((current) => [
      ...current,
      ...queue.map(({ file, id }): ReelClip => ({ id, name: file.name, status: "uploading", progress: 0 })),
    ]);

    await Promise.all(
      Array.from({ length: PARALLEL_CLIPS }, async () => {
        for (let next = queue.shift(); next; next = queue.shift()) await processClip(next.id, next.file);
      }),
    );
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

  // The server deletes these clips from Blob after a successful render.
  async function createReel() {
    setRendering(true);
    setError(null);
    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clips: clips.filter((clip) => clip.analysis && clip.url) }),
      });
      const result = await response.json().catch(() => ({ error: "Render zlyhal." }));
      if (!response.ok) throw new Error(result.error);
      setReel(result);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setRendering(false);
    }
  }

  const busy = rendering || clips.some(({ status }) => status === "uploading" || status === "analyzing");
  const reset = () => {
    const urls = clips.flatMap(({ url }) => (url ? [url] : []));
    if (urls.length > 0) {
      fetch("/api/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      }).catch((failure) => console.error("cleanup failed", failure));
    }
    setClips([]);
    setError(null);
    setReel(null);
  };

  return { clips, plan, busy, rendering, reel, error, addClips, createReel, reset };
}
