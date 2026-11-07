import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

const FONT_FILE = join(process.cwd(), "fonts", "ArchivoBlack-Regular.ttf");

// The ffmpeg-static Linux build has no drawtext filter, so text is drawn into transparent PNGs that ffmpeg overlays.
async function textImage(text: string, position: "top" | "center" | "bottom", background: string, fontSize: number) {
  const font = await readFile(FONT_FILE);
  const image = new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        justifyContent: "center",
        // Keeps text above and below the Instagram interface.
        alignItems: { top: "flex-start", center: "center", bottom: "flex-end" }[position],
        padding: "230px 60px 380px",
      }}
    >
      <div
        style={{
          display: "flex",
          textAlign: "center",
          color: "white",
          backgroundColor: background,
          borderRadius: 12,
          padding: "18px 28px",
          fontSize,
          lineHeight: 1.25,
        }}
      >
        {text}
      </div>
    </div>,
    {
      width: 1080,
      height: 1920,
      fonts: [{ name: "Archivo Black", data: font, weight: 400, style: "normal" }],
    },
  );
  return Buffer.from(await image.arrayBuffer());
}

export const captionImage = (text: string, position: "center" | "bottom") =>
  textImage(text, position, "rgba(0,0,0,0.6)", position === "center" ? 84 : 64);
export const badgeImage = (text: string) => textImage(text, "top", "#9C3F28", 52);
