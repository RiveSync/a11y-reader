import { useEffect } from 'react';

export interface ParsedHotkey {
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  code: string;
}

/**
 * Parse a descriptor like 'Alt+A' or 'Ctrl+Shift+K'.
 *
 * Resolves to a KeyboardEvent.code rather than .key: `.key` for Alt+A is 'å'
 * on macOS and varies by keyboard layout, so matching on it silently fails for
 * a large share of users.
 */
export function parseHotkey(descriptor: string): ParsedHotkey | null {
  const parts = descriptor
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const key = parts[parts.length - 1]!;
  const modifiers = parts.slice(0, -1).map((m) => m.toLowerCase());

  let code: string;
  if (/^[a-z]$/i.test(key)) code = `Key${key.toUpperCase()}`;
  else if (/^[0-9]$/.test(key)) code = `Digit${key}`;
  else code = key;

  return {
    alt: modifiers.includes('alt') || modifiers.includes('option'),
    ctrl: modifiers.includes('ctrl') || modifiers.includes('control'),
    meta: modifiers.includes('meta') || modifiers.includes('cmd') || modifiers.includes('command'),
    shift: modifiers.includes('shift'),
    code,
  };
}

export function useHotkey(descriptor: string | false | undefined, onPress: () => void): void {
  useEffect(() => {
    if (!descriptor) return;
    const hotkey = parseHotkey(descriptor);
    if (!hotkey) return;

    const handler = (event: KeyboardEvent) => {
      if (
        event.code !== hotkey.code ||
        event.altKey !== hotkey.alt ||
        event.ctrlKey !== hotkey.ctrl ||
        event.metaKey !== hotkey.meta ||
        event.shiftKey !== hotkey.shift
      ) {
        return;
      }
      event.preventDefault();
      onPress();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [descriptor, onPress]);
}
