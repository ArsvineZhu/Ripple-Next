import { EmptyState } from '../components/content';
import { LaunchButton } from '../components/LaunchButton';
import styles from './WorkflowsTab.module.css';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'motion/react';
import { motion } from 'motion/react';
import { InlineNotices } from '../components/InlineNotices';
import { ElasticScrollArea } from '../components/ElasticScrollArea';
import { useAppState } from '../components/AppStateProvider';
export function WorkflowsTab() {
  const { state } = useAppState();
  const { workflows, quickApps } = state;
  const { t } = useTranslation();
  return (
    <div className={styles.container}>
      {(workflows.length > 0 || quickApps.length === 0) && (
        <ElasticScrollArea
          className={styles.workflowList}
          id="workflows"
          data-empty={workflows.length === 0 || undefined}
        >
          <AnimatePresence propagate>
            {workflows.length === 0 ? (
              <EmptyState prominent className={styles.emptyState}>
                {t('workflowsEmpty')}
              </EmptyState>
            ) : (
              workflows.map((workflow, i) => (
                <motion.div
                  key={`main-wf-${workflow.name}-${i}`}
                  className={styles.workflowItem}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, height: 0 }}
                >
                  <LaunchButton
                    targets={workflow.targets}
                    className={styles.workflowButton}
                    title={workflow.name}
                  >
                    <span className={styles.workflowName}>{workflow.name}</span>
                    <span className={styles.itemCount}>
                      ({t('items', { count: workflow.targets.length })})
                    </span>
                  </LaunchButton>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </ElasticScrollArea>
      )}

      <InlineNotices area="workflows" />

      {quickApps.length > 0 && (
        <motion.div
          className={styles.quickAppStrip}
          layout="position"
          data-standalone={workflows.length === 0 || undefined}
          onWheel={(event) => event.stopPropagation()}
          onPointerDownCapture={(event) => event.stopPropagation()}
          data-island-interactive
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
                  <LaunchButton targets={[app.target]} className={styles.appButton}>
                    {app.name}
                  </LaunchButton>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  );
}
