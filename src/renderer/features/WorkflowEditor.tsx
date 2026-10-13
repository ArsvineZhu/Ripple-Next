import { useId, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useAppState } from '../components/AppStateProvider';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference';
import { PrefCard } from './SettingsPreferences';
import styles from './SettingsTab.module.css';
import { DangerAction } from '../components/DangerAction';

export function WorkflowEditor({ index }: { index?: number }) {
  const { t } = useTranslation();
  const { state, updateState } = useAppState();
  const reduced = useReducedMotionPreference();
  const id = useId();
  const savedIndex = useRef(index ?? null);
  const original = index === undefined ? undefined : state.workflows[index];
  const [name, setName] = useState(original?.name ?? '');
  const nextRow = useRef(original?.urls.length ?? 1);
  const [targets, setTargets] = useState(() =>
    (original?.urls.length ? original.urls : ['']).map((value, rowId) => ({ rowId, value })),
  );
  const persist = (nextName: string, rows: typeof targets) => {
    const urls = rows.map((row) => row.value.trim()).filter(Boolean);
    if (!nextName.trim() || (savedIndex.current === null && !urls.length)) return;
    const workflows = [...state.workflows];
    const value = { name: nextName.trim(), urls };
    if (savedIndex.current === null) {
      savedIndex.current = workflows.length;
      workflows.push(value);
    } else workflows[savedIndex.current] = value;
    updateState({ workflows });
  };
  return (
    <PrefCard>
      <div className={styles.prefStack}>
        <label className={styles.fieldLabel} htmlFor={`${id}-name`}>
          {t('workflowName')}
          <input
            id={`${id}-name`}
            className={styles.input}
            value={name}
            autoFocus
            onChange={(e) => {
              setName(e.target.value);
              persist(e.target.value, targets);
            }}
          />
        </label>
        <span className={styles.label}>{t('workflowApps')}</span>
        <p className={styles.hint}>{t('workflowRowsHint')}</p>
        <AnimatePresence initial={false}>
          {targets.map((row, position) => (
            <motion.div
              key={row.rowId}
              className={styles.editRow}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
            >
              <input
                className={styles.input}
                aria-label={t('workflowTargetNumber', { count: position + 1 })}
                value={row.value}
                placeholder={t('workflowTargetPlaceholder')}
                onChange={(e) => {
                  const next = targets.map((item) =>
                    item.rowId === row.rowId ? { ...item, value: e.target.value } : item,
                  );
                  setTargets(next);
                  persist(name, next);
                }}
              />
              <DangerAction
                label={t('removeWorkflowTarget', { count: position + 1 })}
                disabled={targets.length === 1 && !row.value}
                onConfirm={() => {
                  const next =
                    targets.length === 1
                      ? [{ ...row, value: '' }]
                      : targets.filter((item) => item.rowId !== row.rowId);
                  setTargets(next);
                  persist(name, next);
                }}
              >
                <X size={16} />
              </DangerAction>
            </motion.div>
          ))}
        </AnimatePresence>
        <button
          type="button"
          className={styles.addRowButton}
          onClick={() => {
            const rowId = nextRow.current++;
            setTargets((rows) => [...rows, { rowId, value: '' }]);
          }}
        >
          <Plus size={16} />
          {t('addWorkflowTarget')}
        </button>
      </div>
    </PrefCard>
  );
}
