import { useId, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { LaunchTarget } from '../../shared/launch';
import { ActionButton, Feedback } from './content';
import { AnimatePresence } from 'motion/react';

export function LaunchButton({
  targets,
  children,
  className,
  title,
}: {
  targets: LaunchTarget[];
  children?: ReactNode;
  className?: string;
  title?: string;
}) {
  const { t } = useTranslation();
  const id = useId();
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState('');
  async function launch() {
    if (inFlight.current || targets.length === 0) return;
    inFlight.current = true;
    setPending(true);
    setFailure('');
    try {
      const result = await window.electronAPI.launchTargets(targets);
      setFailure(result.failures.map((item) => `#${item.index + 1}: ${item.detail}`).join('\n'));
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return (
    <>
      <ActionButton
        className={className}
        title={title}
        disabled={pending || targets.length === 0}
        aria-busy={pending}
        aria-describedby={failure ? id : undefined}
        onClick={() => void launch()}
      >
        {children}
      </ActionButton>
      <AnimatePresence>
        {failure && (
          <Feedback id={id}>
            {t('appLaunchFailed')} {failure}
          </Feedback>
        )}
      </AnimatePresence>
    </>
  );
}
