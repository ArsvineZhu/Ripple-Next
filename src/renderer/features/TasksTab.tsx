import styles from './TasksTab.module.css';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'motion/react';
import { motion } from 'motion/react';
import { InlineNotices } from '../components/InlineNotices';
import { ElasticScrollArea } from '../components/ElasticScrollArea';
import type { IslandController } from '../hooks/useIslandController';
type Props = Pick<
  IslandController,
  'tasks' | 'removeTask' | 'taskText' | 'setTaskText' | 'addTask' | 'textColor' | 'bgColor'
>;
export function TasksTab({
  tasks,
  removeTask,
  taskText,
  setTaskText,
  addTask,
  textColor,
  bgColor,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className={styles.container} id="tasks-container">
      <ElasticScrollArea
        className={styles.list}
        id="task-list"
        data-empty={tasks.length === 0 || undefined}
      >
        <InlineNotices area="tasks" />
        <AnimatePresence propagate>
          {tasks.length === 0 ? (
            <motion.p
              className={styles.emptyState}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
            >
              {t('tasksEmpty')}
            </motion.p>
          ) : (
            tasks.map((task, index) => (
              <motion.div
                className={styles.row}
                data-island-interactive
                key={`task-${task}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0, padding: 0 }}
                transition={{ duration: 0.2 }}
              >
                <input
                  type="checkbox"
                  aria-label={t('completeTask', { name: task })}
                  onChange={() => {
                    removeTask(index);
                  }}
                  className={styles.checkbox}
                />
                <h3 className={styles.taskText}>{task}</h3>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </ElasticScrollArea>
      <div className={styles.inputRow} id="task-input-container">
        <input
          type="text"
          placeholder={t('newTask')}
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addTask();
          }}
          className={styles.input}
          style={{
            backgroundColor: `color-mix(in srgb, ${textColor}, transparent 95%)`,
            color: textColor,
            border: `1px solid color-mix(in srgb, ${textColor}, transparent 90%)`,
          }}
        />
        <button
          onClick={() => {
            addTask();
          }}
          className={styles.addButton}
          style={{ backgroundColor: textColor, color: bgColor }}
        >
          {t('add')}
        </button>
      </div>
    </div>
  );
}
