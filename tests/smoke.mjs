// Smoke tests for the map. Run: npm test (or node tests/smoke.mjs).
// Serves the folder on a local port, blocks all outside network so results do not depend on
// third-party services, and checks data integrity, timelines, search, the panel and popups.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium, devices } from "playwright";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const types = { ".html": "text/html", ".json": "application/json", ".js": "text/javascript", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/\/$/, "/index.html"));
  if (!p.startsWith(root) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/index.html`;

const browser = await chromium.launch();
let failures = 0;
const results = [];
async function test(name, fn) {
  const t0 = Date.now();
  try { await fn(); results.push(`ok   ${name} (${Date.now() - t0} ms)`); }
  catch (e) { failures++; results.push(`FAIL ${name}\n     ${String(e.message || e).split("\n").join("\n     ")}`); }
}
async function page(opts = { viewport: { width: 1300, height: 860 } }) {
  const ctx = await browser.newContext(opts);
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());   // no outside network
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", e => p.errors.push(e.message));
  await p.goto(base);
  await p.waitForFunction(() => typeof BASE !== "undefined" && BASE && typeof SCEN !== "undefined" && SCEN, null, { timeout: 30000 });
  return p;
}

const p = await page();

await test("data: every reference resolves", async () => {
  const bad = await p.evaluate(() => {
    const ids = new Set(SITES.map(s => s.id)), out = [];
    if (ids.size !== SITES.length) out.push("duplicate site ids");
    for (const sc of SCENARIOS) {
      for (const e of sc.events || []) if (e.site && !ids.has(e.site)) out.push(`${sc.id} event -> ${e.site}`);
      for (const f of sc.forces || []) for (let i = 1; i < f.wp.length; i++) if (f.wp[i][0] < f.wp[i - 1][0]) out.push(`${sc.id}/${f.id} waypoints out of order`);
      if (sc.start >= sc.end) out.push(`${sc.id} start after end`);
    }
    for (const k of Object.values(CAR_PRELUDE).flat()) if (k.site && !ids.has(k.site)) out.push("prelude -> " + k.site);
    for (const pp of PEOPLE) if (pp.site && !ids.has(pp.site)) out.push("person -> " + pp.site);
    for (const s of SITES) if (!(s.lat > 24 && s.lat < 48 && s.lon > -91 && s.lon < -66)) out.push("site off map: " + s.id);
    return out;
  });
  assert.deepEqual(bad, []);
});

await test("data: sites with a state prefix sit in that state", async () => {
  const wrong = await p.evaluate(() => {
    const pre = { va: "VA", wv: "WV", tn: "TN", ga: "GA", fl: "FL", ma: "MA", me: "ME", nh: "NH", vt: "VT", ny: "NY", nj: "NJ", pa: "PA", de: "DE", ct: "CT", ri: "RI", md: "MD", dc: "DC", ky: "KY", oh: "OH", in: "IN", ms: "MS" };
    return SITES.filter(s => pre[s.id.split("-")[0]] && siteState(s) !== pre[s.id.split("-")[0]]).map(s => s.id + "=" + siteState(s));
  });
  assert.deepEqual(wrong, []);
});

await test("timelines: selecting a site jumps to its timeline and date", async () => {
  for (const [id, scen, date] of [["cowpens", "clt-rev", "Jan 17, 1781"], ["va-yorktown", "va-1781", "Oct 19, 1781"], ["pa-gettysburg", "pa-1863", "Jul 3, 1863"], ["fortfisher", "nc-fisher", "Jan 15, 1865"]]) {
    await p.evaluate(id => selectSite(id, false), id);
    await p.waitForTimeout(900);
    const got = await p.evaluate(() => [SCEN.id, document.getElementById("tdate").textContent]);
    assert.deepEqual(got, [scen, date], id);
  }
});

await test("timelines: the slider follows the map view", async () => {
  await p.evaluate(() => { scenLock = null; setEra("rev", true); fit([34.6, -81.2, 35.4, -80.4], false); });
  await p.waitForTimeout(900);
  assert.equal(await p.evaluate(() => SCEN.id), "clt-rev");
  await p.evaluate(() => setPreset("region"));
  await p.waitForTimeout(1400);
  assert.equal(await p.evaluate(() => SCEN.id), "all-rev");
});

await test("search: cities, states, sites and 'City, ST'", async () => {
  const top = async (q) => p.evaluate(q => searchPlaces(q).slice(0, 2).map(r => r.kind + ":" + r.label), q);
  assert.equal((await top("Boston"))[0], "place:Boston");
  assert.equal((await top("Virginia"))[0], "state:Virginia");
  assert.ok((await top("Richmond, VA")).every(x => !x.startsWith("place:") || x === "place:Richmond"));
  assert.ok((await top("Saint Augustine")).some(x => x.includes("St. Augustine")));
  assert.ok((await p.evaluate(() => searchPlaces("Gettysburg").map(r => r.kind))).includes("site"));
});

await test("popups: each battle shows once during playback", async () => {
  await p.evaluate(() => { setEra("rev", true); scenLock = "clt-rev"; setScenario("clt-rev"); setDay(dayOf("1780-07-25")); popSeen.clear(); POPS = []; window.__seen = []; });
  await p.evaluate(() => { window.__iv = setInterval(() => { for (const q of POPS) window.__seen.push(q.t.site + "@" + Math.round(q.born)); }, 100); document.getElementById("tplay").click(); });
  await p.waitForTimeout(6000);
  const sites = await p.evaluate(() => { clearInterval(window.__iv); stopPlay(); return [...new Set(window.__seen)].map(k => k.split("@")[0]); });
  assert.ok(sites.length >= 3, "too few popups: " + sites.length);
  assert.equal(new Set(sites).size, sites.length, "repeated: " + sites.join(" "));
});

await test("panel: hides and comes back", async () => {
  const w0 = await p.evaluate(() => wrap.clientWidth);
  await p.click("#phide"); await p.waitForTimeout(600);
  assert.ok(await p.evaluate(() => wrap.clientWidth) > w0);
  await p.click("#pshow"); await p.waitForTimeout(600);
  assert.equal(await p.evaluate(() => wrap.clientWidth), w0);
});

await test("map: a drag leaves no transform behind", async () => {
  const box = await p.locator("#map").boundingBox();
  await p.mouse.move(box.x + 300, box.y + 300); await p.mouse.down();
  await p.mouse.move(box.x + 420, box.y + 360, { steps: 10 }); await p.mouse.up();
  await p.waitForTimeout(400);
  assert.ok(await p.evaluate(() => svg.style.transform === "" && !svg.classList.contains("moving")));
});

await test("no script errors on desktop", async () => { assert.deepEqual(p.errors, []); });

await test("phone: no horizontal scroll, no errors", async () => {
  const m = await page({ ...devices["iPhone 13"] });
  assert.equal(await m.evaluate(() => document.documentElement.scrollWidth), 390);
  await m.selectOption("#stsel", "GA"); await m.waitForTimeout(800);
  assert.deepEqual(m.errors, []);
});

await browser.close();
server.close();
console.log(results.join("\n"));
console.log(failures ? `\n${failures} failed` : "\nall passed");
process.exit(failures ? 1 : 0);
