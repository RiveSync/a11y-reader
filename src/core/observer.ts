import type { EngineContext } from './types';

export interface ScopeObserver {
  start(): void;
  stop(): void;
}

/**
 * Watches the scope for nodes the host adds after we have already run.
 *
 * Four guards, each of which corresponds to a way this goes wrong in practice:
 *
 * 1. **Our own hosts.** The shadow hosts are appended to <body>, which is in
 *    scope, so the observer sees them. Everything is filtered through
 *    `isExcluded` before any work happens.
 * 2. **Disconnected nodes.** React unmounts routinely produce add-then-remove
 *    inside a single batch; processing a node that is already gone wastes work
 *    and, worse, records revert data for an element nobody will ever revert.
 * 3. **Late records.** `takeRecords()` is drained before `disconnect()`,
 *    otherwise queued records fire after teardown and re-dirty the page.
 * 4. **Re-entrancy.** Only `childList` is observed, so our own inline style
 *    writes (which produce `attributes` records) cannot feed back in. The
 *    value-comparison guard in fontScale covers the case where they can — see
 *    the note there.
 */
export function createScopeObserver(
  ctx: EngineContext,
  onAdded: (nodes: Element[]) => void,
): ScopeObserver {
  let observer: MutationObserver | null = null;
  const pending = new Set<Element>();

  const flush = (): void => {
    if (pending.size === 0) return;
    const batch: Element[] = [];
    for (const node of pending) {
      // Guard 2: the node may have been removed again before this frame ran.
      if (node.isConnected && !ctx.isExcluded(node)) batch.push(node);
    }
    pending.clear();
    if (batch.length > 0) onAdded(batch);
  };

  const handle = (records: MutationRecord[]): void => {
    let sawAny = false;
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1 /* ELEMENT_NODE */) continue;
        const el = node as Element;
        // Guard 1: never look inside our own UI.
        if (ctx.isExcluded(el)) continue;
        pending.add(el);
        sawAny = true;
      }
    }
    // Coalesce a burst of records into one pass on the next frame.
    if (sawAny) ctx.scheduler.schedule(flush);
  };

  return {
    start() {
      if (observer) return;
      const instance = new ctx.win.MutationObserver(handle);
      observer = instance;
      for (const root of ctx.roots()) {
        instance.observe(root, { childList: true, subtree: true });
      }
    },

    stop() {
      if (!observer) return;
      // Guard 3.
      handle(observer.takeRecords());
      observer.disconnect();
      observer = null;
      pending.clear();
      ctx.scheduler.cancel();
    },
  };
}
