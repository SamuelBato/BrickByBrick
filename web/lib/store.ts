import { del, get, list, put } from "@vercel/blob";
import { z } from "zod";

export type Stavba = { id: string; name: string; createdAt: string };
export type DiaryEntry = { id: string; date: string; text: string; createdAt: string };
export type SavedReel = { id: string; url: string; downloadUrl: string; popis: string; createdAt: string };

// Every record is its own immutable JSON blob, so two people writing at once cannot overwrite each other.
// The Blob store is public: privacy rests on the random ids in the paths, which only password holders can see.
const stavbaPath = (id: string) => `stavby/${id}.json`;
const entriesPath = (stavbaId: string) => `denniky/${stavbaId}/`;
const reelsPath = (stavbaId: string) => `reely-info/${stavbaId}/`;

export const isId = (value: unknown): value is string => z.uuid().safeParse(value).success;

function save(pathname: string, record: object) {
  return put(pathname, JSON.stringify(record), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

// shortcut: reads the first 1000 records of a folder, add the list cursor if a stavba ever gets more.
async function readAll<T>(prefix: string) {
  const { blobs } = await list({ prefix });
  const responses = await Promise.all(blobs.map(({ url }) => fetch(url)));
  // A record deleted right after the listing is skipped instead of breaking the page.
  return Promise.all(responses.filter(({ ok }) => ok).map((response) => response.json() as Promise<T>));
}

const newestFirst = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);

export async function listStavby() {
  return (await readAll<Stavba>("stavby/")).sort(newestFirst);
}

export async function getStavba(id: string) {
  if (!isId(id)) return null;
  // Skips the CDN, which would keep serving a deleted stavba for a minute.
  const result = await get(stavbaPath(id), { access: "public", useCache: false });
  return result?.statusCode === 200 ? ((await new Response(result.stream).json()) as Stavba) : null;
}

export async function createStavba(name: string) {
  const stavba: Stavba = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() };
  await save(stavbaPath(stavba.id), stavba);
  return stavba.id;
}

export async function removeStavba(id: string) {
  if (!isId(id)) return;
  const [entries, reelRecords, reels] = await Promise.all([
    list({ prefix: entriesPath(id) }),
    list({ prefix: reelsPath(id) }),
    listReels(id),
  ]);
  await del([
    ...entries.blobs.map(({ url }) => url),
    ...reelRecords.blobs.map(({ url }) => url),
    ...reels.map(({ url }) => url),
    stavbaPath(id),
  ]);
}

export async function listEntries(stavbaId: string) {
  return (await readAll<DiaryEntry>(entriesPath(stavbaId))).sort(
    (a, b) => b.date.localeCompare(a.date) || newestFirst(a, b),
  );
}

export async function addEntry(stavbaId: string, date: string, text: string) {
  const entry: DiaryEntry = { id: crypto.randomUUID(), date, text, createdAt: new Date().toISOString() };
  await save(`${entriesPath(stavbaId)}${entry.id}.json`, entry);
}

export async function removeEntry(stavbaId: string, entryId: string) {
  if (isId(stavbaId) && isId(entryId)) await del(`${entriesPath(stavbaId)}${entryId}.json`);
}

export async function listReels(stavbaId: string) {
  return (await readAll<SavedReel>(reelsPath(stavbaId))).sort(newestFirst);
}

export async function addReel(stavbaId: string, reel: Pick<SavedReel, "url" | "downloadUrl" | "popis">) {
  const saved: SavedReel = { ...reel, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  await save(`${reelsPath(stavbaId)}${saved.id}.json`, saved);
}
