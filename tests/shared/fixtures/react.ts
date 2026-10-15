import { act } from 'react';
import { createRoot } from 'react-dom/client';

export function createReactFixture() {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  return {
    host,
    root,
    async close() {
      await act(async () => root.unmount());
      host.remove();
    },
  };
}
export async function fillInput(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
