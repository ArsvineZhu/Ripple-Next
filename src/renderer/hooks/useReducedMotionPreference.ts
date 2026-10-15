import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';
function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
function snapshot() {
  return window.matchMedia(QUERY).matches;
}

/** Observe live OS preference changes, including while a geometry animation is running. */
export function useReducedMotionPreference() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
