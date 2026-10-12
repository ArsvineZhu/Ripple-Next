import { Sun, Search, Zap, Music, Mic, List, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { BUILTIN_PAGES, DEFAULT_PAGE_ID } from '../../shared/pages';
import type { BuiltinPageId, PageLayoutContext, PageSize } from '../../shared/pages';
import type { en } from '../../shared/i18n/en';
import type { IslandController } from '../hooks/useIslandController';
import { BrowserSearchTab } from '../features/BrowserSearchTab';
import { WorkflowsTab } from '../features/WorkflowsTab';
import { OverviewTab } from '../features/OverviewTab';
import { NowPlayingTab } from '../features/NowPlayingTab';
import { AssistantTab } from '../features/AssistantTab';
import { ClipboardTab } from '../features/ClipboardTab';
import { TasksTab } from '../features/TasksTab';
import { createPageRegistry } from './pageRegistry';

interface RenderContext {
  controller: IslandController;
  onAnswerContentSizeChange(height: number): void;
  resetAnswerContentSize(): void;
}
export interface IslandPageDefinition {
  id: string;
  nameKey?: keyof typeof en;
  title?: string;
  icon(color: string): ReactNode;
  render(context: RenderContext): ReactNode;
  layout: PageSize | ((context: PageLayoutContext) => PageSize);
  available?: (context: PageLayoutContext) => boolean;
  radius?: number;
  alignment?: 'center' | 'flex-start';
  blocksCollapse?: (context: PageLayoutContext) => boolean;
}

const renderers: Record<BuiltinPageId, Pick<IslandPageDefinition, 'icon' | 'render'>> = {
  search: {
    icon: (color) => <Search size={16} color={color} />,
    render: ({ controller }) => <BrowserSearchTab {...controller} />,
  },
  workflows: {
    icon: (color) => <Zap size={16} color={color} />,
    render: ({ controller }) => <WorkflowsTab {...controller} />,
  },
  overview: {
    icon: (color) => <Sun size={16} color={color} />,
    render: ({ controller }) => <OverviewTab {...controller} />,
  },
  playing: {
    icon: (color) => <Music size={16} color={color} />,
    render: ({ controller }) => <NowPlayingTab {...controller} />,
  },
  assistant: {
    icon: (color) => <Mic size={16} color={color} />,
    render: ({ controller, onAnswerContentSizeChange, resetAnswerContentSize }) => (
      <AssistantTab
        {...controller}
        onAnswerContentSizeChange={onAnswerContentSizeChange}
        resetAnswerContentSize={resetAnswerContentSize}
      />
    ),
  },
  clipboard: {
    icon: (color) => <List size={16} color={color} />,
    render: ({ controller }) => <ClipboardTab {...controller} />,
  },
  tasks: {
    icon: (color) => <Check size={16} color={color} />,
    render: ({ controller }) => <TasksTab {...controller} />,
  },
};

const definitions: IslandPageDefinition[] = Object.entries(BUILTIN_PAGES).map(([id, metadata]) => ({
  id,
  ...metadata,
  ...renderers[id as BuiltinPageId],
}));
export function createIslandPageRegistry(additionalPages: readonly IslandPageDefinition[] = []) {
  return createPageRegistry<PageLayoutContext, IslandPageDefinition>(
    [...definitions, ...additionalPages],
    DEFAULT_PAGE_ID,
  );
}
export const islandPages = createIslandPageRegistry();
export const TABS = islandPages.definitions;
