"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ReelResult from "@/components/reel-result";
import { CAPTION_MODES, REEL_LENGTHS, REEL_STYLES, type ClipVerdict, type ReelOptions } from "@/lib/plan";
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

function OptionsCard({ options, onChange, lengthS, shots }: {
  options: ReelOptions;
  onChange: (options: ReelOptions) => void;
  lengthS: number;
  shots: number;
}) {
  return (
    <section className="card">
      <h2>3. Nastavenie Reelu</h2>
      <div className="form">
        <label>
          Dĺžka
          <select
            value={options.lengthS}
            onChange={(event) => onChange({ ...options, lengthS: Number(event.target.value) as ReelOptions["lengthS"] })}
          >
            {REEL_LENGTHS.map((length) => <option key={length} value={length}>{length} s</option>)}
          </select>
        </label>
        <label>
          Štýl strihu
          <select
            value={options.style}
            onChange={(event) => onChange({ ...options, style: event.target.value as ReelOptions["style"] })}
          >
            {Object.entries(REEL_STYLES).map(([id, { label }]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label>
          Popisky vo videu
          <select
            value={options.captions}
            onChange={(event) => onChange({ ...options, captions: event.target.value as ReelOptions["captions"] })}
          >
            {Object.entries(CAPTION_MODES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={options.badges}
            onChange={(event) => onChange({ ...options, badges: event.target.checked })}
          />
          Odznak fázy stavby
        </label>
      </div>
      <p className="reason">Reel bude mať {Math.round(lengthS)} s, počet klipov: {shots}.</p>
    </section>
  );
}

export default function ReelApp({ stavbaId }: { stavbaId: string }) {
  const { clips, options, setOptions, setCaption, plan, busy, rendering, reel, error, addClips, createReel, reset } =
    useReel(stavbaId);
  const router = useRouter();
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
                {clip.analysis && options.captions !== "off" && !reel && (
                  <input
                    className="caption-input"
                    aria-label={`Popisok klipu ${clip.name}`}
                    maxLength={80}
                    value={clip.analysis.caption_seed}
                    disabled={busy}
                    onChange={(event) => setCaption(clip.id, event.target.value)}
                  />
                )}
              </li>
            ))}
          </ul>
          {uploading > 0 && <Loading text={`Nahrávam klipy (${uploading} zostáva)…`} />}
          {uploading === 0 && analyzing > 0 && <Loading text={`Analyzujem klipy (${analyzing} zostáva)…`} />}
        </section>
      )}

      {analyzed && !reel && (
        <OptionsCard options={options} onChange={setOptions} lengthS={plan.lengthS} shots={plan.timeline.length} />
      )}

      {analyzed && !reel && (
        <button className="big" disabled={busy || plan.timeline.length === 0} onClick={createReel}>
          {rendering ? "Vytváram Reel…" : "Vytvoriť Reel"}
        </button>
      )}

      {rendering && <Loading text="Vytváram Reel, môže to trvať do 4 minút" timer />}

      {reel && (
        <section className="card">
          <h2>4. Hotový Reel</h2>
          <ReelResult reel={reel} />
          <button
            onClick={() => {
              reset();
              router.refresh();
            }}
          >
            Nový Reel
          </button>
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
