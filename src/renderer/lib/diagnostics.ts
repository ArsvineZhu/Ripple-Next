import {
  RendererDiagnosticContextSchema,
  serializeDiagnosticError,
  type RendererDiagnosticContext,
  type RendererDiagnostic,
} from '../../shared/diagnostics';
import { formatDiagnosticEvent, formatDiagnosticRecord } from '../../shared/diagnosticFormat';
function send(event: RendererDiagnostic) {
  if (window.electronAPI?.reportDiagnostic) window.electronAPI.reportDiagnostic(event);
  else console.error(formatDiagnosticRecord(formatDiagnosticEvent(event), 'renderer-local'));
}

type RendererErrorSource = Extract<RendererDiagnostic, { kind: 'renderer-error' }>['source'];
let latestContext: RendererDiagnosticContext | undefined;
const POLLED_ERROR_SOURCES = new Set<RendererErrorSource>([
  'clipboard',
  'device',
  'media',
  'overview',
]);
const POLLED_ERROR_INTERVAL_MS = 60_000;
const polledErrorTimes = new Map<
  RendererErrorSource,
  { signature: string; loggedAt: number; suppressed: number }
>();

export function recordRendererError(
  source: RendererErrorSource,
  error: unknown,
  componentStack?: string | null,
): void {
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
  send({
    kind: 'renderer-error',
    source,
    error: serializedError,
    ...(componentStack
      ? {
          componentFrames: componentStack
            .split('\n')
            .filter((line) => /^\s+at /.test(line))
            .slice(0, 12)
            .map((line) => line.slice(0, 512)),
        }
      : {}),
    ...(prior?.suppressed ? { repeated: prior.suppressed } : {}),
  });
}

function recordRendererContext(context: RendererDiagnosticContext): void {
  const result = RendererDiagnosticContextSchema.safeParse(context);
  if (!result.success) return;
  latestContext = result.data;
  send({ kind: 'renderer-context', context: latestContext });
}

export function recordSettingsContext(category: string, page: string | null) {
  send({ kind: 'settings-context', context: { category, page } });
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

const recordRootError = (error: unknown, info?: { componentStack?: string | null }) =>
  recordRendererError('renderer', error, info?.componentStack);

export const rendererRootErrorHandlers = {
  onCaughtError: recordRootError,
  onUncaughtError: recordRootError,
  onRecoverableError: recordRootError,
};
