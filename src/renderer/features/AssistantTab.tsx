import { ActionButton, TextEntry, Feedback } from '../components/content';
import { MarkdownContent } from '../components/MarkdownContent';
import { ElasticScrollArea } from '../components/ElasticScrollArea';
import styles from './AssistantTab.module.css';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'motion/react';
import { motion } from 'motion/react';
import type { useAssistant } from '../hooks/useAssistant';
type Props = ReturnType<typeof useAssistant> & {
  onAnswerContentSizeChange: (height: number) => void;
  resetAnswerContentSize: () => void;
};
export function AssistantTab({
  asked,
  userText,
  setUserText,
  askAI,
  aiAnswer,
  assistantError,
  resetAssistant,
  onAnswerContentSizeChange,
  resetAnswerContentSize,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className={styles.container}>
      <AnimatePresence propagate mode="wait">
        {!asked ? (
          <motion.div
            className={styles.questionPanel}
            key="ask"
            initial={{ opacity: 0, filter: 'blur(10px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(10px)' }}
            transition={{ duration: 0.2 }}
          >
            <TextEntry
              multiline
              large
              id="userinput"
              label={t('askAnything')}
              placeholder={t('askAnything')}
              value={userText}
              onValueChange={setUserText}
              onSubmit={() => {
                resetAnswerContentSize();
                askAI();
              }}
              className={styles.questionInput}
            />
            <ActionButton
              id="chatsubmit"
              onClick={() => {
                resetAnswerContentSize();
                askAI();
              }}
              className={styles.submitButton}
            >
              {t('ask')}
            </ActionButton>
          </motion.div>
        ) : (
          <motion.div
            className={styles.answerPanel}
            key="result"
            initial={{ opacity: 0, filter: 'blur(10px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(10px)' }}
            transition={{ duration: 0.2 }}
          >
            <ElasticScrollArea
              className={styles.answerContent}
              id="result"
              data-empty={(!aiAnswer && !assistantError) || undefined}
              onContentSizeChange={onAnswerContentSizeChange}
            >
              {assistantError && (
                <Feedback>
                  {t(assistantError.kind)} {assistantError.detail}
                </Feedback>
              )}
              {aiAnswer ? (
                <MarkdownContent>{aiAnswer}</MarkdownContent>
              ) : !assistantError ? (
                <span className={styles.thinking}>{t('thinking')}</span>
              ) : null}
            </ElasticScrollArea>
            <ActionButton
              className={styles.anotherButton}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                resetAnswerContentSize();
                resetAssistant();
              }}
              id="Askanotherbtn"
            >
              {t('askAnother')}
            </ActionButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
