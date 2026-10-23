import type { ScrollGestureStart } from '../../shared/contracts';

interface ScrollGestureSource {
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  once(event: string, listener: (...args: unknown[]) => void): unknown;
  removeListener(event: string, listener: (...args: unknown[]) => void): unknown;
  isDestroyed(): boolean;
  send(channel: string, payload: ScrollGestureStart): void;
}

export function installScrollGestureBridge(contents: ScrollGestureSource): () => void {
  let closed = false;
  const input = (_event: unknown, value: unknown) => {
    if (closed || contents.isDestroyed() || !value || typeof value !== 'object') return;
    if (
      'type' in value &&
      (value.type === 'gestureScrollEnd' || value.type === 'gestureFlingStart')
    ) {
      contents.send('scroll-gesture-end', { at: Date.now() });
    }
    // FlingCancel only stops inertia (including a touch with no movement).
    // ScrollBegin is the single authoritative start for Chromium sources.
    if ('type' in value && value.type === 'gestureScrollBegin') {
      contents.send('scroll-gesture-start', { at: Date.now() });
    }
  };
  const close = () => {
    if (closed) return;
    closed = true;
    contents.removeListener('input-event', input);
    contents.removeListener('destroyed', close);
  };
  contents.on('input-event', input);
  contents.once('destroyed', close);
  return close;
}
