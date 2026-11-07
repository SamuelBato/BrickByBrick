"use client";

import { useReel } from "@/lib/use-reel";

// Technical page for testing the backend until the real screen from Marco is connected.
export default function BackendPage() {
  const { clips, plan, busy, rendering, reel, error, addClips, createReel, reset } = useReel();

  return (
    <main>
      <h1>Technická stránka</h1>
      <input
        type="file"
        accept="video/*"
        multiple
        disabled={busy}
        onChange={(event) => {
          addClips(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <button type="button" disabled={busy} onClick={reset}>
        Vymazať
      </button>
      {error && <p role="alert">{error}</p>}

      <ul>
        {clips.map((clip) => {
          const verdict = plan.verdicts.find(({ id }) => id === clip.id);
          return (
            <li key={clip.id}>
              {clip.name}: {clip.status} {clip.status === "uploading" && `${Math.round(clip.progress)} %`}
              {clip.error && ` – ${clip.error}`}
              {verdict && ` – ${verdict.status}${verdict.reason ? ` (${verdict.reason})` : ""}`}
              {clip.analysis && ` – ${clip.analysis.caption_seed}`}
            </li>
          );
        })}
      </ul>

      <p>Stav: {plan.gate}</p>
      {plan.warnings.map((warning) => (
        <p key={warning}>{warning}</p>
      ))}

      <button type="button" disabled={busy || reel !== null || plan.gate !== "ready"} onClick={createReel}>
        {rendering ? "Vytváram Reel…" : "Vytvoriť Reel"}
      </button>
      {reel && (
        <p>
          <video src={reel.url} controls width={270} />
          <br />
          <a href={reel.downloadUrl}>Stiahnuť MP4</a>
        </p>
      )}
    </main>
  );
}
