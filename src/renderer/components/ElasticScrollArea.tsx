import type { HTMLAttributes, ReactNode, WheelEvent } from 'react';
import { useEffect, useLayoutEffect, useRef } from 'react';
import styles from './ElasticScrollArea.module.css';

type Props = Omit<HTMLAttributes<HTMLDivElement>, 'onWheel'> & {
  children: ReactNode;
  onContentSizeChange?: (height: number) => void;
};

export function ElasticScrollArea({ children, className, onContentSizeChange, ...props }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const onContentSizeChangeRef = useRef(onContentSizeChange);

  useEffect(() => {
    onContentSizeChangeRef.current = onContentSizeChange;
  }, [onContentSizeChange]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !contentRef.current) return;

    const content = contentRef.current;

    let frame: number | null = null;
    const updateContentSize = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        viewport.dataset.overflow = String(
          viewport.clientHeight > 0 && viewport.scrollHeight > viewport.clientHeight + 1,
        );
        onContentSizeChangeRef.current?.(content.scrollHeight);
      });
    };
    const resizeObserver = new ResizeObserver(updateContentSize);
    resizeObserver.observe(content);
    resizeObserver.observe(viewport);
    const mutationObserver = new MutationObserver(updateContentSize);
    mutationObserver.observe(content, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    updateContentSize();

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  // Keep vertical scrolling here; let horizontal gestures reach Island unless a child can scroll them.
  const stopIslandWheel = (event: WheelEvent<HTMLDivElement>) => {
    const horizontalGesture = event.deltaX !== 0 && event.deltaY === 0;
    if (!horizontalGesture) {
      event.stopPropagation();
      return;
    }

    let element = event.target instanceof Element ? event.target : null;

    while (element && element !== viewportRef.current) {
      if (element instanceof HTMLElement) {
        const overflowX = window.getComputedStyle(element).overflowX;
        const scrollLimit = element.scrollWidth - element.clientWidth;
        const canScrollInDirection =
          event.deltaX < 0 ? element.scrollLeft > 0 : element.scrollLeft < scrollLimit;

        if (
          (overflowX === 'auto' || overflowX === 'scroll') &&
          scrollLimit > 1 &&
          canScrollInDirection
        ) {
          event.stopPropagation();
          return;
        }
      }
      element = element.parentElement;
    }
  };

  return (
    <div
      {...props}
      className={`${styles.viewport} ${className ?? ''}`}
      data-island-interactive
      onWheel={stopIslandWheel}
      ref={viewportRef}
    >
      <div className={`${styles.content} scroll-content`} ref={contentRef}>
        {children}
      </div>
    </div>
  );
}
