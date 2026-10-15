import { z } from 'zod';

const DiagnosticProblemSchema = z
  .object({ path: z.string().max(160), reason: z.string().max(240) })
  .strict();
function errorSchema(depth: number): z.ZodType<SerializedDiagnosticError> {
  return z
    .object({
      type: z.string().max(64),
      message: z.string().max(320).optional(),
      frames: z.array(z.string().max(512)).max(24),
      code: z.union([z.string().max(64), z.number()]).optional(),
      errno: z.number().optional(),
      syscall: z.string().max(32).optional(),
      signal: z.string().max(32).optional(),
      killed: z.boolean().optional(),
      statusCode: z.number().int().optional(),
      problems: z.array(DiagnosticProblemSchema).max(12).optional(),
      cause: depth < 3 ? z.lazy(() => errorSchema(depth + 1)).optional() : z.never().optional(),
    })
    .strict();
}
export const DiagnosticErrorSchema = errorSchema(0);
export interface SerializedDiagnosticError {
  type: string;
  message?: string;
  frames: string[];
  code?: string | number;
  errno?: number;
  syscall?: string;
  signal?: string;
  killed?: boolean;
  statusCode?: number;
  problems?: { path: string; reason: string }[];
  cause?: SerializedDiagnosticError;
}
/** The reason is application-authored; never pass provider responses or user content. */
export class DiagnosticError extends Error {
  constructor(
    message: string,
    readonly problems: { path: string; reason: string }[] = [],
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}
export function validationProblems(issues: readonly z.core.$ZodIssue[]) {
  return issues.slice(0, 12).map((issue) => {
    const path =
      issue.path
        .map((part) =>
          typeof part === 'number'
            ? `[${part}]`
            : /^[a-zA-Z][\w-]{0,63}$/.test(String(part))
              ? String(part)
              : '<field>',
        )
        .join('.')
        .replaceAll('.[', '[') || '<request>';
    let reason: string = issue.code;
    if (issue.code === 'invalid_value')
      reason =
        'expected ' +
        issue.values
          .filter((value) => typeof value === 'string' && /^[\w.-]{1,64}$/.test(value))
          .join(' | ');
    else if (issue.code === 'invalid_type') reason = 'expected ' + issue.expected;
    else if (issue.code === 'too_big' || issue.code === 'too_small')
      reason = `${issue.origin} ${issue.code === 'too_big' ? 'maximum' : 'minimum'} ${issue.code === 'too_big' ? issue.maximum : issue.minimum}`;
    else if (issue.code === 'unrecognized_keys') reason = 'unsupported fields';
    else if (issue.code === 'custom') reason = 'constraint not satisfied';
    return { path, reason };
  });
}
const systemReasons: Record<string, string> = {
  ENOENT: 'Executable or file was not found',
  EACCES: 'Access was denied',
  EPERM: 'Operation was not permitted',
  ETIMEDOUT: 'Operation timed out',
  ECONNREFUSED: 'Connection was refused',
  ECONNRESET: 'Connection was reset',
  ENOTFOUND: 'Host name could not be resolved',
  EAI_AGAIN: 'DNS lookup temporarily failed',
  ERR_ABORTED: 'Operation was cancelled',
  ABORT_ERR: 'Operation was cancelled',
  ERR_CHILD_PROCESS_STDIO_MAXBUFFER: 'System command output exceeded its limit',
};
export function serializeDiagnosticError(error: unknown, depth = 0): SerializedDiagnosticError {
  const summary: SerializedDiagnosticError = { type: typeof error, frames: [] };
  if (!error || typeof error !== 'object') return summary;
  try {
    const data = error as Error & {
      code?: unknown;
      errno?: unknown;
      syscall?: unknown;
      signal?: unknown;
      killed?: unknown;
      statusCode?: unknown;
    };
    const name = error instanceof Error ? error.name || error.constructor.name : 'object';
    summary.type = /^[A-Za-z_$][\w$]{0,63}$/.test(name) ? name : 'Error';
    if (error instanceof DiagnosticError) {
      summary.message = error.message.slice(0, 320);
      if (error.problems.length) summary.problems = error.problems.slice(0, 12);
    } else if (error instanceof z.ZodError) {
      summary.message = 'Request validation failed';
      summary.problems = validationProblems(error.issues);
    } else if (
      error instanceof TypeError &&
      /^Cannot read properties of (?:undefined|null)/.test(error.message)
    )
      summary.message = error.message
        .replace(/\(reading ['"]([\w$]{1,64})['"]\)/, '(reading $1)')
        .replace(/\(reading ['"].*['"]\)/, '(reading <property>)')
        .slice(0, 320);
    else if (error instanceof SyntaxError) summary.message = 'Syntax or JSON parsing failed';
    else if (error instanceof ReferenceError && /^[\w$]+ is not defined$/.test(error.message))
      summary.message = error.message;
    else if (
      error instanceof RangeError &&
      ['Maximum call stack size exceeded', 'Invalid time value'].includes(error.message)
    )
      summary.message = error.message;
    else if (
      error instanceof Error &&
      ['fetch failed', 'Failed to fetch', 'Network request failed'].includes(error.message)
    )
      summary.message = error.message;
    if (error instanceof Error && typeof data.stack === 'string')
      summary.frames = data.stack
        .split(/\r?\n/)
        .slice(1)
        .filter((frame) => /^\s+at .*(?::\d+:\d+\)?|native\)?)$/.test(frame))
        .slice(0, 24)
        .map((frame) => frame.slice(0, 512));
    if (typeof data.code === 'number' && Number.isFinite(data.code)) summary.code = data.code;
    else if (typeof data.code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(data.code)) {
      summary.code = data.code;
      summary.message ??= systemReasons[data.code];
    }
    if (typeof summary.code === 'number' && summary.code >>> 16 === 0x8007) {
      const native = {
        2: 'File was not found',
        3: 'Path was not found',
        5: 'Access was denied',
        87: 'Invalid native parameter',
        1460: 'Native operation timed out',
      } as Record<number, string>;
      const reason = native[summary.code & 0xffff];
      if (reason)
        summary.message = `${summary.message ?? 'Native operation failed'}; ${reason} (HRESULT 0x${(summary.code >>> 0).toString(16).toUpperCase()})`;
    }
    if (typeof data.errno === 'number' && Number.isFinite(data.errno)) summary.errno = data.errno;
    if (typeof data.syscall === 'string' && /^[a-zA-Z]{1,32}$/.test(data.syscall))
      summary.syscall = data.syscall;
    if (typeof data.signal === 'string' && /^SIG[A-Z]{1,16}$/.test(data.signal))
      summary.signal = data.signal;
    if (typeof data.killed === 'boolean') summary.killed = data.killed;
    if (
      typeof data.statusCode === 'number' &&
      Number.isInteger(data.statusCode) &&
      data.statusCode >= 100 &&
      data.statusCode <= 599
    ) {
      summary.statusCode = data.statusCode;
      summary.message ??= `HTTP ${data.statusCode}: ${data.statusCode === 401 || data.statusCode === 403 ? 'service rejected authentication' : data.statusCode === 429 ? 'service rate limit reached' : data.statusCode >= 500 ? 'service failed' : 'request rejected'}`;
    }
    if (data.cause && depth < 3 && data.cause !== error)
      summary.cause = serializeDiagnosticError(data.cause, depth + 1);
  } catch {
    /* Retain fields already read when an error has throwing getters. */
  }
  return summary;
}
