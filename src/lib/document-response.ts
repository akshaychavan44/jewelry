/** Local PDFs can request individual byte ranges instead of downloading the
 * entire document before displaying a page. Private responses remain uncached. */
export function documentResponse(bytes: Uint8Array, mimeType: string, fileName: string, download: boolean, range: string | null) {
  const name = fileName.replace(/[^\w.\- ]+/g, "_");
  const headers = new Headers({
    "Content-Type": mimeType,
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  });
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    const suffix = match && !match[1] ? Number(match[2]) : undefined;
    const start = suffix !== undefined ? Math.max(0, bytes.length - suffix) : Number(match?.[1]);
    const end = suffix !== undefined || !match?.[2] ? bytes.length - 1 : Math.min(Number(match[2]), bytes.length - 1);
    if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || suffix === 0 || start > end || start >= bytes.length) {
      headers.set("Content-Range", `bytes */${bytes.length}`);
      return new Response(null, { status: 416, headers });
    }
    const body = bytes.slice(start, end + 1);
    headers.set("Content-Range", `bytes ${start}-${end}/${bytes.length}`);
    headers.set("Content-Length", String(body.length));
    return new Response(new Uint8Array(body), { status: 206, headers });
  }
  headers.set("Content-Length", String(bytes.length));
  return new Response(new Uint8Array(bytes), { headers });
}
