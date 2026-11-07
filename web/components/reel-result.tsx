"use client";

import { useState } from "react";

export default function ReelResult({ reel }: { reel: { url: string; downloadUrl: string; popis: string } }) {
  const [copied, setCopied] = useState(false);

  return (
    <>
      <video className="reel" src={reel.url} controls playsInline preload="metadata" />
      <a className="button big" href={reel.downloadUrl} download="brickbybrick-reel.mp4">
        Stiahnuť MP4
      </a>
      {reel.popis && (
        <div className="form">
          <label>
            Popis na Instagram
            <textarea readOnly rows={6} value={reel.popis} />
          </label>
          <button onClick={() => navigator.clipboard.writeText(reel.popis).then(() => setCopied(true))}>
            {copied ? "Skopírované" : "Kopírovať popis"}
          </button>
        </div>
      )}
    </>
  );
}
