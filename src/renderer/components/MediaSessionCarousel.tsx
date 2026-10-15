import { useLayoutEffect, type ReactNode } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { MediaSession } from '../../shared/media';
import { useMediaPaging } from '../hooks/useMediaPaging';
import styles from './MediaSessionCarousel.module.css';

function SessionPage({
  index,
  position,
  active,
  children,
}: {
  index: number;
  position: MotionValue<number>;
  active: boolean;
  children: ReactNode;
}) {
  const y = useTransform(() => `${(index - position.get()) * 100}%`);
  const visibility = useTransform(() =>
    Math.abs(index - position.get()) < 1 ? 'visible' : 'hidden',
  );
  return (
    <motion.div
      className={styles.page}
      aria-hidden={!active}
      inert={!active}
      style={{ y, visibility }}
    >
      {children}
    </motion.div>
  );
}
export function MediaSessionCarousel({
  sessions,
  selectedId,
  onSelect,
  textColor,
  renderPage,
}: {
  sessions: MediaSession[];
  selectedId: string | null;
  onSelect(id: string | null): void;
  textColor: string;
  renderPage(session: MediaSession | null, active: boolean, hasIndicators: boolean): ReactNode;
}) {
  const { t } = useTranslation();
  const { viewportRef, orderedSessions, pagingEnabled } = useMediaPaging(
    sessions,
    selectedId,
    onSelect,
  );
  const pages = [
    { id: null, session: null, label: t('mediaAutomatic') },
    ...orderedSessions.map((session) => ({ id: session.id, session, label: session.playerName })),
  ];
  const index = Math.max(
    0,
    pages.findIndex((page) => page.id === selectedId),
  );
  const position = useMotionValue(index);
  const reduced = useReducedMotion();
  const order = orderedSessions.map((session) => session.id).join('\n');
  useLayoutEffect(() => {
    if (reduced) {
      position.jump(index);
      return;
    }
    const animation = animate(position, index, { duration: 0.28, ease: [0.22, 1, 0.36, 1] });
    return () => animation.stop();
  }, [index, order, position, reduced]);
  const select = (id: string | null) => {
    if (id !== selectedId) onSelect(id);
  };
  return (
    <div
      ref={viewportRef}
      className={styles.carousel}
      data-media-carousel
      data-indicators={pagingEnabled}
      role="region"
      aria-label={t('mediaPlayer')}
      tabIndex={0}
      onKeyDown={(event) => {
        if (!pagingEnabled || !['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? pages.length - 1
              : Math.max(
                  0,
                  Math.min(pages.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)),
                );
        select(pages[next].id);
        const button = event.currentTarget.querySelector<HTMLButtonElement>(
          `[data-media-indicator="${next}"]`,
        );
        if ((event.target as HTMLElement).closest('[role="radiogroup"]')) button?.focus();
      }}
    >
      <div className={styles.viewport}>
        {pages.map((page, pageIndex) => (
          <SessionPage
            key={page.id === null ? 'automatic' : `session:${page.id}`}
            index={pageIndex}
            position={position}
            active={pageIndex === index}
          >
            {renderPage(page.session, pageIndex === index, pagingEnabled)}
          </SessionPage>
        ))}
      </div>
      {pagingEnabled && (
        <div
          className={styles.indicators}
          role="radiogroup"
          aria-label={t('mediaPlayer')}
          style={{ color: textColor }}
        >
          {pages.map((page, pageIndex) => (
            <button
              key={page.id === null ? 'automatic' : `session:${page.id}`}
              type="button"
              role="radio"
              aria-checked={pageIndex === index}
              aria-label={page.label}
              title={page.label}
              tabIndex={pageIndex === index ? 0 : -1}
              data-media-indicator={pageIndex}
              className={styles.indicator}
              onClick={() => select(page.id)}
            >
              {page.id === null ? (
                <span className={styles.auto}>A</span>
              ) : (
                <span className={styles.dot} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
