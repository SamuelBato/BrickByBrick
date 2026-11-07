import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isOwnBlobUrl } from "@/lib/blob-url";
import { MAX_CLIPS } from "@/lib/plan";

// Removes uploaded clips that will not be rendered, because their Blob addresses are public.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const urls: unknown = body?.urls;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (
    !Array.isArray(urls) ||
    urls.length === 0 ||
    urls.length > MAX_CLIPS ||
    !urls.every((url) => isOwnBlobUrl(url, token))
  ) {
    return NextResponse.json({ error: "Neplatné adresy klipov." }, { status: 400 });
  }

  try {
    await del(urls as string[]);
    return NextResponse.json({ deleted: urls.length });
  } catch (error) {
    console.error("cleanup failed", error);
    return NextResponse.json({ error: "Klipy sa nepodarilo zmazať." }, { status: 502 });
  }
}
