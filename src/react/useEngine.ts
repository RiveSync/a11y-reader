import { useEffect } from 'react';
import { createAccessibilityEngine } from '../core/engine';
import type { EngineOptions } from '../core/types';
import type { SettingsStore } from './store';

/**
 * Owns the engine's lifetime and keeps it fed from the store.
 *
 * Runs in an effect, so nothing here executes during render or on the server —
 * PRD 9's rule about window/document/localStorage.
 *
 * The dependency list is a serialised key rather than the options object, which
 * a host will almost always recreate inline on every render; depending on its
 * identity would tear down and rebuild the engine (and re-walk the document)
 * on each one.
 */
export function useEngine(store: SettingsStore, options: EngineOptions, enabled: boolean): void {
  const key = JSON.stringify([
    options.scope ?? null,
    options.exclude ?? null,
    typeof options.fontSource === 'object' ? options.fontSource : (options.fontSource ?? null),
    options.zIndex ?? null,
    options.contrastGrayscaleMedia ?? null,
  ]);

  useEffect(() => {
    if (!enabled) return;

    const engine = createAccessibilityEngine({
      scope: options.scope,
      exclude: options.exclude,
      fontSource: options.fontSource,
      zIndex: options.zIndex,
      contrastGrayscaleMedia: options.contrastGrayscaleMedia,
    });

    engine.apply(store.getState());
    const unsubscribe = store.subscribe(() => engine.apply(store.getState()));

    return () => {
      unsubscribe();
      // Leaves no attribute, style element or host behind.
      engine.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, key, enabled]);
}
