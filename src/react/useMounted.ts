import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * False during SSR and during hydration, true afterwards.
 *
 * The widget reads localStorage and measures the document, so it cannot render
 * the same markup on the server as on the client. useSyncExternalStore is the
 * right tool rather than useEffect + useState: it gives React an explicit
 * server snapshot, so there is no hydration mismatch to recover from, no extra
 * render pass, and it behaves correctly under streaming and Suspense.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
