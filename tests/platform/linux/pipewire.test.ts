import { expect, it, vi } from 'vitest';
import { createPipeWireState } from '../../../src/main/platform/linux/pipewire';
it('frames fragmented native JSON and merges node state patches and removals', () => {
  const changed = vi.fn();
  const state = createPipeWireState(changed);
  const node = {
    id: 12,
    type: 'PipeWire:Interface:Node',
    info: {
      state: 'running',
      props: {
        'media.class': 'Stream/Input/Audio',
        'application.name': 'a ] " quoted name',
      },
    },
  };
  const input = JSON.stringify([node]);
  for (const char of input) state.consume(char);
  expect(changed).toHaveBeenLastCalledWith({ microphone: true, camera: false });
  state.consume('\n' + JSON.stringify([{ id: 12, info: { state: 'idle' } }]));
  expect(changed).toHaveBeenLastCalledWith({ microphone: false, camera: false });
  state.consume(
    JSON.stringify([{ id: 12, info: { state: 'running' } }]) +
      JSON.stringify([
        {
          id: 13,
          type: 'PipeWire:Interface:Node',
          info: { state: 'running', props: { 'media.class': 'Stream/Input/Video' } },
        },
      ]),
  );
  expect(changed).toHaveBeenLastCalledWith({ microphone: true, camera: true });
  state.consume(
    JSON.stringify([
      { id: 12, info: null },
      { id: 13, info: null },
    ]),
  );
  expect(changed).toHaveBeenLastCalledWith({ microphone: false, camera: false });
  state.reset();
  state.consume('[]');
  expect(changed).toHaveBeenLastCalledWith({ microphone: false, camera: false });
});
it('rejects invalid and oversized native frames', () => {
  expect(() => createPipeWireState(() => {}).consume('garbage')).toThrow();
  expect(() => createPipeWireState(() => {}).consume('[{"id":"wrong"}]')).toThrow();
  expect(() => createPipeWireState(() => {}).consume('['.repeat(16 * 1024 * 1024 + 1))).toThrow();
});
