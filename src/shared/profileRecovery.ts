import { DiagnosticError } from './diagnosticError';

export const profileStoreFileName = 'ripple-next.sqlite';
export const profileStoreRelatedNames = [
  profileStoreFileName,
  `${profileStoreFileName}-wal`,
  `${profileStoreFileName}-shm`,
] as const;

export interface ProfileResetConsent {
  backupCompleted: boolean;
  confirmedDiscard: boolean;
}

/** A reset is allowed after a completed backup, or after an explicit choice to discard. */
export function profileResetAllowed(consent: ProfileResetConsent) {
  return consent.backupCompleted || consent.confirmedDiscard;
}

export function assertProfileResetAllowed(consent: ProfileResetConsent) {
  if (!profileResetAllowed(consent))
    throw new DiagnosticError('Reset requires a completed backup or an explicit confirmation');
}

/** Directory for one backup. It is not the live store file. */
export function incompatibleProfileBackupPath(userDataPath: string, instant: Date) {
  const separator = userDataPath.includes('\\') && !userDataPath.includes('/') ? '\\' : '/';
  const root = userDataPath.replace(/[\\/]+$/, '');
  const stamp = instant.toISOString().replace(/[:.]/g, '-');
  return `${root}${separator}backups${separator}incompatible-${stamp}`;
}

/** Stored data that fails the current schema stays rejected. */
export class IncompatibleProfileError extends DiagnosticError {
  constructor(problems: { path: string; reason: string }[]) {
    super('Ripple Next database state does not match its schema', problems);
  }
}
