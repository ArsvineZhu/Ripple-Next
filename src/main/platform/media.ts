import type { MediaCommand, MediaSession } from '../../shared/media';
import * as windows from './windows/media';
import * as macos from './macos/media';
import * as linux from './linux/media';

export interface MediaBackend {
  getMediaSessions(): Promise<{
    sessions: MediaSession[];
    failedIds: string[];
    errors?: unknown[];
  }>;
  controlSystemMedia(command: MediaCommand, session: MediaSession): Promise<void>;
  openMediaSession(session: MediaSession): Promise<void>;
  close?(): void;
  subscribe?(listener: () => void): () => void;
}
export const nativeMedia: MediaBackend =
  process.platform === 'win32'
    ? {
        getMediaSessions: windows.getMediaSessions,
        controlSystemMedia: windows.controlSystemMedia,
        openMediaSession: windows.openMediaSession,
        subscribe: windows.subscribe,
        close: windows.close,
      }
    : process.platform === 'darwin'
      ? {
          getMediaSessions: macos.getMediaSessions,
          controlSystemMedia: macos.controlSystemMedia,
          openMediaSession: macos.openMediaSession,
        }
      : {
          getMediaSessions: linux.getMediaSessions,
          controlSystemMedia: linux.controlSystemMedia,
          openMediaSession: linux.openMediaSession,
          subscribe: linux.subscribe,
          close: linux.close,
        };
