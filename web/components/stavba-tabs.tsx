"use client";

import { useState, type ReactNode } from "react";

export default function StavbaTabs({ reels, diary }: { reels: ReactNode; diary: ReactNode }) {
  const [showDiary, setShowDiary] = useState(false);

  return (
    <>
      <div className="tabs">
        <button className={showDiary ? "quiet" : undefined} aria-pressed={!showDiary} onClick={() => setShowDiary(false)}>
          Reely
        </button>
        <button className={showDiary ? undefined : "quiet"} aria-pressed={showDiary} onClick={() => setShowDiary(true)}>
          Stavbársky denník
        </button>
      </div>
      {/* Both stay mounted, so a Reel in progress survives a look at the diary. */}
      <div className="stack tab-panel" hidden={showDiary}>{reels}</div>
      <div className="stack tab-panel" hidden={!showDiary}>{diary}</div>
    </>
  );
}
