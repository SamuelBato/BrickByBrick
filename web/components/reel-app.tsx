"use client";

import { useEffect, useState } from "react";
import type { ClipVerdict } from "@/lib/plan";
import { useReel, type ReelClip } from "@/lib/use-reel";

function Chip({ clip, verdict }: { clip: ReelClip; verdict?: ClipVerdict }) {
  if (clip.status === "uploading") return <span className="chip">Nahrávam {Math.round(clip.progress)} %</span>;
  if (clip.status === "analyzing") return <span className="chip">Analyzujem…</span>;
  if (clip.status === "error") return <span className="chip chip-bad">Chyba</span>;
  if (verdict?.status === "used") return <span className="chip chip-ok">Použitý</span>;
  return <span className="chip">Náhradný</span>;
}

// Counts seconds while mounted, so a long render never looks frozen.
function Stopwatch() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  return <span className="stopwatch">{seconds} s</span>;
}

function Loading({ text, timer }: { text: string; timer?: boolean }) {
  return (
    <div className="loading" role="status">
      <video className="loading-video" src="/loading.mp4" autoPlay loop muted playsInline aria-hidden />
      <p>
        {text}
        {timer && <Stopwatch />}
      </p>
    </div>
  );
}

export default function ReelApp() {
  const { clips, plan, busy, rendering, reel, error, addClips, createReel, reset } = useReel();
  const [files, setFiles] = useState<File[]>([]);
  const verdictOf = (id: string) => plan.verdicts.find((verdict) => verdict.id === id);
  const uploading = clips.filter(({ status }) => status === "uploading").length;
  const analyzing = clips.filter(({ status }) => status === "analyzing").length;
  const analyzed = clips.length > 0 && uploading + analyzing === 0;

  return (
    <div className="stack">
      <section className="card">
        <h2>1. Vyber klipy zo stavby</h2>
        <input
          type="file"
          accept="video/*"
          multiple
          disabled={busy}
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
        <button
          disabled={busy || files.length === 0}
          onClick={() => {
            addClips(files);
            setFiles([]);
          }}
        >
          Spracovať
        </button>
      </section>

      {clips.length > 0 && (
        <section className="card">
          <h2>2. Klipy</h2>
          <ul className="clips">
            {clips.map((clip) => (
              <li key={clip.id}>
                <span className="clip-name">{clip.name}</span>
                <Chip clip={clip} verdict={verdictOf(clip.id)} />
                {clip.error && <span className="reason">{clip.error}</span>}
              </li>
            ))}
          </ul>
          {uploading > 0 && <Loading text={`Nahrávam klipy (${uploading} zostáva)…`} />}
          {uploading === 0 && analyzing > 0 && <Loading text={`Analyzujem klipy (${analyzing} zostáva)…`} />}
        </section>
      )}

      {analyzed && !reel && (
        <button className="big" disabled={busy || plan.timeline.length === 0} onClick={createReel}>
          {rendering ? "Vytváram Reel…" : "Vytvoriť Reel"}
        </button>
      )}

      {rendering && <Loading text="Vytváram Reel, môže to trvať do 2 minút" timer />}

      {reel && (
        <section className="card">
          <h2>3. Hotový Reel</h2>
          <video className="reel" src={reel.url} controls playsInline />
          <a className="button big" href={reel.downloadUrl} download="brickbybrick-reel.mp4">
            Stiahnuť MP4
          </a>
          <button onClick={reset}>Nový Reel</button>
        </section>
      )}

      {error && (
        <section className="card card-error">
          <p>{error}</p>
          {analyzed && plan.timeline.length > 0 && !reel && (
            <button disabled={busy} onClick={createReel}>Skúsiť znova</button>
          )}
          <button disabled={busy} onClick={reset}>Začať odznova</button>
        </section>
      )}
    </div>
  );
}
