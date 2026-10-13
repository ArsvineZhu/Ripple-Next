import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { useOverlay } from './OverlayProvider';
import styles from './SearchableSelect.module.css';
import { GlassPanel } from './liquidGlass/GlassPanel';
import panel from './liquidGlass/GlassPanel.module.css';

interface SearchableOption {
  value: string;
  label: string;
  keywords?: string[];
  description?: string;
}

interface Props {
  value: string;
  options: readonly SearchableOption[];
  onValueChange: (value: string) => void;
  label: string;
  searchPlaceholder: string;
  emptyLabel: string;
  disabled?: boolean;
}

export function SearchableSelect({
  value,
  options,
  onValueChange,
  label,
  searchPlaceholder,
  emptyLabel,
  disabled,
}: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [space, setSpace] = useState<number | null>(null);
  const { container, openId, setOpenId, suppressShellClick } = useOverlay();
  const open = openId === id;
  const [present, setPresent] = useState(false);
  useEffect(() => {
    if (open) {
      setPresent(true);
      return;
    }
    const timer = setTimeout(() => setPresent(false), 160);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(
    () => () => {
      if (open) setOpenId((current) => (current === id ? null : current));
    },
    [id, open, setOpenId],
  );

  return (
    <Popover.Root
      modal={false}
      open={open}
      onOpenChange={(next) => {
        if (next && triggerRef.current && container) {
          const trigger = triggerRef.current.getBoundingClientRect();
          const boundary = container.getBoundingClientRect();
          setSpace(
            Math.max(
              44,
              Math.max(trigger.top - boundary.top, boundary.bottom - trigger.bottom) - 18,
            ),
          );
        }
        setOpenId(next ? id : null);
      }}
    >
      <Popover.Trigger asChild>
        <button
          ref={triggerRef}
          type="button"
          className={styles.trigger}
          aria-label={label}
          disabled={disabled}
          data-island-interactive
        >
          <span data-select-value>
            {options.find((option) => option.value === value)?.label ?? label}
          </span>
          <span className={styles.chevron}>
            <ChevronsUpDown size={14} />
          </span>
        </button>
      </Popover.Trigger>
      {container && (open || present) && (
        <Popover.Portal container={container}>
          <Popover.Content
            style={space ? ({ '--glass-menu-space': `${space}px` } as CSSProperties) : undefined}
            className={`${styles.content} ${panel.menu}`}
            side="bottom"
            sideOffset={6}
            align="end"
            collisionBoundary={container}
            collisionPadding={12}
            hideWhenDetached
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              inputRef.current?.focus();
            }}
            onPointerDownOutside={(event) => {
              const target = event.detail.originalEvent.target;
              if (target instanceof Element && target.closest('#Island')) suppressShellClick();
            }}
            data-island-interactive
            onWheel={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <GlassPanel />
            <Command label={label} loop className={`${styles.command} ${panel.text}`}>
              <div className={styles.searchBox}>
                <Search size={14} aria-hidden="true" />
                <Command.Input
                  ref={inputRef}
                  className={styles.searchInput}
                  aria-label={searchPlaceholder}
                  placeholder={searchPlaceholder}
                />
              </div>
              <Command.List className={styles.list}>
                <Command.Empty className={styles.empty}>{emptyLabel}</Command.Empty>
                {options.map((option, index) => (
                  <Command.Item
                    key={option.value}
                    value={option.value}
                    keywords={option.keywords}
                    aria-label={option.label}
                    aria-describedby={option.description ? `${id}-${index}-description` : undefined}
                    onSelect={() => {
                      onValueChange(option.value);
                      setOpenId(null);
                    }}
                    className={styles.item}
                  >
                    <span className={styles.itemText}>
                      <span>{option.label}</span>
                      {option.description && (
                        <span id={`${id}-${index}-description`} className={styles.description}>
                          {option.description}
                        </span>
                      )}
                    </span>
                    <span className={styles.indicator} aria-hidden="true">
                      {value === option.value && <Check size={14} />}
                    </span>
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </Popover.Content>
        </Popover.Portal>
      )}
    </Popover.Root>
  );
}
