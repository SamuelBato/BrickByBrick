// Only files in our own Blob store are accepted, so a request cannot point the server at another address.
export function isOwnBlobUrl(value: unknown, token: string | undefined) {
  // Token format: vercel_blob_rw_<storeId>_<secret>
  const storeId = token?.split("_")[3];
  if (typeof value !== "string" || !storeId) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === `${storeId.toLowerCase()}.public.blob.vercel-storage.com`;
  } catch {
    return false;
  }
}
