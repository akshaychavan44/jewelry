import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { BRAND_INTRO_DURATION, BRAND_INTRO_SESSION_KEY, brandIntroScript } from "./intro-script";

function browserFixture({ desktop = true, reduced = false, path = "/shop", seen = false, storageBlocked = false } = {}) {
  const dataset: Record<string, string> = {};
  const storage = new Map<string, string>(seen ? [[BRAND_INTRO_SESSION_KEY, "seen"]] : []);
  const timers: { callback: () => void; delay: number }[] = [];
  const events: string[] = [];
  let image: unknown = null;
  const context = {
    document: { documentElement: { dataset }, querySelector: () => image, addEventListener: () => {}, removeEventListener: () => {} },
    location: { pathname: path },
    performance: { now: () => 125 },
    matchMedia: (query: string) => ({ matches: query.includes("1024") ? desktop : reduced, addEventListener: () => {}, removeEventListener: () => {} }),
    MutationObserver: class { observe() {} disconnect() {} },
    requestAnimationFrame: (callback: () => void) => callback(),
    innerWidth: 1366,
    innerHeight: 900,
    sessionStorage: {
      getItem: (key: string) => { if (storageBlocked) throw new Error("Storage blocked"); return storage.get(key); },
      setItem: (key: string, value: string) => storage.set(key, value),
    },
    window: {
      setTimeout: (callback: () => void, delay: number) => timers.push({ callback, delay }),
      dispatchEvent: (event: Event) => { events.push(event.type); },
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    Event,
  };
  return { dataset, storage, timers, events, setImage: (value: unknown) => { image = value; }, run: () => runInNewContext(brandIntroScript, context) };
}

test("first desktop visit starts the intro and releases it at exactly four seconds", () => {
  const browser = browserFixture();
  browser.run();
  assert.equal(browser.dataset.brandIntro, "running");
  assert.equal(browser.dataset.brandIntroStart, "125");
  assert.equal(browser.storage.get(BRAND_INTRO_SESSION_KEY), "seen");
  assert.equal(browser.timers.length, 1);
  assert.equal(browser.timers[0].delay, BRAND_INTRO_DURATION);
  browser.timers[0].callback();
  assert.deepEqual(browser.dataset, {});
  assert.deepEqual(browser.events, ["jewelrex:intro-end"]);
});

test("subsequent visits in the same tab do not replay the intro", () => {
  const browser = browserFixture({ seen: true });
  browser.run();
  assert.deepEqual(browser.dataset, {});
  assert.deepEqual(browser.timers, []);
});

test("mobile, reduced motion, authentication and dashboard pages bypass the intro", () => {
  for (const options of [{ desktop: false }, { reduced: true }, ...["/login", "/register", "/account", "/seller", "/admin", "/checkout", "/shopper"].map(path => ({ path }))]) {
    const browser = browserFixture(options);
    browser.run();
    assert.deepEqual(browser.dataset, {});
    assert.deepEqual(browser.timers, []);
    assert.equal(browser.storage.size, 0);
  }
});

test("home and nested storefront pages share the same intro behavior", () => {
  for (const path of ["/", "/shop/rings", "/jewelers/atelier-solene", "/guides/ring-size", "/styling/bridal", "/custom-orders"]) {
    const browser = browserFixture({ path });
    browser.run();
    assert.equal(browser.dataset.brandIntro, "running", path);
  }
});

test("unavailable session storage cannot leave an indefinite loading screen", () => {
  const browser = browserFixture({ storageBlocked: true });
  browser.run();
  assert.equal(browser.timers[0].delay, 4000);
  browser.timers[0].callback();
  assert.deepEqual(browser.dataset, {});
});

test("the permanent navbar image animates from the center to its own position", async () => {
  const browser = browserFixture();
  let frames: Keyframe[] = [];
  let timing: KeyframeAnimationOptions = {};
  let canceled = false;
  browser.setImage({
    decode: async () => {},
    getBoundingClientRect: () => ({ left: 598, top: 7, width: 170, height: 57 }),
    animate: (keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      frames = keyframes;
      timing = options;
      return { cancel: () => { canceled = true; }, currentTime: 0 };
    },
  });
  browser.run();
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.match(String(frames[0].transform), /^translate\(0px, 414.5px\) scale\(/);
  assert.equal(frames[2].offset, 0.7);
  assert.equal(frames.at(-1)?.transform, "translate(0px, 0px) scale(1)");
  assert.equal(timing.duration, 4000);
  browser.timers[0].callback();
  assert.equal(canceled, true);
  assert.deepEqual(browser.dataset, {});
});

test("a failed wordmark image immediately releases the website", async () => {
  const browser = browserFixture();
  browser.setImage({ decode: async () => { throw new Error("Image unavailable"); } });
  browser.run();
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.deepEqual(browser.dataset, {});
  assert.deepEqual(browser.events, ["jewelrex:intro-end"]);
});
