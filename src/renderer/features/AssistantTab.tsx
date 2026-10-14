import { CopyButton } from '../components/CopyButton';
import { ElasticScrollArea } from '../components/ElasticScrollArea';
import styles from './AssistantTab.module.css';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'motion/react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import type { IslandController } from '../hooks/useIslandController';
type Props = Pick<
  IslandController,
  | 'asked'
  | 'userText'
  | 'setUserText'
  | 'askAI'
  | 'textColor'
  | 'bgColor'
  | 'assistantError'
  | 'aiAnswer'
  | 'resetAssistant'
> & {
  onAnswerContentSizeChange: (height: number) => void;
  resetAnswerContentSize: () => void;
};
export function AssistantTab({
  asked,
  userText,
  setUserText,
  askAI,
  textColor,
  bgColor,
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
            <textarea
              className={styles.questionInput}
              id="userinput"
              placeholder={t('askAnything')}
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  resetAnswerContentSize();
                  askAI();
                }
              }}
              style={{ color: `${textColor}` }}
            />
            <button
              className={styles.submitButton}
              id="chatsubmit"
              onClick={() => {
                resetAnswerContentSize();
                askAI();
              }}
              style={{ backgroundColor: textColor, color: bgColor }}
            >
              {t('ask')}
            </button>
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
                <span role="alert">
                  {t(assistantError.kind)} {assistantError.detail}
                </span>
              )}
              {aiAnswer ? (
                <ReactMarkdown
                  components={{
                    pre: ({ node, children, ...props }) => {
                      const code = node?.children[0];
                      const child = code?.type === 'element' ? code.children[0] : undefined;
                      const codeContent = child?.type === 'text' ? child.value : '';

                      return (
                        <div
                          className={styles.codeBlock}
                          style={{
                            backgroundColor: `color-mix(in srgb, ${textColor}, transparent 92%)`,
                            border: `1px solid color-mix(in srgb, ${textColor}, transparent 90%)`,
                          }}
                        >
                          <CopyButton
                            className={styles.codeCopyButton}
                            onCopy={() => window.electronAPI.writeClipboardText(codeContent)}
                          />
                          <pre className={styles.codePre} {...props}>
                            {children}
                          </pre>
                        </div>
                      );
                    },
                    code: ({ node: _node, ...props }) => (
                      <code className={styles.inlineCode} {...props} />
                    ),
                  }}
                >
                  {aiAnswer}
                </ReactMarkdown>
              ) : !assistantError ? (
                <span className={styles.thinking}>{t('thinking')}</span>
              ) : null}
            </ElasticScrollArea>
            <button
              className={styles.anotherButton}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                resetAnswerContentSize();
                resetAssistant();
              }}
              id="Askanotherbtn"
              style={{ backgroundColor: textColor, color: bgColor }}
            >
              {t('askAnother')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
