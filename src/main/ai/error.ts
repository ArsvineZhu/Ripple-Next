import type { NoticeCode } from '../../shared/contracts';

export class AIError extends Error {
  constructor(
    readonly code: NoticeCode,
    message: string,
  ) {
    super(message);
  }
}
