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
    for (const sc of SCENARIOS) if (sc.events && !sc.total) for (const e of sc.events) if (e.iso && (e.iso < sc.start || e.iso > sc.end)) out.push(`${sc.id} event outside its dates: ${e.iso} ${e.t}`);
    for (const k of Object.values(CAR_PRELUDE).flat()) if (k.site && !ids.has(k.site)) out.push("prelude -> " + k.site);
    for (const pp of PEOPLE) if (pp.site && !ids.has(pp.site)) out.push("person -> " + pp.site);
    for (const s of SITES) if (!(s.lat > 24 && s.lat < 48 && s.lon > -92.5 && s.lon < -66)) out.push("site off map: " + s.id);
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
  await p.evaluate(() => needBase());
  await p.waitForFunction(() => baseFull, null, { timeout: 20000 });
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

await test("links: a shared link reopens the same war, timeline, date, site and view", async () => {
  await p.evaluate(() => selectSite("pa-gettysburg", false));
  await p.waitForTimeout(1500);
  const url = await p.evaluate(() => location.href.split("#")[0] + hashState());
  assert.match(url, /e=cw/); assert.match(url, /t=pa-1863/); assert.match(url, /d=1863-07-03/); assert.match(url, /s=pa-gettysburg/);
  const q = await page();
  await q.goto("about:blank"); await q.goto(url);
  await q.waitForFunction(() => typeof SCEN !== "undefined" && SCEN && SCEN.id === "pa-1863", null, { timeout: 20000 });
  const got = await q.evaluate(() => [era, selected, document.getElementById("tdate").textContent, toLatLon(W / 2, H / 2).map(v => v.toFixed(1)).join(",")]);
  assert.deepEqual(got.slice(0, 3), ["cw", "pa-gettysburg", "Jul 3, 1863"]);
  assert.equal(got[3], "39.8,-77.2");
  assert.deepEqual(q.errors, []);
  // old-style links still work
  await q.goto(base.replace("index.html", "") + "index.html#cowpens");
  await q.waitForTimeout(1500);
  assert.equal(await q.evaluate(() => selected), "cowpens");
});

await test("where am I: shows the location, nearest sites and the detecting zone", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 860 }, geolocation: { latitude: 42.4685, longitude: -71.3505, accuracy: 12 }, permissions: ["geolocation"] });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  const g = await ctx.newPage(); const errs = []; g.on("pageerror", e => errs.push(e.message));
  await g.goto(base); await g.waitForFunction(() => typeof SCEN !== "undefined" && SCEN, null, { timeout: 20000 });
  await g.click("#locate"); await g.waitForSelector("#homepop:not([hidden])", { timeout: 10000 });
  const txt = await g.locator("#homepop").innerText();
  assert.match(txt, /You are here/); assert.match(txt, /Massachusetts/); assert.match(txt, /Concord, North Bridge/); assert.match(txt, /Off-limits/);
  assert.deepEqual(errs, []);
  await ctx.close();
});

await test("offline: after one visit the map opens with no network", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 700 } });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  const o = await ctx.newPage();
  await o.goto(base);
  await o.waitForFunction(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && r.active); }, null, { timeout: 20000 });
  await o.waitForTimeout(1500);
  await ctx.setOffline(true);
  await o.reload();
  await o.waitForFunction(() => typeof BASE !== "undefined" && BASE && SITES.length > 200, null, { timeout: 20000 });
  assert.ok(await o.evaluate(() => document.querySelectorAll("#map g.site").length > 10));
  await ctx.close();
});

await test("load: light base map first, detail and homes only when zoomed in", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 860 } });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  const q = await ctx.newPage(); const got = [];
  q.on("request", r => { const f = r.url().split("/").pop(); if (f.endsWith(".json")) got.push(f); });
  await q.goto(base + "#e=rev&v=37,-80,40");
  await q.waitForFunction(() => typeof BASE !== "undefined" && BASE, null, { timeout: 20000 });
  await q.waitForTimeout(1200);
  assert.deepEqual(got.filter(f => f !== "manifest.webmanifest"), ["basemap-lo.json", "na.json"]);   // the light map, then the rest of the continent
  await q.evaluate(() => selectSite("camp", false));
  await q.waitForFunction(() => baseFull && HOMES.length > 1000, null, { timeout: 20000 });
  await ctx.close();
});

await test("battles: strengths and losses show for major battles", async () => {
  await p.evaluate(() => selectSite("pa-gettysburg", false)); await p.waitForTimeout(800);
  const txt = await p.locator("#pane").innerText();
  assert.match(txt, /Engaged/); assert.match(txt, /Union ~94,000/);
});

await test("follow: the followed army stays in view during playback", async () => {
  await p.evaluate(() => { setEra("rev", true); scenLock = "clt-rev"; setScenario("clt-rev"); setDay(dayOf("1780-12-20")); selForce = "light"; showTab("site"); });
  await p.click("#follow"); await p.waitForTimeout(900);
  await p.evaluate(() => document.getElementById("tplay").click()); await p.waitForTimeout(3000);
  const d = await p.evaluate(() => { stopPlay(); const f = FORCES.find(x => x.id === "light"), a = forceAt(f, tDay); const [x, y] = toScreen(a.lat, a.lon); return Math.hypot(x - W / 2, y - H / 2); });
  assert.ok(d < 120, "army is " + Math.round(d) + " px from the centre");
  await p.evaluate(() => { followF = null; });
});

await test("people: tracing Washington's path draws it", async () => {
  await p.evaluate(() => { setEra("rev", true); showTab("people"); showPath("George Washington"); });
  await p.waitForTimeout(1200);
  assert.ok(await p.locator("#map .ppath-line").count() === 1);
  assert.ok(await p.evaluate(() => PATH.wp.length) > 30);
  await p.click("#pathclear"); await p.waitForTimeout(300);
  assert.equal(await p.locator("#map .ppath-line").count(), 0);
});

await test("wars: French and Indian War and War of 1812 switch, show only their own sites, and link", async () => {
  for (const [w, home] of [["fiw", "fiw-necessity"], ["w12", "w12-fortmchenry"]]) {
    await p.click("#era-" + w); await p.waitForTimeout(600);
    const r = await p.evaluate(() => ({ era, scen: SCEN.era, sel: selected, own: SITES.filter(s => siteWar(s) === era).length,
      wrong: [...document.querySelectorAll("#map text")].filter(t => /^(Cowpens|Kings Mountain|Gettysburg|Fort Fisher)$/.test(t.textContent)).length,
      tl: [...document.getElementById("tscen").options].every(o => SCENARIOS.find(x => x.id === o.value).era === era) }));
    assert.equal(r.era, w); assert.equal(r.scen, w); assert.equal(r.sel, home); assert.ok(r.own >= 15, w + " sites"); assert.equal(r.wrong, 0); assert.ok(r.tl, w + " timelines");
    for (const t of ["story", "people", "visit", "library"]) { await p.evaluate((t) => showTab(t), t); assert.ok((await p.locator("#pane li, #pane details, #pane a[href^='http']").count()) > 0, w + " " + t + " is empty"); }
  }
  await p.evaluate(() => selectSite("fiw-carillon", false)); await p.waitForTimeout(500);
  assert.deepEqual(await p.evaluate(() => [era, SCEN.id, curIso()]), ["fiw", "fiw-lakes", "1758-07-08"]);
  await p.evaluate(() => selectSite("w12-neworleans", false)); await p.waitForTimeout(500);
  assert.deepEqual(await p.evaluate(() => [era, SCEN.id, curIso()]), ["w12", "w12-south", "1815-01-08"]);
  await p.evaluate(() => { setEra("rev", true); showTab("site"); });
});

await test("maps: sites and searched addresses link to Google Maps and Apple Maps", async () => {
  await p.evaluate(() => { selectSite("cowpens", false); });
  await p.waitForTimeout(300);
  const href = await p.locator('#pane a:has-text("Open in Apple Maps")').getAttribute("href");
  assert.match(href, /^https:\/\/maps\.apple\.com\/\?ll=35\.1\d+,-81\.8\d+&q=/);
  await p.evaluate(() => openPin({ lat: 35.0855, lon: -80.7266, label: "100 Main St, Matthews, NC" }));
  const ap = await p.locator('#homepop a:has-text("Apple Maps")').getAttribute("href");
  assert.ok(ap.includes("q=100%20Main%20St%2C%20Matthews%2C%20NC"), ap);
  assert.equal(await p.locator('#homepop a:has-text("Google Maps")').count(), 1);
  await p.evaluate(() => { pin = null; closeHome(); });
});

await test("buildings: zooming in on a site outside the Carolinas loads its buildings", async () => {
  await p.evaluate(() => selectSite("va-williamsburg", false));
  await p.waitForFunction(() => HOMES.some(h => h.site === "va-williamsburg"), null, { timeout: 15000 });
  const r = await p.evaluate(() => {
    const hm = HOMES.find(h => h.site === "va-williamsburg" && h.addr);
    openHome(hm, false);
    return { n: HOMES.filter(h => h.site === "va-williamsburg").length, title: document.querySelector("#homepop .addr").textContent, kind: hm.kind };
  });
  assert.ok(r.n > 50, "buildings loaded: " + r.n);
  assert.match(r.title, /^\d+ /);
  assert.ok(r.kind);
  await p.evaluate(() => closeHome());
});

await test("sources: sites, people and events link to outside sources", async () => {
  await p.evaluate(() => { selectSite("cowpens", false); });
  await p.waitForTimeout(300);
  const hrefs = await p.$$eval("#pane ul.srcs a", as => as.map(a => a.href));
  assert.ok(hrefs.some(h => h.startsWith("https://en.wikipedia.org/wiki/")), hrefs.join(" "));
  assert.ok(hrefs.some(h => h.startsWith("https://www.battlefields.org/learn/")), hrefs.join(" "));
  const r = await p.evaluate(() => {
    const bad = [];
    const all = [...Object.values(SRC.s), ...Object.values(SRC.p), ...Object.values(SRC.e)].flat();
    for (const x of all) { const u = srcURL(x); if (!/^https:\/\/[a-z.]+\//.test(u)) bad.push(u); }
    const ids = new Set(SITES.map(s => s.id)), names = new Set(PEOPLE.map(q => q.n));
    for (const id of Object.keys(SRC.s)) if (!ids.has(id)) bad.push("site " + id);
    for (const n of Object.keys(SRC.p)) if (!names.has(n)) bad.push("person " + n);
    return { bad, n: all.length, sites: Object.keys(SRC.s).length };
  });
  assert.deepEqual(r.bad, []);
  assert.ok(r.sites > 300, "sites with sources: " + r.sites);
});

await test("north america: the rest of the continent shows each war's borders for the slider date", async () => {
  await p.waitForFunction(() => NA !== null, null, { timeout: 15000 });
  const r = await p.evaluate(() => {
    const out = {};
    setEra("fiw", true);
    setScenario(SCENARIOS.filter(x => x.era === "fiw").sort((a, b) => b.events.length - a.events.length)[0].id);   // the whole war
    for (const [k, iso] of [["fiw55", "1755-07-09"], ["fiw63", "1763-06-01"]]) {
      setDay(dayOf(iso));
      view.cx = -90 * K; view.cy = -42; view.s = 16; render();
      out[k] = { iso: curIso(), scen: SCEN.id, days: DAYS, b: document.querySelectorAll("#map .na-b").length, es: document.querySelectorAll("#map .na-es").length,
                 labels: [...document.querySelectorAll("#map .na-label")].map(t => t.textContent), key: document.querySelector(".nakey")?.textContent || "" };
    }
    setEra("rev", true);
    return out;
  });
  assert.ok(r.fiw55.b > 0 && r.fiw55.labels.includes("NEW FRANCE"), JSON.stringify(r.fiw55));
  assert.ok(r.fiw63.es > 0 && r.fiw63.labels.some(t => t.startsWith("CANADA")), JSON.stringify(r.fiw63));
  assert.match(r.fiw55.key, /French/);
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
