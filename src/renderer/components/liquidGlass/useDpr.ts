import { useSyncExternalStore } from 'react';
function subscribe(changed: () => void) {
  let media = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  const update = () => {
    media.removeEventListener('change', update);
    media = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    media.addEventListener('change', update);
    changed();
  };
  media.addEventListener('change', update);
  window.addEventListener('resize', update);
  return () => {
    media.removeEventListener('change', update);
    window.removeEventListener('resize', update);
  };
}
export function useDpr() {
  return useSyncExternalStore(
    subscribe,
    () => Math.min(2, window.devicePixelRatio || 1),
    () => 1,
  );
}
