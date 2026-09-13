/**
 * vitest-axe ships a type augmentation for an older vitest `Assertion`
 * interface (vitest 5 changed its generic signature to `Assertion<R, T>`), so
 * its own `toHaveNoViolations` declaration no longer lands. The matcher itself
 * works at runtime; this re-declares it against the current shape.
 *
 * Drop this file once vitest-axe ships vitest 5 types.
 */
import 'vitest';

declare module 'vitest' {
  interface Assertion<R, T> {
    toHaveNoViolations(): R;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}
