import { beforeEach, describe, expect, it } from 'vitest';
import { ATTRS } from '../src/core/constants';
import { createEngineContext } from '../src/core/engine';
import { clearRegistry } from '../src/core/registry';
import { createSyncScheduler } from '../src/core/scheduler';
import { createTagger } from '../src/core/tagger';

function ctx(exclude?: string | string[]) {
  return createEngineContext({ scheduler: createSyncScheduler(), exclude });
}

beforeEach(() => {
  document.body.innerHTML = '';
  clearRegistry(document);
});

describe('icon tagging', () => {
  it('tags a Material Symbols ligature icon', () => {
    // The case that actually breaks: Material declares font-family on the
    // element and renders via ligatures, so an untagged <span>home</span> shows
    // the literal word "home" once the dyslexic rule is live.
    document.body.innerHTML = `
      <span id="icon" class="material-symbols-outlined" style="font-family: 'Material Symbols Outlined'">home</span>
      <p id="prose">Ordinary text</p>`;

    createTagger(ctx()).tagAll();

    expect(document.getElementById('icon')!.hasAttribute(ATTRS.icon)).toBe(true);
    expect(document.getElementById('prose')!.hasAttribute(ATTRS.icon)).toBe(false);
  });

  it('tags a glyph-only element that declares no icon font itself', () => {
    // The <i class="icon-x" aria-hidden="true"></i> shape, where the glyph
    // comes from ::before and jsdom can see no font-family at all.
    document.body.innerHTML = `<i id="glyph" class="icon-star" aria-hidden="true"></i>`;
    createTagger(ctx()).tagAll();
    expect(document.getElementById('glyph')!.hasAttribute(ATTRS.icon)).toBe(true);
  });

  it('leaves a text-bearing element alone even when its class looks iconish', () => {
    document.body.innerHTML = `<div id="card" class="icon-card">A paragraph of real content</div>`;
    createTagger(ctx()).tagAll();
    expect(document.getElementById('card')!.hasAttribute(ATTRS.icon)).toBe(false);
  });

  it('skips excluded subtrees', () => {
    document.body.innerHTML = `
      <div ${ATTRS.exclude}>
        <span id="inside" class="material-icons" style="font-family: 'Material Icons'">home</span>
      </div>`;
    createTagger(ctx()).tagAll();
    expect(document.getElementById('inside')!.hasAttribute(ATTRS.icon)).toBe(false);
  });

  it('honours a host-supplied exclude selector', () => {
    document.body.innerHTML = `
      <div class="no-touch">
        <span id="inside" class="material-icons" style="font-family: 'Material Icons'">home</span>
      </div>`;
    createTagger(ctx('.no-touch')).tagAll();
    expect(document.getElementById('inside')!.hasAttribute(ATTRS.icon)).toBe(false);
  });

  it('removes every tag it added, and only those', () => {
    document.body.innerHTML = `
      <span id="icon" class="material-icons" style="font-family: 'Material Icons'">home</span>
      <span id="manual" ${ATTRS.icon}>pre-existing</span>`;

    const tagger = createTagger(ctx());
    tagger.tagAll();
    tagger.untagAll();

    expect(document.getElementById('icon')!.hasAttribute(ATTRS.icon)).toBe(false);
    // A tag the host set itself must survive our cleanup.
    expect(document.getElementById('manual')!.hasAttribute(ATTRS.icon)).toBe(true);
  });

  it('tags nodes added later without rescanning the page', () => {
    const tagger = createTagger(ctx());
    tagger.tagAll();

    const added = document.createElement('div');
    added.innerHTML = `<span id="late" class="material-icons" style="font-family: 'Material Icons'">star</span>`;
    document.body.appendChild(added);
    tagger.tagSubtree(added);

    expect(document.getElementById('late')!.hasAttribute(ATTRS.icon)).toBe(true);
  });

  it('still detects icons when the preload script already set the attribute', () => {
    // The returning-visitor path, and the one real-browser testing caught:
    // getPreloadScript() sets data-a11y-dyslexic in <head> before the engine
    // mounts, so by the time tagAll() runs, computed font-family already
    // reports OpenDyslexic for everything. Icons survived the first visit and
    // broke on every one after.
    document.documentElement.setAttribute(ATTRS.dyslexic, '');
    document.body.innerHTML = `
      <span id="icon" class="material-symbols-outlined" style="font-family: 'Material Symbols Outlined'">home</span>`;

    createTagger(ctx()).tagAll();

    expect(document.getElementById('icon')!.hasAttribute(ATTRS.icon)).toBe(true);
    expect(document.documentElement.hasAttribute(ATTRS.dyslexic)).toBe(true);
  });

  it('still detects icons in nodes added after the feature was switched on', () => {
    // The hard case: once data-a11y-dyslexic is on <html>, every element's
    // computed font-family reports OpenDyslexic, so a naive scan of late
    // content is blind. The tagger suspends the attribute for the scan.
    document.documentElement.setAttribute(ATTRS.dyslexic, '');

    const added = document.createElement('div');
    added.innerHTML = `<span id="late" class="material-icons" style="font-family: 'Material Icons'">home</span>`;
    document.body.appendChild(added);

    createTagger(ctx()).tagSubtree(added);

    expect(document.getElementById('late')!.hasAttribute(ATTRS.icon)).toBe(true);
    // and the attribute must be back afterwards
    expect(document.documentElement.hasAttribute(ATTRS.dyslexic)).toBe(true);
  });

  it('leaves the font attribute untouched for subtrees with no icon candidates', () => {
    document.documentElement.setAttribute(ATTRS.dyslexic, '');
    const added = document.createElement('div');
    added.innerHTML = '<p>just prose</p>';
    document.body.appendChild(added);

    createTagger(ctx()).tagSubtree(added);

    expect(document.documentElement.hasAttribute(ATTRS.dyslexic)).toBe(true);
    expect(document.querySelectorAll(`[${ATTRS.icon}]`)).toHaveLength(0);
  });

  it('is idempotent across repeated scans', () => {
    document.body.innerHTML = `<span id="icon" class="material-icons" style="font-family: 'Material Icons'">home</span>`;
    const tagger = createTagger(ctx());
    tagger.tagAll();
    tagger.tagAll();
    tagger.untagAll();
    expect(document.querySelectorAll(`[${ATTRS.icon}]`)).toHaveLength(0);
  });
});
