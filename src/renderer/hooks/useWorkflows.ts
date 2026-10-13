import type { Workflow } from '../../shared/contracts';

import { openApp } from '../lib/launch';
import { useAppState } from '../components/AppStateProvider';
export function useWorkflows() {
  const { state, updateState } = useAppState();
  const workflows = state.workflows;
  async function openWorkflow(workflow: Workflow) {
    if (!workflow || !workflow.urls) return;
    const failures: unknown[] = [];
    for (let i = 0; i < workflow.urls.length; i++) {
      try {
        await openApp(workflow.urls[i]);
      } catch (error) {
        failures.push(error);
      }
      if (i < workflow.urls.length - 1) await new Promise((r) => setTimeout(r, 400));
    }
    if (failures.length)
      throw new AggregateError(failures, 'Could not launch all workflow targets');
  }
  function removeWorkflow(index: number) {
    updateState({ workflows: workflows.filter((_, i) => i !== index) });
  }
  return {
    workflows,
    openWorkflow,
    removeWorkflow,
  };
}
