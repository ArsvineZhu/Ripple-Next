import styles from './WorkflowsTab.module.css';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { motion } from 'motion/react';
import { InlineNotices } from '../components/InlineNotices';
import { ElasticScrollArea } from '../components/ElasticScrollArea';
import type { IslandController } from '../hooks/useIslandController';
type Props = Pick<
  IslandController,
  'workflows' | 'openWorkflow' | 'bgColor' | 'textColor' | 'quickApps'
>;
export function WorkflowsTab({ workflows, openWorkflow, bgColor, textColor, quickApps }: Props) {
  const { t } = useTranslation();
  const [failures, setFailures] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  async function launch(key: string, operation: () => Promise<void> | undefined) {
    setFailures((current) => ({ ...current, [key]: false }));
    setPending((current) => ({ ...current, [key]: true }));
    try {
      await operation();
    } catch {
      setFailures((current) => ({ ...current, [key]: true }));
    } finally {
      setPending((current) => ({ ...current, [key]: false }));
    }
  }
  return (
    <div className={styles.container}>
      <ElasticScrollArea
        className={styles.workflowList}
        id="workflows"
        data-empty={workflows.length === 0 || undefined}
      >
        <AnimatePresence propagate>
          {workflows.length === 0 ? (
            <motion.p
              className={styles.emptyState}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
            >
              {t('workflowsEmpty')}
            </motion.p>
          ) : (
            workflows.map((workflow, i) => (
              <motion.div
                key={`main-wf-${workflow.name}-${i}`}
                className={styles.workflowItem}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, height: 0 }}
              >
                <button
                  className={styles.workflowButton}
                  onClick={() => {
                    void launch('workflow-' + i, () => openWorkflow(workflow));
                  }}
                  disabled={pending['workflow-' + i]}
                  title={workflow.name}
                  aria-describedby={failures['workflow-' + i] ? 'workflow-error-' + i : undefined}
                  style={{ color: bgColor, backgroundColor: textColor }}
                >
                  <span className={styles.workflowName}>{workflow.name}</span>
                  <span className={styles.itemCount}>
                    ({t('items', { count: workflow.urls.length })})
                  </span>
                </button>
                {failures['workflow-' + i] && (
                  <p className={styles.launchError} id={'workflow-error-' + i} role="alert">
                    {t('appLaunchFailed')}
                  </p>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </ElasticScrollArea>

      <InlineNotices area="workflows" />

      {workflows.length > 0 && quickApps.length > 0 && (
        <div
          className={styles.quickAppStrip}
          onWheel={(event) => event.stopPropagation()}
          onPointerDownCapture={(event) => event.stopPropagation()}
          data-island-interactive
          style={{
            borderTop: `1px solid color-mix(in srgb, ${textColor}, transparent 90%)`,
            background: `color-mix(in srgb, ${textColor}, transparent 98%)`,
          }}
        >
          <div className={styles.quickAppList} id="quick-apps">
            <AnimatePresence propagate>
              {quickApps.map((app) => (
                <motion.div
                  key={`main-qa-${app.id}`}
                  className={styles.appItem}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, width: 0 }}
                >
                  <button
                    className={styles.appButton}
                    onClick={() => {
                      void launch(app.id, () => window.electronAPI?.launchQuickApp(app.id));
                    }}
                    disabled={pending[app.id]}
                    aria-describedby={failures[app.id] ? 'app-error-' + app.id : undefined}
                    style={{ color: bgColor, backgroundColor: textColor }}
                  >
                    {app.name}
                  </button>
                  {failures[app.id] && (
                    <p className={styles.launchError} id={'app-error-' + app.id} role="alert">
                      {t('appLaunchFailed')}
                    </p>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
