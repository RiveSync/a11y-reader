import { DEFAULT_Z_INDEX, HOST_IDS, STYLE_IDS } from './constants';
import {
  buildExcludeCss,
  buildExcludeList,
  createExcludeMatcher,
  ensureStyle,
  removeHost,
  removeStyle,
  toSelectorList,
} from './dom';
import { dyslexicFont } from './features/dyslexicFont';
import { applyScaleToSubtree, fontScale } from './features/fontScale';
import { highContrast } from './features/highContrast';
import { letterSpacing } from './features/letterSpacing';
import { lineHeight } from './features/lineHeight';
import { createReadingAid, type ReadingAidController } from './features/readingAid';
import { createScopeObserver, type ScopeObserver } from './observer';
import { createFrameScheduler } from './scheduler';
import { createTagger } from './tagger';
import { cloneSettings, diffSettings } from './settings';
import { buildBaseCss } from './styles';
import type { A11yEngine, AccessibilitySettings, EngineContext, EngineOptions } from './types';

function defaultReadFontSize(win: Window) {
  return (el: Element): number => parseFloat(win.getComputedStyle(el).fontSize) || 0;
}

export function createEngineContext(options: EngineOptions = {}): EngineContext {
  const doc = options.document ?? globalThis.document;
  if (!doc) {
    throw new Error(
      '[a11y-reader] createAccessibilityEngine() needs a document. Call it in an effect or event handler, not during render or at module scope.',
    );
  }
  const win = (doc.defaultView ?? globalThis.window) as Window & typeof globalThis;

  const scope = toSelectorList(options.scope, ['body']);
  const exclude = toSelectorList(options.exclude, []);
  const excludeList = buildExcludeList(exclude);

  return {
    doc,
    win,
    scope,
    exclude,
    excludeSelector: excludeList.join(', '),
    excludeCss: buildExcludeCss(excludeList),
    fontSource: options.fontSource ?? 'bundled',
    zIndex: options.zIndex ?? DEFAULT_Z_INDEX,
    contrastGrayscaleMedia: options.contrastGrayscaleMedia ?? false,
    scheduler: options.scheduler ?? createFrameScheduler(win),
    readFontSize: options.readFontSize ?? defaultReadFontSize(win),
    roots() {
      const found: Element[] = [];
      for (const selector of scope) {
        try {
          found.push(...doc.querySelectorAll(selector));
        } catch {
          // A malformed scope selector should not disable the whole engine.
        }
      }
      return found.length > 0 ? found : [doc.body].filter(Boolean);
    },
    isExcluded: createExcludeMatcher(excludeList),
  };
}

/**
 * Owns the page transformations.
 *
 * Two properties the rest of the package leans on:
 *
 * - **Diffing.** apply() touches only the features whose value actually
 *   changed. Font scaling walks the entire document, so re-running it because
 *   an unrelated toggle moved is the difference between a responsive panel and
 *   a janky one.
 * - **Exact revert.** Every feature's remove() restores the document to its
 *   prior state, and destroy() leaves no attribute, style element or host
 *   behind. The acceptance criteria are written as a screenshot diff against
 *   that guarantee.
 */
export function createAccessibilityEngine(options: EngineOptions = {}): A11yEngine {
  const ctx = createEngineContext(options);
  let applied: AccessibilitySettings | null = null;
  let observer: ScopeObserver | null = null;
  let readingAid: ReadingAidController | null = null;
  let destroyed = false;

  // The whole stylesheet is gated behind data-a11y-* attributes on <html>, so
  // injecting it up front changes nothing visually and makes each feature a
  // single attribute write. getPreloadScript() emits the identical CSS, and
  // ensureStyle adopts that element rather than appending a duplicate.
  ensureStyle(
    ctx.doc,
    STYLE_IDS.base,
    buildBaseCss({ excludeCss: ctx.excludeCss, grayscaleMedia: ctx.contrastGrayscaleMedia }),
  );

  const applyKey = (key: string, settings: AccessibilitySettings): void => {
    switch (key) {
      case 'dyslexicFont':
        dyslexicFont.apply(settings.dyslexicFont, ctx);
        break;
      case 'highContrast':
        highContrast.apply(settings.highContrast, ctx);
        break;
      case 'letterSpacing':
        letterSpacing.apply(settings.letterSpacing, ctx);
        break;
      case 'lineHeight':
        lineHeight.apply(settings.lineHeight, ctx);
        break;
      case 'fontScale':
        fontScale.apply(settings.fontScale, ctx);
        break;
      case 'readingAid':
        // Created lazily: a visitor who never turns the aid on never gets an
        // extra shadow host in their document.
        if (settings.readingAid.mode !== 'off') readingAid ??= createReadingAid(ctx);
        readingAid?.apply(settings.readingAid);
        break;
    }
  };

  /**
   * Catch up content the host added after we ran.
   *
   * Only the two features that walk the DOM care; the CSS-driven ones apply to
   * new nodes automatically through the cascade.
   */
  const handleAdded = (nodes: Element[]): void => {
    const current = applied;
    if (!current) return;
    if (current.dyslexicFont) {
      const tagger = createTagger(ctx);
      for (const node of nodes) tagger.tagSubtree(node);
    }
    if (current.fontScale !== 1) applyScaleToSubtree(nodes, current.fontScale, ctx);
  };

  const syncObserver = (settings: AccessibilitySettings): void => {
    const needed = settings.fontScale !== 1 || settings.dyslexicFont;
    if (needed) {
      observer ??= createScopeObserver(ctx, handleAdded);
      observer.start();
    } else if (observer) {
      observer.stop();
      observer = null;
    }
  };

  return {
    apply(settings: AccessibilitySettings) {
      if (destroyed) return;
      for (const key of diffSettings(applied, settings)) applyKey(key, settings);
      applied = cloneSettings(settings);
      // After `applied` is set, so the observer callback sees current state.
      syncObserver(applied);
    },

    refresh() {
      if (destroyed || applied === null) return;
      const current = applied;
      applied = null;
      this.apply(current);
    },

    getApplied() {
      return applied === null ? null : cloneSettings(applied);
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer?.stop();
      observer = null;
      readingAid?.remove();
      readingAid = null;
      ctx.scheduler.cancel();
      fontScale.remove(ctx);
      dyslexicFont.remove(ctx);
      highContrast.remove(ctx);
      letterSpacing.remove(ctx);
      lineHeight.remove(ctx);
      removeStyle(ctx.doc, STYLE_IDS.base);
      removeHost(ctx.doc, HOST_IDS.aid);
      applied = null;
    },
  };
}
