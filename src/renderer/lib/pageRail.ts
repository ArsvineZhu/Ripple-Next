import type { MotionValue } from 'motion/react';
export interface PageRailOptions<Id extends string | number> {
  tabs: Id[];
  activeId: Id;
  direction: number;
  width: MotionValue<number>;
  disabled: boolean;
  onSelect(id: Id, direction?: number): void;
  onProgress(from: Id, to: Id, progress: number, moving: boolean): void;
}
export function tabAt<Id>(tabs: Id[], index: number): Id {
  return tabs[((index % tabs.length) + tabs.length) % tabs.length]!;
}
