// Exercise the real TOC script with deterministic heading geometry.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function element(tagName) {
  const classes = new Set();
  return {
    tagName, children: [], handlers: {}, attributes: {},
    classList: { add: name => classes.add(name), toggle: (name, on) => on ? classes.add(name) : classes.delete(name), contains: name => classes.has(name) },
    appendChild(child) { this.children.push(child); },
    addEventListener(name, handler) { this.handlers[name] = handler; },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    get hash() { return this.href; }
  };
}

let scrollY = 0;
const headings = ['基本概念', '传输媒体', '编码与调制', '信道容量'].map((id, index) => ({
  ...element('H1'), id, textContent: id, documentTop: 200 + index * 1200,
  getBoundingClientRect() { return { top: this.documentTop - scrollY }; }
}));
const body = element('ARTICLE');
body.querySelectorAll = () => headings;
const nav = element('NAV');
nav.querySelectorAll = () => nav.children[0].children.map(item => item.children[0]);
const toc = element('ASIDE');
const layout = element('DIV');
const events = {};
const frames = [];
let resizeCallback;
const window = {
  innerHeight: 900, location: { hash: '' },
  addEventListener(name, handler) { events[name] = handler; },
  requestAnimationFrame(handler) { frames.push(handler); },
  ResizeObserver: true
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/post-toc.js'), 'utf8'), {
  window,
  document: {
    querySelector: selector => ({ '[data-post-body]': body, '[data-post-toc]': nav, '.post-toc': toc, '.post-reading-layout': layout })[selector],
    querySelectorAll: () => headings,
    createElement: element
  },
  ResizeObserver: class { constructor(callback) { resizeCallback = callback; } observe() {} }
});
const links = nav.querySelectorAll();
function flush() { while (frames.length) frames.shift()(); }
function expectActive(index) {
  assert.deepEqual(links.map(link => link.classList.contains('is-active')), links.map((_, i) => i === index));
  assert.equal(links[index].attributes['aria-current'], 'location');
}
expectActive(0);
scrollY = 2700;
events.scroll(); flush(); expectActive(2);
// Reproduce clicking backwards: the destination is above the old observer band.
links[1].handlers.click(); expectActive(1);
scrollY = headings[1].documentTop - 16;
events.scroll(); flush(); expectActive(1);
// Long content with no visible section heading still belongs to this section.
scrollY = 2300;
events.scroll(); flush(); expectActive(1);
// Browser hash navigation and keyboard activation.
window.location.hash = '#' + encodeURIComponent(headings[3].id);
events.hashchange(); expectActive(3);
// Layout shifts caused by images and equations recompute heading positions.
scrollY = 2680;
events.scroll(); flush(); expectActive(2);
headings[2].documentTop += 600;
resizeCallback(); flush(); expectActive(1);
window.location.hash = '#%invalid';
events.hashchange(); flush(); expectActive(1);
console.log('TOC regression checks passed: click, scroll, hash navigation, layout shifts.');
