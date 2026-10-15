import styles from './TasksTab.module.css';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'motion/react';
import { motion } from 'motion/react';
import { InlineNotices } from '../components/InlineNotices';
import { ElasticScrollArea } from '../components/ElasticScrollArea';
import { useTasks } from '../hooks/useTasks';
import { ActionButton, TextEntry, EmptyState } from '../components/content';
export function TasksTab() {
  const { tasks, removeTask, taskText, setTaskText, addTask } = useTasks();
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
            <EmptyState className={styles.emptyState}>{t('tasksEmpty')}</EmptyState>
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
      <form
        className={styles.inputRow}
        id="task-input-container"
        onSubmit={(event) => {
          event.preventDefault();
          addTask();
        }}
      >
        <TextEntry
          label={t('newTask')}
          placeholder={t('newTask')}
          value={taskText}
          onValueChange={setTaskText}
          onSubmit={addTask}
          appearance="surface"
          className={styles.input}
        />
        <ActionButton type="submit">{t('add')}</ActionButton>
      </form>
    </div>
  );
}
