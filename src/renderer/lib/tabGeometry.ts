import type { PageLayoutContext } from '../../shared/pages';
import { islandPages } from './tabs';

export const defaultPageLayoutContext: PageLayoutContext = {
  mediaAvailable: false,
  workflowCount: 1,
  taskCount: 1,
  assistantActive: false,
  answerHeight: 0,
  viewportHeight: 768,
};

export function expandedTabSize(id: string, context = defaultPageLayoutContext) {
  return islandPages.size(id, context);
}
