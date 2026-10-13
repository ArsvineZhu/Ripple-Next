import * as Primitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { MenuHighlight } from './liquidGlass/MenuHighlight';
import { useGlassPreferences } from './liquidGlass/GlassPreferences';
import { GlassPanel } from './liquidGlass/GlassPanel';
import panel from './liquidGlass/GlassPanel.module.css';
import { useOverlay } from './OverlayProvider';
import styles from './Select.module.css';
interface Option {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
}
interface Props {
  value: string;
  options: readonly Option[];
  onValueChange: (value: string) => void;
  label: string;
  disabled?: boolean;
}
export function Select({ value, options, onValueChange, label, disabled }: Props) {
  const id = useId();
  const glass = useGlassPreferences();
  const menuRef = useRef<HTMLDivElement>(null);
  const { container, openId, setOpenId, suppressShellClick } = useOverlay();
  const open = openId === id;
  useEffect(
    () => () => {
      if (open) setOpenId((current) => (current === id ? null : current));
    },
    [open, setOpenId, id],
  );
  return (
    <Primitive.Root modal={false} open={open} onOpenChange={(next) => setOpenId(next ? id : null)}>
      <Primitive.Trigger
        className={styles.trigger}
        aria-label={label}
        disabled={disabled}
        data-island-interactive
        data-glass-enabled={glass.settingsGlassEnabled}
      >
        <span data-select-value>
          {options.find((option) => option.value === value)?.label ?? label}
        </span>
        <span>
          <ChevronsUpDown size={14} />
        </span>
      </Primitive.Trigger>
      {container && (
        <Primitive.Portal container={container}>
          <Primitive.Content
            data-glass-enabled={glass.settingsGlassEnabled}
            ref={menuRef}
            className={`${styles.content} ${panel.menu}`}
            sideOffset={6}
            align="end"
            collisionBoundary={container}
            collisionPadding={12}
            hideWhenDetached
            onPointerDownOutside={(event) => {
              const target = event.detail.originalEvent.target;
              if (target instanceof Element && target.closest('#Island')) suppressShellClick();
            }}
            data-island-interactive
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <GlassPanel />
            <MenuHighlight menuRef={menuRef} />
            <div className={`${styles.viewport} ${panel.text}`}>
              <Primitive.RadioGroup value={value} onValueChange={onValueChange}>
                {options.map((option, index) => (
                  <Primitive.RadioItem
                    className={styles.item}
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    textValue={option.label}
                    aria-label={option.label}
                    aria-describedby={option.description ? `${id}-${index}-description` : undefined}
                  >
                    <span className={styles.itemText}>
                      <span>{option.label}</span>
                      {option.description && (
                        <span id={`${id}-${index}-description`} className={styles.description}>
                          {option.description}
                        </span>
                      )}
                    </span>
                    <Primitive.ItemIndicator className={styles.indicator}>
                      <Check size={14} />
                    </Primitive.ItemIndicator>
                  </Primitive.RadioItem>
                ))}
              </Primitive.RadioGroup>
            </div>
          </Primitive.Content>
        </Primitive.Portal>
      )}
    </Primitive.Root>
  );
}
