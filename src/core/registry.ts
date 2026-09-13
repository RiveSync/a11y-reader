/**
 * Per-document bookkeeping, addressed by a global symbol.
 *
 * Why this exists: the React entry cannot use code splitting (a shared chunk
 * would not carry the 'use client' banner), so `src/core` is duplicated into
 * the index bundle. An app importing both entries therefore runs two copies of
 * every core module. Module-local state would silently fork — one copy would
 * apply font scaling and the other would hold the revert data.
 *
 * Keying off the document via Symbol.for makes the duplication harmless: both
 * copies see the same records, and every operation stays idempotent.
 */

export interface FsRecord {
  /** Computed font-size in px before we touched it. */
  original: number;
  /** Inline font-size the host had set, '' if none. */
  priorInline: string;
  /** 'important' | '' — the priority that inline value carried. */
  priorPriority: string;
  /** What we last wrote, used to recognise our own mutations. */
  written: string;
}

export interface Registry {
  fontScale: WeakMap<Element, FsRecord>;
  /** WeakMap is not enumerable; this is how revert finds its work. */
  fontScaleSet: Set<Element>;
  /** Elements the icon tagger marked, so untagging is exact. */
  iconTagged: Set<Element>;
}

const REGISTRY_KEY = Symbol.for('a11y-reader.registry');

type Carrier = Document & { [REGISTRY_KEY]?: Registry };

export function getRegistry(doc: Document): Registry {
  const carrier = doc as Carrier;
  let registry = carrier[REGISTRY_KEY];
  if (!registry) {
    registry = {
      fontScale: new WeakMap<Element, FsRecord>(),
      fontScaleSet: new Set<Element>(),
      iconTagged: new Set<Element>(),
    };
    carrier[REGISTRY_KEY] = registry;
  }
  return registry;
}

/** Test helper: drop all bookkeeping for a document. */
export function clearRegistry(doc: Document): void {
  delete (doc as Carrier)[REGISTRY_KEY];
}
