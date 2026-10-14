import { readdir, readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";

const origin = process.argv[2] || process.env.AUDIT_ORIGIN || "http://localhost:3000";
const root = process.cwd();
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]))).flat();
}
const pageFiles = (await files(path.join(root, "src/app"))).filter(f => f.endsWith(`${path.sep}page.tsx`));
const staticRoutes = pageFiles.map(f => path.relative(path.join(root, "src/app"), path.dirname(f)).split(path.sep).filter(s => s && !s.startsWith("(")).join("/")).filter(s => !s.includes("[")).map(s => `/${s}`);
const queue = [...new Set(staticRoutes)];
const seen = new Set();
const results = [];
const links = [];
const missingAssets = new Map();
const fragments = [];
const pages = new Map();
const decode = s => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

async function inspect(route) {
  let result;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(new URL(route, origin), { signal: AbortSignal.timeout(60000) });
      const html = await response.text();
      const destination = new URL(response.url).pathname;
      result = { route, status: response.status, destination, title: decode(html.match(/<title>(.*?)<\/title>/s)?.[1] || ""), error: /Application error:|Internal Server Error|data-next-error/.test(html) };
      pages.set(route, html);
      if (response.ok && destination === route) {
        for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>/g)) {
          const href = decode(match[1]);
          if (!href || href === "#") links.push({ source: route, href, issue: "Empty navigation target" });
          let url;
          try { url = new URL(href, new URL(route, origin)); } catch { links.push({ source: route, href, issue: "Invalid URL" }); continue; }
          if (url.origin !== origin) continue;
          if (url.hash) fragments.push({ source: route, target: url.pathname, hash: decodeURIComponent(url.hash.slice(1)) });
          if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/api/")) continue;
          if (/\.(pdf|png|jpe?g|webp|mp4|svg|ico)$/i.test(url.pathname)) continue;
          links.push({ source: route, href, target: url.pathname });
          if (!seen.has(url.pathname) && !queue.includes(url.pathname)) queue.push(url.pathname);
        }
        for (const match of html.matchAll(/\b(?:src|poster)="(\/media\/[^"?]+|\/images\/[^"?]+)"/g)) {
          const asset = decode(match[1]);
          try { await access(path.join(root, "public", decodeURIComponent(asset))); }
          catch { missingAssets.set(asset, route); }
        }
      }
      break;
    } catch (error) { result = { route, status: null, error: String(error) }; }
  }
  results.push(result);
  if (result.status >= 400 || result.error) console.log("FAIL", JSON.stringify(result));
}

while (queue.some(r => !seen.has(r)) && seen.size < 250) {
  const batch = queue.filter(r => !seen.has(r)).slice(0, 3);
  batch.forEach(r => seen.add(r));
  await Promise.all(batch.map(inspect));
  if (seen.size % 15 === 0) console.log(`Checked ${seen.size} routes`);
}
const brokenFragments = fragments.filter(f => {
  const html = pages.get(f.target);
  return html && !html.includes(`id="${f.hash}"`) && !html.includes(`name="${f.hash}"`) && !results.find(r => r.route === f.target && r.destination !== f.target);
});
const failures = results.filter(r => r.status >= 400 || r.error || r.status === null);
const brokenLinks = links.filter(l => l.issue || failures.some(f => f.route === l.target));
const report = { date: new Date().toISOString(), origin, staticPageCount: staticRoutes.length, checkedRouteCount: results.length, results, brokenLinks, brokenFragments, missingAssets: [...missingAssets].map(([asset, source]) => ({ asset, source })), limitations: ["HTTP checks are unauthenticated, do not execute JavaScript, and do not submit forms.", "Protected-page redirects are checked; authenticated content requires browser verification.", "Remote destinations and external side effects are excluded."] };
await mkdir(path.join(root, "docs"), { recursive: true });
await writeFile(path.join(root, "docs/project-route-audit.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ checked: results.length, failures, brokenLinkCount: brokenLinks.length, brokenFragmentCount: brokenFragments.length, missingAssets: report.missingAssets }, null, 2));
process.exitCode = failures.length || brokenLinks.length || brokenFragments.length || missingAssets.size ? 1 : 0;
