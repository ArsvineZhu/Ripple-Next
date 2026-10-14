import log from 'electron-log/renderer';

import {
  RENDERER_CONTEXT_PREFIX,
  RendererDiagnosticContextSchema,
  serializeDiagnosticError,
  type DiagnosticErrorSource,
  type RendererDiagnosticContext,
} from '../../shared/diagnostics';

let latestContext: RendererDiagnosticContext | undefined;
const POLLED_ERROR_SOURCES = new Set<DiagnosticErrorSource>([
  'clipboard',
  'device',
  'media',
  'overview',
]);
const POLLED_ERROR_INTERVAL_MS = 60_000;
const polledErrorTimes = new Map<
  DiagnosticErrorSource,
  { signature: string; loggedAt: number; suppressed: number }
>();

function timestamp() {
  return new Date().toISOString();
}

export function recordRendererError(source: DiagnosticErrorSource, error: unknown): void {
  const serializedError = serializeDiagnosticError(error);
  const now = Date.now();
  const signature = JSON.stringify(serializedError);
  const previous = POLLED_ERROR_SOURCES.has(source) ? polledErrorTimes.get(source) : undefined;
  const prior = previous?.signature === signature ? previous : undefined;
  if (prior && now - prior.loggedAt < POLLED_ERROR_INTERVAL_MS) {
    prior.suppressed += 1;
    return;
  }
  if (POLLED_ERROR_SOURCES.has(source)) {
    polledErrorTimes.set(source, {
      signature,
      loggedAt: now,
      suppressed: prior?.suppressed ?? 0,
    });
  }
  log.error(
    JSON.stringify({
      timestamp: timestamp(),
      process: 'renderer',
      event: 'renderer-error',
      source,
      error: serializedError,
      ...(prior?.suppressed ? { repeated: prior.suppressed } : {}),
    }),
  );
}

function recordRendererContext(context: RendererDiagnosticContext): void {
  const result = RendererDiagnosticContextSchema.safeParse(context);
  if (!result.success) return;
  latestContext = result.data;
  log.info(`${RENDERER_CONTEXT_PREFIX}${JSON.stringify({ context: latestContext })}`);
}

export function recordIslandContext(
  context: Omit<RendererDiagnosticContext, 'answerCharacters'>,
): void {
  recordRendererContext({
    ...context,
    answerCharacters: latestContext?.answerCharacters ?? 0,
  });
}

export function recordRendererAnswerCharacters(answerCharacters: number): void {
  if (!latestContext || !Number.isInteger(answerCharacters) || answerCharacters < 0) return;
  recordRendererContext({ ...latestContext, answerCharacters });
}

export function installRendererErrorHandlers(target: Window = window): () => void {
  const handleError = (event: ErrorEvent) => recordRendererError('renderer', event.error);
  const handleRejection = (event: PromiseRejectionEvent) =>
    recordRendererError('renderer', event.reason);
  target.addEventListener('error', handleError);
  target.addEventListener('unhandledrejection', handleRejection);
  return () => {
    target.removeEventListener('error', handleError);
    target.removeEventListener('unhandledrejection', handleRejection);
  };
}

const recordRootError = (error: unknown) => recordRendererError('renderer', error);

export const rendererRootErrorHandlers = {
  onCaughtError: recordRootError,
  onUncaughtError: recordRootError,
  onRecoverableError: recordRootError,
};
