import { useState } from 'react';
import { PreferenceTextField } from '../components/preferences';

export function AIField({
  label,
  value,
  onChange,
  valid = () => true,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  valid?(value: string): boolean;
  multiline?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const change = (text: string) => {
    setDraft(text);
    if (valid(text)) onChange(text);
  };
  return (
    <PreferenceTextField
      label={label}
      value={draft}
      onValueChange={change}
      multiline={multiline}
      invalid={!valid(draft)}
    />
  );
}
