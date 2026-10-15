import type { ButtonHTMLAttributes, ChangeEvent, KeyboardEvent, ReactNode } from 'react';
import { motion } from 'motion/react';
import { useReducedMotionPreference } from '../../hooks/useReducedMotionPreference';
import styles from './Content.module.css';

export function ActionButton({
  children,
  className = '',
  tone = 'primary',
  size = 'regular',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'secondary';
  size?: 'regular' | 'small';
}) {
  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      className={`${styles.button} ${styles[tone]} ${styles[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function TextEntry({
  value,
  onValueChange,
  onSubmit,
  label,
  multiline = false,
  appearance = 'bare',
  large = false,
  centered = false,
  className = '',
  id,
  placeholder,
  autoFocus,
  required,
  disabled,
  maxLength,
  type = 'text',
  rows,
  invalid,
  describedBy,
  title,
}: {
  value: string;
  onValueChange(value: string): void;
  onSubmit?(): void;
  label: string;
  multiline?: boolean;
  appearance?: 'bare' | 'surface';
  large?: boolean;
  centered?: boolean;
  className?: string;
  id?: string;
  placeholder?: string;
  autoFocus?: boolean;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  type?: 'text' | 'password' | 'url';
  rows?: number;
  invalid?: boolean;
  describedBy?: string;
  title?: string;
}) {
  const props = {
    id,
    value,
    placeholder,
    autoFocus,
    required,
    disabled,
    maxLength,
    title,
    'aria-label': label,
    'aria-invalid': invalid || undefined,
    'aria-describedby': describedBy,
    className: `${styles.entry} ${styles[appearance]} ${large ? styles.large : ''} ${centered ? styles.centered : ''} ${className}`,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onValueChange(event.target.value),
    onKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (onSubmit && event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
        event.preventDefault();
        onSubmit();
      }
    },
  };
  return multiline ? (
    <textarea {...props} rows={rows} />
  ) : (
    <input {...props} type={type} autoComplete={type === 'password' ? 'new-password' : undefined} />
  );
}

export function EmptyState({
  children,
  className = '',
  prominent = false,
}: {
  children: ReactNode;
  className?: string;
  prominent?: boolean;
}) {
  const reduced = useReducedMotionPreference();
  return (
    <motion.p
      className={`${styles.empty} ${prominent ? styles.large : ''} ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.6 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.2 }}
    >
      {children}
    </motion.p>
  );
}

export function Feedback({
  children,
  className = '',
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const reduced = useReducedMotionPreference();
  return (
    <motion.p
      id={id}
      role="alert"
      className={`${styles.feedback} ${className}`}
      initial={{ opacity: 0, filter: 'blur(10px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: reduced ? 0 : 0.2 }}
    >
      {children}
    </motion.p>
  );
}

export function Surface({
  children,
  className = '',
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`${styles.surface} ${className}`}
      data-island-interactive={interactive || undefined}
    >
      {children}
    </div>
  );
}
