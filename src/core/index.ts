export type {
  AccessibilitySettings,
  ReadingAidSettings,
  ReadingAidMode,
  FollowMode,
  FontSource,
  WidgetTheme,
  WidgetLabels,
  PersistedState,
  EngineOptions,
  EngineContext,
  FeatureModule,
  FrameScheduler,
  A11yEngine,
} from './types';

export {
  DEFAULT_SETTINGS,
  DEFAULT_THEME,
  DEFAULT_STORAGE_KEY,
  DEFAULT_AID_COLOR,
  DEFAULT_AID_HEIGHT,
  DEFAULT_Z_INDEX,
  LINE_HEIGHT_DISPLAY_DEFAULT,
  RANGES,
  STORAGE_VERSION,
} from './constants';

export { DEFAULT_LABELS } from './labels';

export { createAccessibilityEngine, createEngineContext } from './engine';

export {
  clampToRange,
  cloneSettings,
  diffSettings,
  isDefaultSettings,
  mergeSettings,
  settingsEqual,
} from './settings';

export {
  clearSettings,
  isStorageAvailable,
  readSettings,
  subscribeStorage,
  writeSettings,
} from './storage';

export { getPreloadScript, type PreloadScriptOptions } from './preload';

export { buildBaseCss, buildFontFaceCss, type BaseCssOptions } from './styles';

export { resolveFontUrls } from './features/dyslexicFont';
