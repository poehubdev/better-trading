import { deleteLocalValue, getLocalValue, setLocalValue } from '@/utils/storage';

// Hidden by default (the panel still scrolls with the wheel/touchpad), so only the opt-in is stored
// (as `bt-panel-scrollbar-visible`). For setups where wheel scrolling over the panel doesn't work.
const SCROLLBAR_VISIBLE_STORAGE_KEY = 'panel-scrollbar-visible';
const SHOW_SCROLLBAR_BODY_CLASS = 'bt-show-scrollbar';

export const getIsPanelScrollbarVisible = (): boolean => Boolean(getLocalValue(SCROLLBAR_VISIBLE_STORAGE_KEY));

export const applyPanelScrollbar = (isVisible: boolean): void => {
  document.body.classList.toggle(SHOW_SCROLLBAR_BODY_CLASS, isVisible);
};

export const setIsPanelScrollbarVisible = (isVisible: boolean): void => {
  if (isVisible) setLocalValue(SCROLLBAR_VISIBLE_STORAGE_KEY, 'true');
  else deleteLocalValue(SCROLLBAR_VISIBLE_STORAGE_KEY);
  applyPanelScrollbar(isVisible);
};
