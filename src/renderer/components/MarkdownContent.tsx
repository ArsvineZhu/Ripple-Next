import ReactMarkdown, { type Components } from 'react-markdown';
import { CopyButton } from './CopyButton';
import styles from './MarkdownContent.module.css';

const components: Components = {
  pre: ({ node, children, ...props }) => {
    const code = node?.children[0];
    const child = code?.type === 'element' ? code.children[0] : undefined;
    const codeContent = child?.type === 'text' ? child.value : '';
    return (
      <div className={styles.codeBlock}>
        <CopyButton
          className={styles.codeCopyButton}
          onCopy={() => window.electronAPI.writeClipboardText(codeContent)}
        />
        <pre {...props}>{children}</pre>
      </div>
    );
  },
};

export function MarkdownContent({ children }: { children: string }) {
  return (
    <div className={styles.content}>
      <ReactMarkdown components={components}>{children}</ReactMarkdown>
    </div>
  );
}
