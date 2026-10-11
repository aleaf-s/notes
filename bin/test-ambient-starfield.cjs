// Run the real script against a controllable animation frame queue.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const frames = new Map();
const windowEvents = {};
const documentEvents = {};
let nextFrameId = 0;
let now = 100;
let paints = 0;
let themeChange;
let motionChange;
const context = {
  clearRect() { paints += 1; },
  setTransform() {}, beginPath() {}, moveTo() {}, lineTo() {},
  stroke() {}, arc() {}, fill() {}
};
const layer = { classList: { toggle() {} }, style: { setProperty() {} } };
const canvas = { getContext: () => context };
const content = { getBoundingClientRect: () => ({ left: 500, right: 1420 }) };
const motionQuery = {
  matches: false,
  addEventListener(name, callback) { motionChange = callback; }
};
const document = {
  hidden: false,
  documentElement: { clientWidth: 1920, clientHeight: 1080, scrollHeight: 3000 },
  querySelector: selector => ({
    '[data-ambient-starfield]': layer,
    '[data-ambient-starfield-canvas]': canvas,
    '.page-content .w': content
  })[selector],
  addEventListener(name, callback) { documentEvents[name] = callback; }
};
const window = {
  scrollY: 0,
  devicePixelRatio: 1,
  matchMedia: () => motionQuery,
  requestAnimationFrame(callback) {
    const id = nextFrameId++;
    frames.set(id, callback);
    return id;
  },
  cancelAnimationFrame(id) { frames.delete(id); },
  addEventListener(name, callback) { windowEvents[name] = callback; }
};

vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/ambient-starfield.js'), 'utf8'), {
  window, document,
  performance: { now: () => now },
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  MutationObserver: class {
    constructor(callback) { themeChange = callback; }
    observe() {}
  }
});

function expectFrames(count, label) {
  assert.equal(frames.size, count, label);
}

function advance(milliseconds) {
  now += milliseconds;
  // Call only callbacks queued for this frame, as the browser does.
  for (const [id, callback] of [...frames]) {
    if (frames.delete(id)) callback(now);
  }
}

expectFrames(1, 'initialization starts one loop');
for (let i = 0; i < 10; i += 1) {
  windowEvents.resize();
  expectFrames(1, 'resize keeps one loop');
  themeChange();
  expectFrames(1, 'theme redraw keeps one loop');
  const before = paints;
  advance(16);
  assert.equal(paints, before, 'throttled frame does not draw');
  expectFrames(1, 'throttled frame schedules one successor');
  advance(18);
  assert.equal(paints, before + 1, 'animation continues drawing');
  expectFrames(1, 'drawn frame schedules one successor');
}

document.hidden = true;
documentEvents.visibilitychange();
expectFrames(0, 'hidden page cancels its loop');
const hiddenPaints = paints;
windowEvents.resize();
themeChange();
advance(100);
expectFrames(0, 'hidden page stays paused after resize and theme changes');
assert.equal(paints, hiddenPaints, 'hidden page does not draw');
document.hidden = false;
documentEvents.visibilitychange();
expectFrames(1, 'visible page resumes one loop');

motionQuery.matches = true;
motionChange();
expectFrames(0, 'reduced motion cancels the loop');
const staticPaints = paints;
themeChange();
assert.equal(paints, staticPaints + 1, 'reduced motion still redraws theme changes');
windowEvents.resize();
expectFrames(0, 'reduced motion redraws do not start a loop');
motionQuery.matches = false;
motionChange();
expectFrames(1, 'turning motion back on resumes one loop');

document.documentElement.clientWidth = 900;
windowEvents.resize();
themeChange();
expectFrames(0, 'narrow viewport stops animation');
document.documentElement.clientWidth = 1920;
windowEvents.resize();
expectFrames(1, 'wide viewport resumes one loop');
const resumedPaints = paints;
advance(34);
assert.equal(paints, resumedPaints + 1, 'resumed animation draws');
expectFrames(1, 'resumed animation keeps one loop');

console.log('Starfield regression checks passed: single loop, throttling, resize, theme, visibility, reduced motion, viewport.');
