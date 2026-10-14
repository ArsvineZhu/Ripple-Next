import { useAppState } from '../components/AppStateProvider';
export function useWorkflows() {
  const { state, updateState } = useAppState();
  const workflows = state.workflows;
  function removeWorkflow(index: number) {
    updateState({ workflows: workflows.filter((_, i) => i !== index) });
  }
  return {
    workflows,
    removeWorkflow,
  };
}
