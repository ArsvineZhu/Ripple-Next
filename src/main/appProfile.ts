import fs from 'node:fs';
import path from 'node:path';

interface ProfileApplication {
  isPackaged: boolean;
  getPath(name: 'appData' | 'home'): string;
  setPath(name: 'userData' | 'sessionData', value: string): void;
}

/** Keep development state and Chromium sessions separate from the installed application. */
export function configureApplicationProfile(app: ProfileApplication): string {
  const userData = path.join(
    app.getPath('appData'),
    app.isPackaged ? 'Ripple Next' : 'Ripple Next Development',
  );
  fs.mkdirSync(userData, { recursive: true, mode: 0o700 });
  app.setPath('userData', userData);
  app.setPath('sessionData', userData);
  return userData;
}

/** Electron's native instance lock shares one namespace across builds and data profiles. */
export function requestApplicationInstanceLock(
  app: ProfileApplication & { requestSingleInstanceLock(): boolean },
  userDataPath: string,
): boolean {
  // Match the installed profile's native lock, including releases predating development profiles.
  const lockPath = path.join(
    process.platform === 'linux'
      ? path.join(app.getPath('home'), '.config')
      : app.getPath('appData'),
    'Ripple Next',
  );
  fs.mkdirSync(lockPath, { recursive: true, mode: 0o700 });
  app.setPath('userData', lockPath);
  try {
    return app.requestSingleInstanceLock();
  } finally {
    app.setPath('userData', userDataPath);
  }
}
