import { DiagnosticError } from '../../shared/diagnosticError';
import type { NoticeCode } from '../../shared/contracts';

export class AIError extends DiagnosticError {
  constructor(
    readonly code: NoticeCode,
    message: string,
  ) {
    super(message);
  }
}
