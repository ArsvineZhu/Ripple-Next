import type { ReactNode } from 'react';
import { motion, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { type PageRailOptions } from '../lib/pageRail';
import { useWheelPageRail } from '../hooks/useWheelPageRail';
import { useMacPageRail } from '../hooks/useMacPageRail';
import styles from './TabPanels.module.css';

function Page({
  id,
  index,
  count,
  position,
  width,
  elastic,
  active,
  blur,
  children,
}: {
  id: string | number;
  index: number;
  count: number;
  position: MotionValue<number>;
  width: MotionValue<number>;
  elastic: MotionValue<number>;
  active: boolean;
  blur: boolean;
  children: ReactNode;
}) {
  const distance = useTransform(() => {
    const cursor = position.get();
    return index + Math.round((cursor - index) / Math.max(1, count)) * count - cursor;
  });
  const x = useTransform(() => distance.get() * width.get() - elastic.get());
  const filter = useTransform(() =>
    blur ? `blur(${Math.min(1, Math.abs(distance.get())) * 6}px)` : 'none',
  );
  // Only the two pages straddling the live position can paint. Extra elastic
  // displacement exposes empty edge space, never an unsolicited third page.
  const display = useTransform(() => (Math.abs(distance.get()) < 1 ? 'flex' : 'none'));
  return (
    <motion.div
      className={styles.page}
      data-tab-page={id}
      role="tabpanel"
      aria-hidden={!active}
      inert={!active}
      style={{ x, filter, display }}
    >
      {children}
    </motion.div>
  );
}

export function TabPanels<Id extends string | number = number>(
  props: PageRailOptions<Id> & { renderTab(id: Id): ReactNode },
) {
  const usePlatformPageRail =
    window.electronAPI?.platform === 'darwin' ? useMacPageRail : useWheelPageRail;
  const { viewportRef, position, elastic, visualId } = usePlatformPageRail(props);
  return (
    <div
      className={styles.viewport}
      ref={viewportRef}
      data-tab-viewport
      data-island-interactive
      onWheel={(event) => event.stopPropagation()}
    >
      {props.tabs.map((id, index) => (
        <Page
          key={id}
          id={id}
          index={index}
          count={props.tabs.length}
          position={position}
          width={props.width}
          elastic={elastic}
          blur={window.electronAPI?.platform !== 'darwin'}
          active={id === visualId}
        >
          {props.renderTab(id)}
        </Page>
      ))}
    </div>
  );
}
