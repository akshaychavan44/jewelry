import "server-only";
import { db, type Tx } from "@/server/db";

type Counts = { profileViews: number; jewelryViews: number; contactClicks: number };
type Daily = { date: string; views: number; contacts: number; enquiries: number };
export async function getJewelerAnalytics(sellerId: string, days: number, executor: Pick<Tx, "$queryRaw"> = db, now = new Date()) {
  const range = [7, 30, 90].includes(days) ? days : 30;
  const until = new Date(now); until.setUTCHours(0, 0, 0, 0); until.setUTCDate(until.getUTCDate() + 1);
  const since = new Date(until); since.setUTCDate(since.getUTCDate() - range);
  const [counts, enquiries, channels, products, activity] = await Promise.all([
    executor.$queryRaw<Counts[]>`SELECT COUNT(*) FILTER (WHERE "type" = 'STORE_VIEW')::int AS "profileViews", COUNT(*) FILTER (WHERE "type" = 'PRODUCT_VIEW')::int AS "jewelryViews", COUNT(*) FILTER (WHERE "type" = 'PAGE_VIEW' AND "metadata"->>'event' = 'contact_click')::int AS "contactClicks" FROM "AnalyticsEvent" WHERE "sellerId" = ${sellerId} AND "createdAt" >= ${since} AND "createdAt" < ${until}`,
    executor.$queryRaw<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM "CustomRequest" WHERE "sellerId" = ${sellerId} AND "createdAt" >= ${since} AND "createdAt" < ${until}`,
    executor.$queryRaw<{ channel: string; count: number }[]>`SELECT "metadata"->>'channel' AS channel, COUNT(*)::int AS count FROM "AnalyticsEvent" WHERE "sellerId" = ${sellerId} AND "type" = 'PAGE_VIEW' AND "metadata"->>'event' = 'contact_click' AND "createdAt" >= ${since} AND "createdAt" < ${until} GROUP BY "metadata"->>'channel' ORDER BY count DESC`,
    executor.$queryRaw<{ id: string; title: string; views: number }[]>`SELECT p.id, p.title, COUNT(*)::int AS views FROM "AnalyticsEvent" e JOIN "Product" p ON p.id = e."productId" AND p."sellerId" = e."sellerId" WHERE e."sellerId" = ${sellerId} AND e.type = 'PRODUCT_VIEW' AND e."createdAt" >= ${since} AND e."createdAt" < ${until} AND p."deletedAt" IS NULL GROUP BY p.id, p.title ORDER BY views DESC, p.title ASC LIMIT 5`,
    executor.$queryRaw<Daily[]>`SELECT date, SUM(views)::int AS views, SUM(contacts)::int AS contacts, SUM(enquiries)::int AS enquiries FROM (
      SELECT to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date, COUNT(*) FILTER (WHERE type IN ('STORE_VIEW', 'PRODUCT_VIEW')) AS views, COUNT(*) FILTER (WHERE type = 'PAGE_VIEW' AND "metadata"->>'event' = 'contact_click') AS contacts, 0 AS enquiries FROM "AnalyticsEvent" WHERE "sellerId" = ${sellerId} AND "createdAt" >= ${since} AND "createdAt" < ${until} GROUP BY date
      UNION ALL SELECT to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date, 0 AS views, 0 AS contacts, COUNT(*) AS enquiries FROM "CustomRequest" WHERE "sellerId" = ${sellerId} AND "createdAt" >= ${since} AND "createdAt" < ${until} GROUP BY date
    ) daily GROUP BY date ORDER BY date`,
  ]);
  const byDate = new Map(activity.map(row => [row.date, row]));
  const daily = Array.from({ length: range }, (_, i) => { const date = new Date(since); date.setUTCDate(date.getUTCDate() + i); const key = date.toISOString().slice(0, 10); return byDate.get(key) ?? { date: key, views: 0, contacts: 0, enquiries: 0 }; });
  return { ...counts[0], enquiries: enquiries[0].count, channels, products, daily, range, since, until };
}
