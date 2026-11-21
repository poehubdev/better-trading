import { deleteLocalValue, getLocalValue, setLocalValue } from '@/utils/storage';

// Blur is the default, so only the opt-out is stored (as `bt-panel-blur-disabled`)
const BLUR_DISABLED_STORAGE_KEY = 'panel-blur-disabled';
const NO_BLUR_BODY_CLASS = 'bt-no-blur';

export const getIsPanelBlurEnabled = (): boolean => !getLocalValue(BLUR_DISABLED_STORAGE_KEY);

export const applyPanelBlur = (isEnabled: boolean): void => {
  document.body.classList.toggle(NO_BLUR_BODY_CLASS, !isEnabled);
};

export const setIsPanelBlurEnabled = (isEnabled: boolean): void => {
  if (isEnabled) deleteLocalValue(BLUR_DISABLED_STORAGE_KEY);
  else setLocalValue(BLUR_DISABLED_STORAGE_KEY, 'true');
  applyPanelBlur(isEnabled);
};
