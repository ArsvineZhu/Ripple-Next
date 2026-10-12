import { z } from 'zod';

export const PageIdSchema = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
export interface PageSize {
  width: number;
  height: number;
}
export interface PageLayoutContext {
  mediaAvailable: boolean;
  workflowCount: number;
  taskCount: number;
  assistantActive: boolean;
  answerHeight: number;
  viewportHeight: number;
}

const compactSize = { width: 405, height: 120 };
const standardSize = { width: 380, height: 190 };

/** Stable page identity and layout policy; display order is stored separately. */
export const BUILTIN_PAGES = {
  search: { nameKey: 'tabSearch', layout: compactSize, radius: 28 },
  workflows: {
    nameKey: 'tabWorkflows',
    layout: ({ workflowCount }: PageLayoutContext) =>
      workflowCount ? { width: 480, height: 210 } : compactSize,
  },
  overview: { nameKey: 'tabOverview', layout: standardSize },
  playing: {
    nameKey: 'tabPlaying',
    layout: { width: 330, height: 150 },
    available: ({ mediaAvailable }: PageLayoutContext) => mediaAvailable,
    alignment: 'flex-start',
  },
  assistant: {
    nameKey: 'tabAssistant',
    blocksCollapse: ({ assistantActive }: PageLayoutContext) => assistantActive,
    layout: ({ assistantActive, answerHeight, viewportHeight }: PageLayoutContext) => ({
      ...standardSize,
      height: assistantActive
        ? Math.min(
            Math.max(standardSize.height, viewportHeight - 80),
            Math.max(standardSize.height, answerHeight),
          )
        : standardSize.height,
    }),
  },
  clipboard: { nameKey: 'tabClipboard', layout: standardSize },
  tasks: {
    nameKey: 'tabTasks',
    layout: { width: 380, height: 250 },
  },
} as const;

export type BuiltinPageId = keyof typeof BUILTIN_PAGES;
export const DEFAULT_PAGE_IDS = Object.keys(BUILTIN_PAGES);
export const DEFAULT_PAGE_ID: BuiltinPageId = 'overview';
