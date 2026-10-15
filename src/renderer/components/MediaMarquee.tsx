import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference';
import styles from './MediaMarquee.module.css';

/** DOM measurements and CSS animation restart when Activity restores a hidden page. */
export function MediaMarquee({
  children,
  enabled,
  active = true,
  className,
}: {
  children: ReactNode;
  enabled: boolean;
  active?: boolean;
  className?: string;
}) {
  const clip = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);
  const reduced = useReducedMotionPreference();
  useLayoutEffect(() => {
    const viewport = clip.current;
    const content = text.current;
    if (!viewport || !content) return;
    let live = true;
    const measure = () => {
      if (!live || viewport.clientWidth <= 0) return;
      const width = content.getBoundingClientRect().width;
      setDistance(width > viewport.clientWidth ? width + 30 : 0);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(content);
    document.fonts?.addEventListener('loadingdone', measure);
    void document.fonts?.ready.then(measure);
    measure();
    return () => {
      live = false;
      observer.disconnect();
      document.fonts?.removeEventListener('loadingdone', measure);
    };
  }, [children]);
  const scroll = enabled && active && !reduced && distance > 0;
  return (
    <div ref={clip} className={styles.clip} data-marquee={scroll}>
      <div
        className={`${styles.text} ${className ?? ''}`}
        style={{ '--marquee-distance': `${-distance}px` } as CSSProperties}
      >
        <span ref={text}>{children}</span>
        {scroll && <span aria-hidden="true">{children}</span>}
      </div>
    </div>
  );
}
