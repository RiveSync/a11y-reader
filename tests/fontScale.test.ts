import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/core/constants';
import { createAccessibilityEngine, createEngineContext } from '../src/core/engine';
import { fontScale } from '../src/core/features/fontScale';
import { clearRegistry } from '../src/core/registry';
import { createSyncScheduler } from '../src/core/scheduler';
import { collectTextElements, hasDirectText } from '../src/core/walker';
import type { EngineContext } from '../src/core/types';

/**
 * jsdom has no layout and does not resolve inherited font-size to px, so the
 * real getComputedStyle is useless here. `readFontSize` is injectable for
 * exactly this reason: stubbing it makes element selection, phase ordering and
 * revert behaviour assertable without a browser.
 */
function ctx(overrides: Partial<Parameters<typeof createEngineContext>[0]> = {}): EngineContext {
  return createEngineContext({
    scheduler: createSyncScheduler(),
    readFontSize: () => 16,
    ...overrides,
  });
}

const sizeOf = (id: string) => document.getElementById(id)!.style.getPropertyValue('font-size');

beforeEach(() => {
  document.body.innerHTML = '';
  clearRegistry(document);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('hasDirectText', () => {
  it('is true only for elements holding text themselves', () => {
    document.body.innerHTML = `<div id="wrap"><p id="para">text</p></div><div id="ws">   </div>`;
    expect(hasDirectText(document.getElementById('para')!)).toBe(true);
    // A wrapper must not be scaled: its descendants inherit, and they are about
    // to be scaled themselves — the multiplier would compound.
    expect(hasDirectText(document.getElementById('wrap')!)).toBe(false);
    expect(hasDirectText(document.getElementById('ws')!)).toBe(false);
  });
});

describe('element selection', () => {
  it('prunes excluded subtrees, skipped tags and text-free wrappers', () => {
    document.body.innerHTML = `
      <p id="a">keep</p>
      <div id="wrap"><span id="b">keep</span></div>
      <script id="s">var x = 1</script>
      <style id="st">p{}</style>
      <div data-a11y-exclude><p id="ex">skip</p></div>
      <pre id="pre">skip me too</pre>`;

    const ids = collectTextElements(ctx({ exclude: 'pre' }), [document.body]).map((el) => el.id);

    expect(ids).toContain('a');
    expect(ids).toContain('b');
    expect(ids).not.toContain('wrap');
    expect(ids).not.toContain('s');
    expect(ids).not.toContain('st');
    expect(ids).not.toContain('ex');
    expect(ids).not.toContain('pre');
  });

  it('yields each element once even when scope selectors overlap', () => {
    document.body.innerHTML = `<main id="m"><article id="art"><p id="p">text</p></article></main>`;
    const elements = collectTextElements(ctx({ scope: ['main', 'article'] }), [
      document.getElementById('m')!,
      document.getElementById('art')!,
    ]);
    expect(elements.filter((el) => el.id === 'p')).toHaveLength(1);
  });
});

describe('three-phase ordering', () => {
  /**
   * The perf property in one assertion.
   *
   * Interleaving reads and writes forces a style recalculation per element,
   * which is the difference between ~15 ms and several seconds on a large page.
   * Milliseconds cannot be measured meaningfully in jsdom, but the ordering
   * that produces them can be.
   */
  it('performs every read before any write', () => {
    document.body.innerHTML = Array.from(
      { length: 50 },
      (_, i) => `<p id="p${i}">paragraph ${i}</p>`,
    ).join('');

    const log: string[] = [];
    const original = CSSStyleDeclaration.prototype.setProperty;
    vi.spyOn(CSSStyleDeclaration.prototype, 'setProperty').mockImplementation(function (
      this: CSSStyleDeclaration,
      name: string,
      value: string | null,
      priority?: string,
    ) {
      if (name === 'font-size') log.push('write');
      return original.call(this, name, value, priority);
    });

    fontScale.apply(1.5, ctx({ readFontSize: () => (log.push('read'), 16) }));

    const lastRead = log.lastIndexOf('read');
    const firstWrite = log.indexOf('write');
    expect(lastRead).toBeGreaterThan(-1);
    expect(firstWrite).toBeGreaterThan(-1);
    expect(lastRead).toBeLessThan(firstWrite);
  });

  it('never re-measures an element it has already scaled', () => {
    document.body.innerHTML = `<p id="p">text</p>`;
    let reads = 0;
    const context = ctx({ readFontSize: () => (reads++, 16) });

    fontScale.apply(1.5, context);
    expect(sizeOf('p')).toBe('24px');
    expect(reads).toBe(1);

    // Re-reading here would return 24px and compound to 36px.
    fontScale.apply(2, context);
    expect(sizeOf('p')).toBe('32px');
    expect(reads).toBe(1);
  });

  it('writes with !important so host stylesheets cannot win', () => {
    document.body.innerHTML = `<p id="p">text</p>`;
    fontScale.apply(1.5, ctx());
    expect(document.getElementById('p')!.style.getPropertyPriority('font-size')).toBe('important');
  });
});

describe('revert', () => {
  it('removes the style attribute entirely when the host had none', () => {
    document.body.innerHTML = `<p id="p">text</p>`;
    const context = ctx();

    fontScale.apply(1.5, context);
    expect(document.getElementById('p')!.getAttribute('style')).toContain('font-size');

    fontScale.remove(context);
    // A leftover style="" is a DOM difference, and the acceptance criteria
    // compare outerHTML and a screenshot.
    expect(document.getElementById('p')!.getAttribute('style')).toBeNull();
  });

  it('restores a pre-existing inline font-size', () => {
    document.body.innerHTML = `<p id="p" style="font-size: 20px; color: red">text</p>`;
    const context = ctx({ readFontSize: () => 20 });

    fontScale.apply(1.5, context);
    expect(sizeOf('p')).toBe('30px');

    fontScale.remove(context);
    expect(sizeOf('p')).toBe('20px');
    expect(document.getElementById('p')!.style.color).toBe('red');
  });

  it('restores a pre-existing !important inline font-size with its priority', () => {
    document.body.innerHTML = `<p id="p" style="font-size: 20px !important">text</p>`;
    const context = ctx({ readFontSize: () => 20 });

    fontScale.apply(1.5, context);
    fontScale.remove(context);

    expect(sizeOf('p')).toBe('20px');
    expect(document.getElementById('p')!.style.getPropertyPriority('font-size')).toBe('important');
  });

  it('leaves other inline properties untouched', () => {
    document.body.innerHTML = `<p id="p" style="color: blue">text</p>`;
    const context = ctx();
    fontScale.apply(1.5, context);
    fontScale.remove(context);
    expect(document.getElementById('p')!.getAttribute('style')).toBe('color: blue;');
  });

  it('reverts to 1 through apply() as well as remove()', () => {
    document.body.innerHTML = `<p id="p">text</p>`;
    const context = ctx();
    fontScale.apply(1.5, context);
    fontScale.apply(1, context);
    expect(document.getElementById('p')!.getAttribute('style')).toBeNull();
  });
});

describe('dynamic content', () => {
  /**
   * MutationObserver delivers its records at the microtask checkpoint, so even
   * a synchronous scheduler cannot make this observable in the same tick.
   */
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  function engineWith(scale: number) {
    const engine = createAccessibilityEngine({
      scheduler: createSyncScheduler(),
      readFontSize: () => 16,
    });
    engine.apply({ ...DEFAULT_SETTINGS, fontScale: scale });
    return engine;
  }

  it('scales nodes added after the fact', async () => {
    document.body.innerHTML = `<div id="host"></div>`;
    const engine = engineWith(1.5);

    const added = document.createElement('p');
    added.id = 'late';
    added.textContent = 'added later';
    document.getElementById('host')!.appendChild(added);
    await settle();

    expect(sizeOf('late')).toBe('24px');
    engine.destroy();
  });

  it('ignores nodes added inside an excluded subtree', async () => {
    document.body.innerHTML = `<div id="host" data-a11y-exclude></div>`;
    const engine = engineWith(1.5);

    const added = document.createElement('p');
    added.id = 'late';
    added.textContent = 'added later';
    document.getElementById('host')!.appendChild(added);
    await settle();

    expect(sizeOf('late')).toBe('');
    engine.destroy();
  });

  it('ignores a node that is removed again before the frame runs', async () => {
    document.body.innerHTML = `<div id="host"></div>`;
    // A manual scheduler, so the add and the remove both land before the flush —
    // the React add-then-remove-in-one-batch shape.
    let pending: (() => void) | null = null;
    const engine = createAccessibilityEngine({
      readFontSize: () => 16,
      scheduler: {
        schedule: (fn) => {
          pending = fn;
        },
        flush: () => {},
        cancel: () => {
          pending = null;
        },
      },
    });
    engine.apply({ ...DEFAULT_SETTINGS, fontScale: 1.5 });

    const added = document.createElement('p');
    added.textContent = 'transient';
    document.getElementById('host')!.appendChild(added);
    added.remove();
    await settle();

    expect(() => (pending as unknown as (() => void) | null)?.()).not.toThrow();
    expect(added.getAttribute('style')).toBeNull();
    engine.destroy();
  });

  it('stops observing once scaling is switched off', async () => {
    document.body.innerHTML = `<div id="host"></div>`;
    const engine = engineWith(1.5);
    engine.apply(DEFAULT_SETTINGS);

    const added = document.createElement('p');
    added.id = 'late';
    added.textContent = 'added later';
    document.getElementById('host')!.appendChild(added);
    await settle();

    expect(sizeOf('late')).toBe('');
    engine.destroy();
  });
});
