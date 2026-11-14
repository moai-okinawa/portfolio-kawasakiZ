const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const motionScript = fs.readFileSync(path.join(__dirname, "../dist/motion.js"), "utf8");
const motionStyles = fs.readFileSync(path.join(__dirname, "../dist/motion.css"), "utf8");

class Events {
  listeners = new Map();

  addEventListener(type, callback, options) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push({ callback, options });
    this.listeners.set(type, listeners);
  }

  emit(type) {
    for (const { callback } of this.listeners.get(type) ?? []) callback({ type });
  }
}

class Classes extends Set {
  remove(name) {
    this.delete(name);
  }

  toggle(name, enabled) {
    if (enabled) this.add(name);
    else this.delete(name);
  }
}

function makeElement(top, height = 200) {
  return {
    top,
    height,
    // This is the current interpolated CSS translate, not its target value.
    offset: 0,
    reads: 0,
    dataset: {},
    classList: new Classes(),
    contains(target) {
      return target === this || target?.parent === this;
    },
    getBoundingClientRect() {
      this.reads += 1;
      return {
        top: this.top + this.offset,
        bottom: this.top + this.height + this.offset,
        height: this.height,
      };
    },
  };
}

function setup(elements, options = {}) {
  const window = new Events();
  const document = new Events();
  const preference = new Events();
  const frames = new Map();
  const observers = [];
  const fontCallbacks = [];
  let nextFrame = 1;

  preference.matches = options.reduced ?? false;
  window.innerHeight = 800;
  window.CSS = { supports: () => options.translateSupported !== false };
  window.matchMedia = () => preference;
  if (options.missingCSS) delete window.CSS;
  if (options.missingMatchMedia) delete window.matchMedia;

  document.body = {};
  document.activeElement = document.body;
  document.hidden = false;
  document.documentElement = { classList: new Classes(), offsetWidth: 1000 };
  document.querySelectorAll = () => elements;
  document.fonts = { ready: { then: (callback) => fontCallbacks.push(callback) } };

  class ResizeObserver {
    constructor(callback) {
      this.callback = callback;
      this.observed = new Set();
      observers.push(this);
    }
    observe(element) {
      this.observed.add(element);
    }
  }
  if (options.resizeObserver !== false) window.ResizeObserver = ResizeObserver;

  vm.runInNewContext(motionScript, {
    window,
    document,
    ResizeObserver,
    getComputedStyle: (element) => ({ translate: `0px ${element.offset}px` }),
    requestAnimationFrame(callback) {
      const id = nextFrame++;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
  });

  return {
    window,
    document,
    preference,
    frames,
    observers,
    flush() {
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback();
    },
    scrollTo(element, top, offset = element.offset) {
      element.top = top;
      element.offset = offset;
      window.emit("scroll");
      this.flush();
    },
    setReduced(reduced) {
      preference.matches = reduced;
      preference.emit("change");
    },
    resolveFonts() {
      for (const callback of fontCallbacks) callback();
    },
  };
}

function assertVisible(element) {
  assert.equal(element.dataset.scrollState, "visible");
  assert.ok(element.classList.has("scroll-reveal"));
}

function assertUnrestricted(element) {
  assert.equal(element.dataset.scrollState, undefined);
  assert.equal(element.classList.has("scroll-reveal"), false);
}

test("scrolling down and back up repeatedly reveals the same content", () => {
  const item = makeElement(900);
  const app = setup([item]);
  app.flush();
  assert.equal(item.dataset.scrollState, "below");
  for (let pass = 0; pass < 3; pass++) {
    app.scrollTo(item, 350);
    assertVisible(item);
    app.scrollTo(item, -250);
    assert.equal(item.dataset.scrollState, "above");
    app.scrollTo(item, 100);
    assertVisible(item);
    app.scrollTo(item, 900);
    assert.equal(item.dataset.scrollState, "below");
  }
});

test("a photo taller than the viewport remains visible while its middle is on screen", () => {
  const photo = makeElement(-600, 1600);
  const app = setup([photo]);
  app.flush();
  assertVisible(photo);
  app.scrollTo(photo, -1450);
  assertVisible(photo);
  app.scrollTo(photo, -1500);
  assert.equal(photo.dataset.scrollState, "above");
  app.scrollTo(photo, -1460);
  assertVisible(photo);
});

test("lower-edge movement uses interpolated translate and a 12px hysteresis band", () => {
  const item = makeElement(700);
  const app = setup([item]);
  app.flush();

  // Layout is still visible although the animated rectangle crosses the edge.
  app.scrollTo(item, 743, 11.5);
  assertVisible(item);
  app.scrollTo(item, 745, 6.25);
  assert.equal(item.dataset.scrollState, "below");
  for (const top of [740, 733, 743, 732]) {
    app.scrollTo(item, top, 11.5);
    assert.equal(item.dataset.scrollState, "below");
  }
  app.scrollTo(item, 731, 11.5);
  assertVisible(item);
  for (const top of [733, 743, 735, 743]) {
    app.scrollTo(item, top, 19.25);
    assertVisible(item);
  }
  app.scrollTo(item, 744, 11.5);
  assert.equal(item.dataset.scrollState, "below");
});

test("upper-edge movement is stable through negative translate and reverse scrolling", () => {
  const item = makeElement(-120);
  const app = setup([item]);
  app.flush();
  assert.equal(item.dataset.scrollState, "above");
  for (const top of [-82, -76, -85, -76]) {
    app.scrollTo(item, top, -7.25);
    assert.equal(item.dataset.scrollState, "above");
  }
  app.scrollTo(item, -75, -7.25);
  assertVisible(item);
  // The rendered bottom is above the threshold, but the layout bottom is visible.
  app.scrollTo(item, -87, -11.5);
  assertVisible(item);
  app.scrollTo(item, -88, -7.25);
  assert.equal(item.dataset.scrollState, "above");
});

test("keyboard focus reveals hidden content and focusout restores its scroll state", () => {
  const item = makeElement(1000);
  const app = setup([item]);
  app.flush();
  const link = { parent: item };
  app.document.activeElement = link;
  app.document.emit("focusin");
  app.flush();
  assertVisible(item);
  app.scrollTo(item, -300);
  assertVisible(item);
  app.document.activeElement = app.document.body;
  app.document.emit("focusout");
  app.flush();
  assert.equal(item.dataset.scrollState, "above");
});

test("initial reduced-motion preference leaves every item visible without scheduling animation", () => {
  const items = [makeElement(-500), makeElement(200), makeElement(1000)];
  const app = setup(items, { reduced: true });
  items.forEach(assertUnrestricted);
  assert.equal(app.frames.size, 0);
  app.window.emit("scroll");
  assert.equal(app.frames.size, 0);
});

test("changing reduced motion cancels pending work and can resume scroll reveals", () => {
  const item = makeElement(1000);
  const app = setup([item]);
  assert.equal(app.frames.size, 1);
  app.setReduced(true);
  assert.equal(app.frames.size, 0);
  assertUnrestricted(item);
  app.setReduced(false);
  app.flush();
  assert.equal(item.dataset.scrollState, "below");
  app.scrollTo(item, 200);
  assertVisible(item);
  app.setReduced(true);
  assertUnrestricted(item);
  assert.equal(app.document.documentElement.classList.has("scroll-motion-priming"), false);
});

test("printing shows all content, then restores the current viewport behavior", () => {
  const item = makeElement(1000);
  const app = setup([item]);
  app.window.emit("beforeprint");
  assert.equal(app.frames.size, 0);
  assertUnrestricted(item);
  app.setReduced(false);
  assertUnrestricted(item);
  app.window.emit("afterprint");
  app.flush();
  assert.equal(item.dataset.scrollState, "below");

  app.setReduced(true);
  app.window.emit("beforeprint");
  app.window.emit("afterprint");
  assertUnrestricted(item);
  assert.equal(app.frames.size, 0);
});

test("a burst of scroll events performs one measurement frame", () => {
  const item = makeElement(300);
  const app = setup([item]);
  app.flush();
  const priorReads = item.reads;
  for (let event = 0; event < 100; event++) app.window.emit("scroll");
  assert.equal(app.frames.size, 1);
  app.flush();
  assert.equal(item.reads - priorReads, 1);
  assert.equal(app.frames.size, 0);
  assert.equal(app.window.listeners.get("scroll")[0].options.passive, true);
});

test("unsupported independent translate or media-query APIs preserve the visible fallback", () => {
  for (const options of [
    { translateSupported: false },
    { missingCSS: true },
    { missingMatchMedia: true },
  ]) {
    const item = makeElement(1000);
    const app = setup([item], options);
    assertUnrestricted(item);
    assert.equal(app.frames.size, 0);
    assert.equal(app.window.listeners.size, 0);
    assert.equal(app.observers.length, 0);
  }
});

test("viewport resize, captured image loads, layout resize and fonts remeasure content", () => {
  const item = makeElement(900);
  const app = setup([item]);
  app.flush();
  app.window.innerHeight = 1200;
  app.window.emit("resize");
  app.flush();
  assertVisible(item);
  app.window.innerHeight = 800;
  app.window.emit("resize");
  app.flush();
  assert.equal(item.dataset.scrollState, "below");

  item.top = 200;
  app.document.emit("load");
  app.flush();
  assertVisible(item);
  assert.equal(app.document.listeners.get("load")[0].options, true);
  assert.ok(app.observers[0].observed.has(item));
  assert.ok(app.observers[0].observed.has(app.document.body));

  item.top = 1000;
  app.observers[0].callback();
  app.flush();
  assert.equal(item.dataset.scrollState, "below");
  item.top = 100;
  app.resolveFonts();
  app.flush();
  assertVisible(item);
});

test("page restoration and returning to a visible tab refresh stale positions", () => {
  const item = makeElement(900);
  const app = setup([item], { resizeObserver: false });
  app.flush();
  app.document.hidden = true;
  const priorReads = item.reads;
  app.scrollTo(item, 200);
  assert.equal(item.reads, priorReads);
  app.document.hidden = false;
  app.document.emit("visibilitychange");
  app.flush();
  assertVisible(item);
  item.top = 1000;
  app.window.emit("pageshow");
  app.flush();
  assert.equal(item.dataset.scrollState, "below");
});

function mediaBlocks(css) {
  const blocks = [];
  const pattern = /@media\s+([^{}]+)\{/g;
  let match;
  while ((match = pattern.exec(css))) {
    const start = pattern.lastIndex;
    let depth = 1;
    let end = start;
    while (depth > 0 && end < css.length) {
      if (css[end] === "{") depth++;
      if (css[end] === "}") depth--;
      end++;
    }
    assert.equal(depth, 0, "CSS media block must be balanced");
    blocks.push({ query: match[1].trim(), body: css.slice(start, end - 1) });
    pattern.lastIndex = end;
  }
  return blocks;
}

test("CSS preserves hover feedback and reveals all content for reduced motion and print", () => {
  const blocks = mediaBlocks(motionStyles);
  const motion = blocks.find(({ query }) => query === "(prefers-reduced-motion: no-preference)");
  const hover = blocks.find(({ query }) => query.includes("(hover: hover)"));
  const print = blocks.find(({ query }) => query === "print");
  assert.ok(motion);
  assert.ok(hover);
  assert.ok(print);
  for (const block of blocks.filter(({ body }) => /opacity:\s*0(?:;|\s)/.test(body))) {
    assert.match(block.query, /prefers-reduced-motion:\s*no-preference/);
  }
  assert.match(motion.body, /\.scroll-reveal\s*\{[^}]*opacity:\s*1\s*;[^}]*translate:\s*0 0\s*;/);
  assert.match(motion.body, /\.scroll-reveal:focus-within\s*\{[^}]*opacity:\s*1\s*;[^}]*pointer-events:\s*auto\s*;/);
  assert.match(hover.query, /prefers-reduced-motion:\s*no-preference/);
  assert.match(hover.query, /pointer:\s*fine/);
  assert.match(hover.body, /\.print:hover\s*\{[^}]*transform:[^;]*rotate\(/);
  assert.match(hover.body, /\.work:hover > \.cover,\s*\.photo-link:hover\s*\{[^}]*transform:/);
  assert.match(print.body, /opacity:\s*1\s*!important/);
  assert.match(print.body, /translate:\s*none\s*!important/);
  assert.match(print.body, /transition:\s*none\s*!important/);
});
