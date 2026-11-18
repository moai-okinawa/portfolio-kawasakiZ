// Behavioral regression tests for the progressive enhancements, without a browser.
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const siteCode = fs.readFileSync(path.join(__dirname, '../dist/site.js'), 'utf8');
const albumCode = fs.readFileSync(path.join(__dirname, '../dist/ashiato/album.js'), 'utf8');

function fixture({ mobile = false, dialogSupported = true, photos = 3, menuSupported = true } = {}) {
  const document = { activeElement: null, handlers: {}, addEventListener(type, fn) { (this.handlers[type] ??= []).push(fn); } };
  const make = (props = {}) => {
    const node = {
      attrs: {}, handlers: {}, children: {}, childNodes: [], parent: null, hidden: false, open: false,
      disabled: false, textContent: '', style: { overflow: '' }, isConnected: true,
      classes: new Set(),
      setAttribute(name, value) { this.attrs[name] = String(value); },
      getAttribute(name) { return this.attrs[name] ?? null; },
      hasAttribute(name) { return Object.hasOwn(this.attrs, name); },
      removeAttribute(name) { delete this.attrs[name]; },
      addEventListener(type, fn) { (this.handlers[type] ??= []).push(fn); },
      querySelector(selector) { return this.children[selector] || null; },
      contains(target) { for (let p = target; p; p = p.parent) if (p === this) return true; return false; },
      closest(selector) { for (let p = this; p; p = p.parent) if (p.matches === selector) return p; return null; },
      focus() {
        for (let p = this; p; p = p.parent) if (p.hidden) return;
        document.activeElement = this;
      },
      cloneNode() { return make({ textContent: this.textContent, childNodes: this.childNodes.map(child => ({ ...child })) }); },
      replaceChildren(...children) { this.childNodes = children; this.textContent = children.map(child => child.textContent).join(''); },
      getBoundingClientRect() { return this.rect || { left: 20, right: 620, top: 20, bottom: 620 }; },
      dispatch(type, options = {}) {
        const event = { target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...options };
        for (const fn of this.handlers[type] || []) fn(event);
        return event;
      },
      activate(options = {}) {
        const event = this.dispatch('click', options);
        if (this.details && !event.defaultPrevented) this.details.open = !this.details.open;
        return event;
      },
    };
    node.classList = {
      contains: name => node.classes.has(name),
      toggle(name, on) { if (on) node.classes.add(name); else node.classes.delete(name); },
    };
    return Object.assign(node, props);
  };
  document.documentElement = make();
  document.body = make();
  document.activeElement = document.body;
  const toggle = make({ hidden: true });
  const menu = make();
  const section = make({ id: 'profile', rect: { top: 100 } });
  const secondSection = make({ id: 'works', rect: { top: 1000 } });
  const link = make({ parent: menu, matches: 'a', hash: '#profile', attrs: { href: '#profile' } });
  const secondLink = make({ parent: menu, matches: 'a', hash: '#works', attrs: { href: '#works' } });
  menu.children.a = link;
  const media = { matches: mobile, addEventListener(_, fn) { this.change = fn; } };
  const frames = new Map();
  let frame = 0;
  const window = {
    innerHeight: 800, handlers: {},
    addEventListener(type, fn) { (this.handlers[type] ??= []).push(fn); },
    matchMedia: () => media,
    requestAnimationFrame(fn) { frames.set(++frame, fn); return frame; },
  };
  if (!menuSupported) delete window.matchMedia;
  const makeDialog = (id) => {
    const closeButton = make();
    const dialog = make({ id, closeButton });
    if (dialogSupported) dialog.showModal = () => { dialog.open = true; closeButton.focus(); };
    dialog.close = () => { dialog.open = false; dialog.dispatch('close'); };
    dialog.key = key => { const event = dialog.dispatch('keydown', { key }); if (key === 'Escape' && !event.defaultPrevented) dialog.close(); return event; };
    return dialog;
  };
  const workDialog = makeDialog('work-dialog');
  const dialogImage = make();
  const dialogTitle = make();
  const dialogMeta = make();
  const dialogDescription = make();
  const workDetails = make();
  const workSummary = make({ details: workDetails });
  const workImage = make({ src: 'https://example.test/work.webp', alt: '作品の表紙' });
  const workTitle = make({ textContent: '  寄り道手帖  ' });
  const workMeta = make({ childNodes: [{ textContent: 'ZINE' }, { textContent: ' / SAMPLE' }] });
  const workContent = make({ childNodes: [{ textContent: '説明を全文読む。' }, { textContent: '仕様とURL。', href: 'https://example.test/work' }] });
  const work = make({ children: { '.work-details summary': workSummary, '.cover': workImage, h3: workTitle, '.meta': workMeta, '.work-detail-content': workContent } });
  const viewer = makeDialog('viewer');
  const fullImage = make();
  const viewerTitle = make();
  const counter = make();
  const note = make();
  const previous = make();
  const next = make();
  viewer.children = { '.viewer-image': fullImage, '#viewer-title': viewerTitle, '#viewer-counter': counter, '#viewer-note': note, '.previous': previous, '.next': next };
  const links = Array.from({ length: photos }, (_, i) => {
    const image = make({ alt: `写真${i + 1}の説明` });
    if (i === 0) image.classes.add('island-rotated');
    const figure = make({ matches: 'figure', children: { h2: make({ textContent: i === 0 ? '本島から見える伊江島' : `写真${i + 1}` }), small: make({ textContent: i > 0 ? 'AI生成のサンプル' : '' }) } });
    return make({ parent: figure, href: `https://example.test/${i + 1}.webp`, children: { img: image } });
  });
  const nodes = { '#site-menu': menu, '.menu-toggle': toggle, '#work-dialog': workDialog, '#dialog-image': dialogImage, '#dialog-title': dialogTitle, '#dialog-meta': dialogMeta, '#dialog-description': dialogDescription, '#viewer': viewer };
  document.querySelector = selector => nodes[selector] || null;
  document.querySelectorAll = selector => selector === '.work' ? [work] : selector === '.photo-link' ? links : selector === '#site-menu a[href^="#"]' ? [link, secondLink] : [];
  document.getElementById = id => ({ profile: section, works: secondSection })[id] || null;
  const run = code => vm.runInNewContext(code, { window, document });
  const emit = (target, type, properties = {}) => { for (const fn of target.handlers[type] || []) fn({ type, ...properties }); };
  return { run, emit, document, window, make, frames, media, toggle, menu, section, secondSection, link, secondLink, work, workSummary, workDetails, workContent, workMeta, workDialog, dialogImage, dialogTitle, dialogMeta, dialogDescription, viewer, fullImage, viewerTitle, counter, note, previous, next, links,
    flush() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); },
    resize(isMobile) { media.matches = isMobile; media.change(); },
  };
}

test('desktop keeps navigation visible; mobile has a working collapsed menu', () => {
  for (const mobile of [false, true]) {
    const f = fixture({ mobile }); f.run(siteCode);
    assert.equal(f.toggle.hidden, !mobile);
    assert.equal(f.menu.hidden, mobile);
    if (mobile) {
      f.toggle.activate(); assert.equal(f.menu.hidden, false); assert.equal(f.toggle.getAttribute('aria-expanded'), 'true');
      f.toggle.activate(); assert.equal(f.menu.hidden, true); assert.equal(f.toggle.getAttribute('aria-expanded'), 'false');
    }
  }
});
test('missing media queries preserves visible navigation and native menu fallback', () => {
  const f = fixture({ menuSupported: false }); f.run(siteCode);
  assert.equal(f.menu.hidden, false); assert.equal(f.toggle.hidden, true);
});
test('Escape closes mobile navigation and returns focus to its button', () => {
  const f = fixture({ mobile: true }); f.run(siteCode); f.toggle.activate(); f.link.focus();
  f.emit(f.document, 'keydown', { key: 'Escape' });
  assert.equal(f.menu.hidden, true); assert.equal(f.document.activeElement, f.toggle);
});
test('internal mobile link focuses its destination without intercepting anchor scrolling', () => {
  const f = fixture({ mobile: true }); f.run(siteCode); f.toggle.activate(); f.link.focus();
  const event = f.menu.dispatch('click', { target: f.link });
  assert.equal(event.defaultPrevented, false); assert.equal(f.menu.hidden, true);
  assert.equal(f.document.activeElement, f.section); assert.equal(f.section.getAttribute('tabindex'), '-1');
});
test('breakpoint changes never strand focus in hidden controls', () => {
  const f = fixture(); f.run(siteCode); f.link.focus(); f.resize(true);
  assert.equal(f.document.activeElement, f.toggle); assert.equal(f.menu.hidden, true);
  f.resize(false); assert.equal(f.document.activeElement, f.link); assert.equal(f.menu.hidden, false); assert.equal(f.toggle.hidden, true);
});
test('modified navigation click keeps the menu and current focus available', () => {
  const f = fixture({ mobile: true }); f.run(siteCode); f.toggle.activate(); f.link.focus();
  f.menu.dispatch('click', { target: f.link, metaKey: true });
  assert.equal(f.menu.hidden, false); assert.equal(f.document.activeElement, f.link);
});
test('section state updates once per scroll burst and keeps a single current link', () => {
  const f = fixture(); f.run(siteCode); assert.equal(f.link.getAttribute('aria-current'), 'location');
  f.secondSection.rect.top = 120;
  for (let i = 0; i < 50; i++) f.emit(f.window, 'scroll');
  assert.equal(f.frames.size, 1); f.flush();
  assert.equal(f.link.getAttribute('aria-current'), null); assert.equal(f.secondLink.getAttribute('aria-current'), 'location');
});
test('work dialog retains full content, alt and metadata, then restores focus and overflow', () => {
  const f = fixture(); f.document.body.style.overflow = 'auto'; f.run(siteCode); f.workSummary.focus();
  assert.equal(f.workSummary.getAttribute('aria-label'), '作品をひらく：寄り道手帖');
  const event = f.workSummary.activate();
  assert.equal(event.defaultPrevented, true); assert.equal(f.workDetails.open, false); assert.equal(f.workDialog.open, true);
  assert.equal(f.dialogTitle.textContent, '寄り道手帖'); assert.equal(f.dialogImage.alt, '作品の表紙');
  assert.equal(f.dialogMeta.textContent, 'ZINE / SAMPLE'); assert.equal(f.dialogDescription.textContent, '説明を全文読む。仕様とURL。');
  assert.notEqual(f.dialogDescription.childNodes[0], f.workContent.childNodes[0]);
  assert.equal(f.dialogDescription.childNodes[1].href, 'https://example.test/work');
  assert.equal(f.document.documentElement.style.overflow, 'hidden');
  f.workDialog.key('Escape');
  assert.equal(f.workDialog.open, false); assert.equal(f.document.activeElement, f.workSummary);
  assert.equal(f.document.body.style.overflow, 'auto'); assert.equal(f.document.documentElement.style.overflow, '');
});
test('unsupported or failed dialog keeps native work details available', () => {
  for (const supported of [false, true]) {
    const f = fixture({ dialogSupported: supported }); f.run(siteCode);
    if (supported) f.workDialog.showModal = () => { throw new Error('unavailable'); };
    const event = f.workSummary.activate();
    assert.equal(event.defaultPrevented, false); assert.equal(f.workDetails.open, true);
    assert.equal(f.document.body.style.overflow, '');
  }
});
test('work padding does not close the dialog, while actual backdrop does', () => {
  const f = fixture(); f.run(siteCode); f.workSummary.activate();
  f.workDialog.dispatch('click', { clientX: 40, clientY: 40 }); assert.equal(f.workDialog.open, true);
  f.workDialog.dispatch('click', { clientX: 10, clientY: 40 }); assert.equal(f.workDialog.open, false);
});
test('gallery opens the correct photo and cycles both directions with metadata and orientation', () => {
  const f = fixture(); f.run(albumCode); const event = f.links[0].activate();
  assert.equal(event.defaultPrevented, true); assert.equal(f.viewer.open, true);
  assert.equal(f.viewerTitle.textContent, '本島から見える伊江島'); assert.equal(f.counter.textContent, '01 / 03');
  assert.equal(f.fullImage.classList.contains('island-rotated'), true); assert.equal(f.viewer.classList.contains('island-view'), true);
  f.previous.activate(); assert.equal(f.counter.textContent, '03 / 03'); assert.equal(f.fullImage.src, 'https://example.test/3.webp');
  assert.equal(f.fullImage.classList.contains('island-rotated'), false); assert.equal(f.note.textContent, 'AI生成のサンプル');
  f.viewer.key('ArrowRight'); assert.equal(f.counter.textContent, '01 / 03'); assert.equal(f.note.textContent, '');
  f.next.activate(); assert.equal(f.viewerTitle.textContent, '写真2'); assert.equal(f.fullImage.alt, '写真2の説明');
});
test('gallery Escape restores opening thumbnail focus and original scroll styles', () => {
  const f = fixture(); f.document.body.style.overflow = 'scroll'; f.run(albumCode); f.links[1].focus(); f.links[1].activate(); f.next.activate();
  assert.equal(f.document.body.style.overflow, 'hidden'); f.viewer.key('Escape');
  assert.equal(f.document.activeElement, f.links[1]); assert.equal(f.document.body.style.overflow, 'scroll');
  assert.equal(f.document.documentElement.style.overflow, '');
});
test('gallery has a safe image-link fallback and honors modified clicks', () => {
  for (const supported of [false, true]) {
    const f = fixture({ dialogSupported: supported }); f.run(albumCode);
    const event = f.links[0].activate(supported ? { ctrlKey: true } : {});
    assert.equal(event.defaultPrevented, false); assert.equal(f.viewer.open, false);
  }
  const f = fixture(); f.run(albumCode); f.viewer.showModal = () => { throw new Error('unavailable'); };
  assert.equal(f.links[0].activate().defaultPrevented, false); assert.equal(f.document.body.style.overflow, '');
});
test('single-photo navigation disables redundant buttons; empty gallery is harmless', () => {
  const f = fixture({ photos: 1 }); f.run(albumCode); f.links[0].activate();
  assert.equal(f.previous.disabled, true); assert.equal(f.next.disabled, true); assert.equal(f.counter.textContent, '01 / 01');
  const empty = fixture({ photos: 0 }); assert.doesNotThrow(() => empty.run(albumCode));
});
test('pages missing enhancement hooks remain readable and do not throw', () => {
  const document = { querySelector: () => null, querySelectorAll: () => [] };
  for (const code of [siteCode, albumCode]) assert.doesNotThrow(() => vm.runInNewContext(code, { document, window: {} }));
});
