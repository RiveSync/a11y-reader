/**
 * Widget styling, as a string.
 *
 * Kept in TS rather than a .css file so tsup needs no CSS pipeline and the
 * whole widget ships as one JS chunk with nothing for the host to import.
 *
 * Everything is driven by custom properties set on `.a11y-root`, which is also
 * what `::part()` overrides hook into.
 */
export const WIDGET_CSS = `
/*
 * Reset only the inherited properties that can cross a shadow boundary — the
 * page transformations set color, font-family, letter-spacing and line-height
 * on every element, and inheritance does not stop at the host.
 *
 * NOT \`all: initial\` on :host: that would reset position:fixed and collapse
 * the whole overlay.
 */
:host {
  color: initial;
  letter-spacing: normal;
  line-height: normal;
  font-style: normal;
  font-weight: normal;
  text-transform: none;
}

.a11y-root {
  all: initial;
  display: block;
  font-family: var(--a11y-font);
  color: var(--a11y-text);
  line-height: 1.5;

  --a11y-surface: var(--a11y-bg);
  /*
   * --a11y-muted, --a11y-border and --a11y-hover are supplied as opaque rgb()
   * by the widget (see derivePalette). They are not computed here with
   * color-mix(): an unsupported color-mix() resolves to nothing, which for a
   * text colour means unreadable text, and its color(srgb …) output is misread
   * by contrast checkers.
   */
  --a11y-shadow: 0 10px 38px rgba(0, 0, 0, 0.18), 0 3px 10px rgba(0, 0, 0, 0.12);
}

.a11y-root[data-theme='dark'] {
  --a11y-shadow: 0 10px 38px rgba(0, 0, 0, 0.5), 0 3px 10px rgba(0, 0, 0, 0.4);
}

/* The host is click-through so the page stays usable; the widget's own
   surfaces opt back in. */
.trigger,
.panel {
  pointer-events: auto;
}

/* ---------- trigger ---------- */

.trigger {
  position: fixed;
  width: var(--a11y-button-size);
  height: var(--a11y-button-size);
  border-radius: 50%;
  border: none;
  background: var(--a11y-primary);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-shadow: var(--a11y-shadow);
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.trigger:hover {
  transform: scale(1.05);
}

.trigger:focus-visible {
  outline: 3px solid var(--a11y-primary);
  outline-offset: 3px;
}

.trigger svg {
  width: 60%;
  height: 60%;
  display: block;
}

/* Signals "you have settings applied" without adding another control. */
.badge {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ef4444;
  border: 2px solid var(--a11y-bg);
}

/* env() keeps the button clear of the home indicator and notch. */
[data-position$='right'] .trigger { right: calc(var(--a11y-offset-x) + env(safe-area-inset-right, 0px)); }
[data-position$='left']  .trigger { left:  calc(var(--a11y-offset-x) + env(safe-area-inset-left, 0px)); }
[data-position^='bottom'] .trigger { bottom: calc(var(--a11y-offset-y) + env(safe-area-inset-bottom, 0px)); }
[data-position^='top']    .trigger { top:    calc(var(--a11y-offset-y) + env(safe-area-inset-top, 0px)); }

/* ---------- panel ---------- */

.panel {
  position: fixed;
  width: 330px;
  max-height: 80vh;
  overflow-y: auto;
  background: var(--a11y-surface);
  color: var(--a11y-text);
  border-radius: var(--a11y-radius);
  box-shadow: var(--a11y-shadow);
  border: 1px solid var(--a11y-border);
  padding: 18px;
  box-sizing: border-box;
  animation: a11y-in 140ms ease-out;
}

@keyframes a11y-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: none; }
}

/*
 * The animation translates the *panel*, never the host. A transform on the
 * host would make it the containing block for its position:fixed children and
 * collapse the reading-aid overlays.
 */
@media (prefers-reduced-motion: reduce) {
  .panel { animation: none; }
  .trigger { transition: none; }
  .trigger:hover { transform: none; }
}

[data-position$='right'] .panel { right: calc(var(--a11y-offset-x) + env(safe-area-inset-right, 0px)); }
[data-position$='left']  .panel { left:  calc(var(--a11y-offset-x) + env(safe-area-inset-left, 0px)); }
[data-position^='bottom'] .panel { bottom: calc(var(--a11y-offset-y) + var(--a11y-button-size) + 12px + env(safe-area-inset-bottom, 0px)); }
[data-position^='top']    .panel { top:    calc(var(--a11y-offset-y) + var(--a11y-button-size) + 12px + env(safe-area-inset-top, 0px)); }

/* Bottom sheet on phones: a 330px popover anchored to a corner is unusable at
   375px wide. */
@media (max-width: 480px) {
  .a11y-root .panel {
    left: 0;
    right: 0;
    bottom: 0;
    top: auto;
    width: 100%;
    max-height: 85vh;
    border-radius: var(--a11y-radius) var(--a11y-radius) 0 0;
    padding-bottom: calc(18px + env(safe-area-inset-bottom, 0px));
  }
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--a11y-muted);
  border-radius: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  line-height: 1;
}

.close:hover { background: var(--a11y-hover); }
.close:focus-visible,
.row input:focus-visible,
.seg button:focus-visible,
.stepper:focus-visible,
.reset:focus-visible {
  outline: 2px solid var(--a11y-primary);
  outline-offset: 2px;
}

/* ---------- rows ---------- */

.row {
  padding: 12px 0;
  border-top: 1px solid var(--a11y-border);
}

.row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.row-label {
  font-size: 14px;
  font-weight: 500;
}

.row-value {
  font-size: 13px;
  color: var(--a11y-muted);
  font-variant-numeric: tabular-nums;
}

/* ---------- toggle ---------- */

.switch {
  position: relative;
  width: 44px;
  height: 26px;
  flex: none;
}

.switch input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.track {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: var(--a11y-border);
  transition: background 120ms ease;
  pointer-events: none;
}

.knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: transform 120ms ease;
  pointer-events: none;
}

.switch input:checked ~ .track { background: var(--a11y-primary); }
.switch input:checked ~ .knob { transform: translateX(18px); }
.switch input:focus-visible ~ .track { outline: 2px solid var(--a11y-primary); outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  .track, .knob { transition: none; }
}

/* ---------- slider ---------- */

.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.slider-row input[type='range'] {
  flex: 1;
  min-width: 0;
  accent-color: var(--a11y-primary);
  margin: 0;
}

.stepper {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--a11y-border);
  background: none;
  color: var(--a11y-text);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stepper:hover:not(:disabled) { background: var(--a11y-hover); }
.stepper:disabled { opacity: 0.4; cursor: default; }

/* ---------- segmented ---------- */

.seg {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  background: var(--a11y-hover);
  border-radius: 10px;
  padding: 3px;
}

.seg button {
  flex: 1;
  border: none;
  background: none;
  color: var(--a11y-text);
  border-radius: 8px;
  padding: 7px 4px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}

.seg button[aria-checked='true'] {
  background: var(--a11y-surface);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.14);
}

/* ---------- colour ---------- */

.color-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.color-row input[type='color'] {
  width: 38px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--a11y-border);
  border-radius: 8px;
  background: none;
  cursor: pointer;
  flex: none;
}

/* ---------- footer ---------- */

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--a11y-border);
}

.reset {
  background: none;
  border: 1px solid var(--a11y-border);
  color: var(--a11y-text);
  border-radius: 9px;
  padding: 7px 12px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}

.reset:hover { background: var(--a11y-hover); }

.branding {
  font-size: 11px;
  color: var(--a11y-muted);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
`;
