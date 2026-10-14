import { AsyncLocalStorage } from 'node:async_hooks';
export interface DiagnosticOperation {
  id: number;
  channel: string;
  sender?: string;
  fields: string[];
}
const operation = new AsyncLocalStorage<DiagnosticOperation>();
export function withDiagnosticOperation<T>(context: DiagnosticOperation, run: () => T): T {
  return operation.run(context, run);
}
export function currentDiagnosticOperation() {
  return operation.getStore();
}
