import { useTranslation } from 'react-i18next';
import { localeForFormatting } from '../../shared/i18n';
import styles from './OverviewTab.module.css';
import typography from '../styles/typography.module.css';
import { WeatherIcon } from '../components/WeatherIcon';
import type { IslandController } from '../hooks/useIslandController';
import type { CSSProperties } from 'react';
type Props = Pick<
  IslandController,
  'charging' | 'percent' | 'weather' | 'textColor' | 'overviewTime' | 'overviewDate'
>;
export function OverviewTab({
  charging,
  percent,
  weather,
  textColor,
  overviewTime,
  overviewDate,
}: Props) {
  const { i18n } = useTranslation();
  const batteryPercent =
    typeof percent === 'number' && Number.isFinite(percent)
      ? Math.min(100, Math.max(0, percent))
      : null;
  const number = (value: number | string | null) =>
    value === null || value === ''
      ? '??'
      : new Intl.NumberFormat(localeForFormatting(i18n.language)).format(Number(value));
  return (
    <>
      <div className={styles.statusRow}>
        {weather && (
          <h1 className={[typography['text'], styles.weatherPosition].join(' ')}>
            <div className={styles.weather}>
              <WeatherIcon status={weather.status} size={16} color={textColor} />
              <span>{number(weather.temp)}º</span>
            </div>
          </h1>
        )}
        <div className={styles.batteryContainer} id="battery">
          <div
            className={styles.batteryBar}
            id="battery-bar"
            data-charging={charging}
            data-three-digits={batteryPercent === 100}
            style={{ '--battery-level': `${batteryPercent ?? 0}%` } as CSSProperties}
          >
            <h1 className={[typography['text'], styles.batteryText].join(' ')}>
              <span>{number(batteryPercent)}</span>
              {charging && (
                <svg width="11" height="16" viewBox="0 0 12 20" aria-hidden="true">
                  <path d="M8 0 0 12h5L3 20l9-12H7Z" fill="currentColor" />
                </svg>
              )}
            </h1>
          </div>
        </div>
      </div>
      <div className={styles.date} id="date">
        <h1 className={[typography['text'], styles.time].join(' ')}>{overviewTime}</h1>
        <h2 className={[typography['text'], styles.dateText].join(' ')}>{overviewDate}</h2>
      </div>
    </>
  );
}
