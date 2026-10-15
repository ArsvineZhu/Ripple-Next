import { useEffect, useRef, useState, type RefObject } from 'react';
import { animate, motion, useMotionValue } from 'motion/react';
import { useReducedMotionPreference } from '../../hooks/useReducedMotionPreference';
import { GlassSurface } from './GlassSurface';
import styles from './MenuHighlight.module.css';
import { useGlassPreferences } from './GlassPreferences';

/** A single moving glass layer follows the menu's native pointer/keyboard selection. */
export function MenuHighlight({ menuRef }: { menuRef: RefObject<HTMLDivElement | null> }) {
  const actor = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0),
    y = useMotionValue(0);
  const [size, setSize] = useState({ width: 1, height: 1, visible: false });
  const reduced = useReducedMotionPreference();
  const glass = useGlassPreferences();
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    let frame = 0,
      initialized = false;
    let stop = () => {};
    const position = (item: HTMLElement) => {
      let left = 0,
        top = 0;
      for (
        let node: HTMLElement | null = item;
        node && node !== menu;
        node = node.offsetParent as HTMLElement | null
      ) {
        left += node.offsetLeft;
        top += node.offsetTop;
        const parent = node.offsetParent;
        for (
          let ancestor: HTMLElement | null = node.parentElement;
          ancestor && ancestor !== menu;
          ancestor = ancestor.parentElement
        ) {
          left -= ancestor.scrollLeft;
          top -= ancestor.scrollTop;
          if (ancestor === parent) break;
        }
      }
      return { left, top };
    };
    const update = () => {
      frame = 0;
      const item = menu.querySelector<HTMLElement>(
        '[data-highlighted], [cmdk-item][data-selected="true"]',
      );
      if (!item) {
        setSize((previous) => (previous.visible ? { ...previous, visible: false } : previous));
        return;
      }
      const next = position(item);
      setSize((previous) =>
        previous.width === item.offsetWidth &&
        previous.height === item.offsetHeight &&
        previous.visible
          ? previous
          : { width: item.offsetWidth, height: item.offsetHeight, visible: true },
      );
      stop();
      if (!initialized || reduced) {
        x.set(next.left);
        y.set(next.top);
      } else {
        const a = animate(x, next.left, { duration: 0.2, ease: 'easeOut' });
        const b = animate(y, next.top, { duration: 0.2, ease: 'easeOut' });
        stop = () => {
          a.stop();
          b.stop();
        };
      }
      initialized = true;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const changes = new MutationObserver(schedule);
    changes.observe(menu, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-highlighted', 'data-selected'],
    });
    const resize = new ResizeObserver(schedule);
    resize.observe(menu);
    menu.addEventListener('scroll', schedule, true);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      stop();
      changes.disconnect();
      resize.disconnect();
      menu.removeEventListener('scroll', schedule, true);
    };
  }, [menuRef, reduced, x, y]);
  return (
    <motion.div
      className={styles.position}
      aria-hidden="true"
      data-menu-highlight
      data-glass-enabled={glass.settingsGlassEnabled}
      data-visible={size.visible}
      style={{ x, y, width: size.width, height: size.height }}
    >
      <div ref={actor} className={styles.actor}>
        <GlassSurface
          controlRef={menuRef}
          actorRef={actor}
          button
          radius={16}
          cornerK={1.62}
          className={styles.material}
        />
      </div>
    </motion.div>
  );
}
