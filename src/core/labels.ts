import type { WidgetLabels } from './types';

/** Kept in its own module so the core entry can tree-shake it away. */
export const DEFAULT_LABELS: WidgetLabels = {
  openPanel: 'Open reading preferences',
  closePanel: 'Close reading preferences',
  title: 'Reading preferences',
  dyslexicFont: 'Dyslexia-friendly font',
  highContrast: 'High contrast',
  fontScale: 'Text size',
  letterSpacing: 'Letter spacing',
  lineHeight: 'Line spacing',
  readingAid: 'Reading aid',
  readingAidOff: 'Off',
  readingAidRuler: 'Ruler',
  readingAidMask: 'Focus mask',
  color: 'Colour',
  opacity: 'Opacity',
  height: 'Height',
  resetAll: 'Reset all',
  increase: 'Increase',
  decrease: 'Decrease',
  defaultValue: 'default',
};
