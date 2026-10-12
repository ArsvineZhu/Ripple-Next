import { useEffect, useState } from 'react';

export function useIslandPreview() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    let revision = 0;
    let disposed = false;
    const unsubscribe = window.electronAPI?.onIslandPreviewChanged?.((next) => {
      revision++;
      setActive(next);
    });
    void window.electronAPI
      ?.getIslandPreview?.()
      .then((next) => {
        if (!disposed && revision === 0) setActive(next);
      })
      .catch(() => {});
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, []);
  return active;
}
