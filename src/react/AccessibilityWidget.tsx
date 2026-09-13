import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { mix } from '../core/color';
import { DEFAULT_THEME, DEFAULT_Z_INDEX } from '../core/constants';
import { isDefaultSettings } from '../core/settings';
import type { AccessibilitySettings, WidgetTheme } from '../core/types';
import { AccessibilityProvider, type AccessibilityProviderProps } from './AccessibilityProvider';
import { useA11yContext, useOptionalA11yContext } from './context';
import { ShadowPortal } from './shadow';
import { Panel, type FeatureFlags } from './ui/Panel';
import { Trigger } from './ui/Trigger';
import { WIDGET_CSS } from './ui/widget.css';
import { useHotkey } from './useHotkey';
import { useMediaQuery } from './useMediaQuery';
import { useMounted } from './useMounted';

const PANEL_ID = 'a11y-reader-panel';
const HOST_ID = 'a11y-reader-ui';

export interface AccessibilityWidgetProps extends AccessibilityProviderProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  offset?: { x: number; y: number };
  features?: Partial<FeatureFlags>;
  theme?: Partial<WidgetTheme>;
  /** Keyboard shortcut to toggle the panel, or false to disable. */
  hotkey?: string | false;
  /** Hide the built-in button and drive the panel from your own UI. */
  hideTrigger?: boolean;
}

const ALL_FEATURES: FeatureFlags = {
  dyslexicFont: true,
  highContrast: true,
  fontScale: true,
  letterSpacing: true,
  lineHeight: true,
  readingAid: true,
};

function WidgetUI(props: AccessibilityWidgetProps) {
  const {
    position = 'bottom-right',
    offset = { x: 20, y: 20 },
    features,
    theme,
    hotkey = 'Alt+A',
    hideTrigger = false,
    zIndex = DEFAULT_Z_INDEX,
  } = props;

  const ctx = useA11yContext();
  const mounted = useMounted();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const settings = useSyncExternalStore(ctx.store.subscribe, ctx.store.getState, ctx.store.getState);

  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const resolved = useMemo(() => ({ ...DEFAULT_THEME, ...theme }), [theme]);
  const isDark =
    resolved.darkMode === 'dark' || (resolved.darkMode === 'auto' && prefersDark);

  const toggle = useCallback((viaKeyboard: boolean) => ctx.toggle(viaKeyboard), [ctx]);
  // A hotkey is by definition a keyboard activation, so the panel traps focus.
  useHotkey(hotkey, useCallback(() => ctx.toggle(true), [ctx]));

  const onChange = useCallback(
    (patch: Partial<AccessibilitySettings>) => {
      ctx.setSettings((prev) => ({ ...prev, ...patch }));
    },
    [ctx],
  );

  // Returning null until mounted is what keeps SSR and hydration in step: the
  // widget's markup depends on localStorage and matchMedia, neither of which
  // exists on the server.
  if (!mounted) return null;

  const background = theme?.backgroundColor ?? (isDark ? '#1f2937' : resolved.backgroundColor);
  const foreground = theme?.textColor ?? (isDark ? '#f9fafb' : resolved.textColor);

  const rootStyle = {
    '--a11y-primary': resolved.primaryColor,
    '--a11y-bg': background,
    '--a11y-text': foreground,
    // Derived opaque, so every one of these has a contrast ratio that actually
    // exists and that tooling can measure. 70% keeps muted text above AA.
    '--a11y-muted': mix(foreground, background, 0.7),
    '--a11y-border': mix(foreground, background, 0.2),
    '--a11y-hover': mix(foreground, background, 0.08),
    '--a11y-radius': resolved.borderRadius,
    '--a11y-font': resolved.fontFamily,
    '--a11y-button-size': `${resolved.buttonSize}px`,
    '--a11y-offset-x': `${offset.x}px`,
    '--a11y-offset-y': `${offset.y}px`,
  } as React.CSSProperties;

  const enabled: FeatureFlags = { ...ALL_FEATURES, ...features };

  return (
    <ShadowPortal
      id={HOST_ID}
      zIndex={zIndex}
      css={WIDGET_CSS}
      rootProps={{
        style: rootStyle,
        'data-position': position,
        'data-theme': isDark ? 'dark' : 'light',
      }}
    >
      {!hideTrigger && (
        <Trigger
          labels={ctx.labels}
          isOpen={ctx.isOpen}
          panelId={PANEL_ID}
          hasChanges={!isDefaultSettings(settings)}
          buttonRef={triggerRef}
          onToggle={toggle}
        />
      )}

      {ctx.isOpen && (
        <Panel
          id={PANEL_ID}
          labels={ctx.labels}
          features={enabled}
          settings={settings}
          hideBranding={resolved.hideBranding}
          openedByKeyboard={ctx.openedByKeyboard}
          triggerRef={triggerRef}
          onChange={onChange}
          onReset={ctx.reset}
          onClose={ctx.close}
        />
      )}
    </ShadowPortal>
  );
}

/**
 * The one component a host needs.
 *
 * Creates its own provider when there isn't one above it, so the documented
 * zero-config usage works, while a host that needs `useAccessibilityWidget()`
 * far from the widget can wrap the tree in `<AccessibilityProvider>` and this
 * will join it instead of starting a second, competing store.
 */
export function AccessibilityWidget(props: AccessibilityWidgetProps) {
  const existing = useOptionalA11yContext();
  if (existing) return <WidgetUI {...props} />;

  return (
    <AccessibilityProvider
      {...props}
      // PRD 6.3 puts contrastGrayscaleMedia on the theme, but it is the engine
      // that needs it. Without this it would be silently inert when set the
      // documented way. The top-level prop still wins, for provider-only usage
      // where there is no theme.
      contrastGrayscaleMedia={props.contrastGrayscaleMedia ?? props.theme?.contrastGrayscaleMedia}
    >
      <WidgetUI {...props} />
    </AccessibilityProvider>
  );
}
