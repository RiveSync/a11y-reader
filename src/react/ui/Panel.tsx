import { useRef } from 'react';
import { LINE_HEIGHT_DISPLAY_DEFAULT, RANGES } from '../../core/constants';
import type { AccessibilitySettings, ReadingAidMode, WidgetLabels } from '../../core/types';
import { useFocusTrap } from '../useFocusTrap';
import { ColorField } from './ColorField';
import { Segmented } from './Segmented';
import { Slider } from './Slider';
import { Toggle } from './Toggle';

export interface FeatureFlags {
  dyslexicFont: boolean;
  highContrast: boolean;
  fontScale: boolean;
  letterSpacing: boolean;
  lineHeight: boolean;
  readingAid: boolean;
}

export interface PanelProps {
  id: string;
  labels: WidgetLabels;
  features: FeatureFlags;
  settings: AccessibilitySettings;
  hideBranding: boolean;
  openedByKeyboard: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onChange(next: Partial<AccessibilitySettings>): void;
  onReset(): void;
  onClose(): void;
}

export function Panel({
  id,
  labels,
  features,
  settings,
  hideBranding,
  openedByKeyboard,
  triggerRef,
  onChange,
  onReset,
  onClose,
}: PanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef, {
    active: true,
    // Trapping a mouse user inside the panel would stop them scrolling the page
    // to see their changes take effect — which is the whole point of a
    // non-modal dialog here.
    trap: openedByKeyboard,
    onEscape: onClose,
    returnFocusTo: triggerRef.current,
  });

  const aid = settings.readingAid;

  return (
    <div
      ref={panelRef}
      id={id}
      className="panel"
      part="panel"
      role="dialog"
      // Non-modal on purpose: the user needs to see the page change live as
      // they move each slider.
      aria-modal="false"
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
    >
      <div className="panel-head">
        <h2 className="panel-title" id={`${id}-title`}>
          {labels.title}
        </h2>
        <button type="button" className="close" aria-label={labels.closePanel} onClick={onClose}>
          &times;
        </button>
      </div>

      {features.dyslexicFont && (
        <Toggle
          id={`${id}-dyslexic`}
          label={labels.dyslexicFont}
          checked={settings.dyslexicFont}
          onChange={(dyslexicFont) => onChange({ dyslexicFont })}
        />
      )}

      {features.highContrast && (
        <Toggle
          id={`${id}-contrast`}
          label={labels.highContrast}
          checked={settings.highContrast}
          onChange={(highContrast) => onChange({ highContrast })}
        />
      )}

      {features.fontScale && (
        <Slider
          id={`${id}-scale`}
          label={labels.fontScale}
          value={settings.fontScale}
          min={RANGES.fontScale.min}
          max={RANGES.fontScale.max}
          step={RANGES.fontScale.step}
          format={(value) => `${Math.round(value * 100)}%`}
          decreaseLabel={labels.decrease}
          increaseLabel={labels.increase}
          onChange={(fontScale) => onChange({ fontScale })}
        />
      )}

      {features.letterSpacing && (
        <Slider
          id={`${id}-letter`}
          label={labels.letterSpacing}
          value={settings.letterSpacing}
          min={RANGES.letterSpacing.min}
          max={RANGES.letterSpacing.max}
          step={RANGES.letterSpacing.step}
          format={(value) => `${value.toFixed(2)}em`}
          decreaseLabel={labels.decrease}
          increaseLabel={labels.increase}
          onChange={(letterSpacing) => onChange({ letterSpacing })}
        />
      )}

      {features.lineHeight && (
        <Slider
          id={`${id}-line`}
          label={labels.lineHeight}
          // null means untouched: the slider shows 1.5 but nothing is applied
          // to the page until the user actually moves it.
          value={settings.lineHeight ?? LINE_HEIGHT_DISPLAY_DEFAULT}
          min={RANGES.lineHeight.min}
          max={RANGES.lineHeight.max}
          step={RANGES.lineHeight.step}
          format={(value) =>
            settings.lineHeight === null
              ? `${value.toFixed(1)} (${labels.defaultValue})`
              : value.toFixed(1)
          }
          decreaseLabel={labels.decrease}
          increaseLabel={labels.increase}
          onChange={(lineHeight) => onChange({ lineHeight })}
        />
      )}

      {features.readingAid && (
        <>
          <Segmented<ReadingAidMode>
            id={`${id}-aid-mode`}
            label={labels.readingAid}
            value={aid.mode}
            options={[
              { value: 'off', label: labels.readingAidOff },
              { value: 'ruler', label: labels.readingAidRuler },
              { value: 'mask', label: labels.readingAidMask },
            ]}
            onChange={(mode) => onChange({ readingAid: { ...aid, mode } })}
          />

          {aid.mode !== 'off' && (
            <div className="row">
              <ColorField
                id={`${id}-aid-color`}
                colorLabel={labels.color}
                opacityLabel={labels.opacity}
                value={aid.color}
                onChange={(color) => onChange({ readingAid: { ...aid, color } })}
              />
              <Slider
                id={`${id}-aid-height`}
                label={labels.height}
                value={aid.height}
                min={RANGES.aidHeight.min}
                max={RANGES.aidHeight.max}
                step={RANGES.aidHeight.step}
                format={(value) => `${value}px`}
                decreaseLabel={labels.decrease}
                increaseLabel={labels.increase}
                onChange={(height) => onChange({ readingAid: { ...aid, height } })}
              />
            </div>
          )}
        </>
      )}

      <div className="footer">
        <button type="button" className="reset" onClick={onReset}>
          {labels.resetAll}
        </button>
        {!hideBranding && <span className="branding">Reading tools</span>}
      </div>
    </div>
  );
}
