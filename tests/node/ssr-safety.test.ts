import { describe, expect, it } from 'vitest';

/**
 * Runs in a node environment with no DOM at all.
 *
 * PRD 9 forbids touching window/document/localStorage at module scope. The
 * cheapest possible proof is that the core entry imports cleanly where those
 * globals do not exist — if anyone adds a top-level DOM access, this throws.
 */
describe('core entry under SSR', () => {
  it('imports without a DOM present', async () => {
    expect(globalThis.document).toBeUndefined();
    expect(globalThis.window).toBeUndefined();

    const core = await import('../../src/core');

    expect(core.DEFAULT_SETTINGS.fontScale).toBe(1);
    expect(core.DEFAULT_LABELS.title).toBe('Reading preferences');
  });
});
