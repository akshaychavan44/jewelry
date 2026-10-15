export function GET() {
  return Response.json({ uploadthing: Boolean(process.env.UPLOADTHING_TOKEN?.trim()) }, { headers: { "Cache-Control": "no-store" } });
}
