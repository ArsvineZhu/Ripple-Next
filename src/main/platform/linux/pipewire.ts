import { z } from 'zod';

const objectSchema = z.object({
  id: z.number().int().nonnegative(),
  type: z.string().optional(),
  info: z
    .object({ state: z.string().optional(), props: z.record(z.string(), z.unknown()).optional() })
    .nullish(),
});
type Node = z.infer<typeof objectSchema>;

/** Incremental JSON framing and node patches from pw-dump --monitor. */
export function createPipeWireState(
  changed: (status: { camera: boolean; microphone: boolean }) => void,
) {
  const nodes = new Map<number, Node>();
  let buffer = '',
    offset = 0,
    depth = 0,
    quoted = false,
    escaped = false;
  return {
    consume(chunk: string) {
      buffer += chunk;
      if (buffer.length > 16 * 1024 * 1024) throw new Error('PipeWire frame limit exceeded');
      let completed = false;
      for (; offset < buffer.length; offset++) {
        const char = buffer[offset];
        if (quoted) {
          if (escaped) escaped = false;
          else if (char === '\\') escaped = true;
          else if (char === '"') quoted = false;
        } else if (char === '"') quoted = true;
        else if (char === '[' || char === '{') depth++;
        else if (char === ']' || char === '}') {
          if (--depth !== 0) continue;
          const updates = z.array(objectSchema).parse(JSON.parse(buffer.slice(0, offset + 1)));
          for (const update of updates) {
            if (update.info === null) {
              nodes.delete(update.id);
              continue;
            }
            const previous = nodes.get(update.id);
            if ((update.type ?? previous?.type) !== 'PipeWire:Interface:Node') continue;
            nodes.set(update.id, {
              ...previous,
              ...update,
              info: {
                ...previous?.info,
                ...update.info,
                props: { ...previous?.info?.props, ...update.info?.props },
              },
            });
          }
          const running = [...nodes.values()].filter((node) => node.info?.state === 'running');
          changed({
            microphone: running.some(
              (node) => node.info?.props?.['media.class'] === 'Stream/Input/Audio',
            ),
            camera: running.some(
              (node) => node.info?.props?.['media.class'] === 'Stream/Input/Video',
            ),
          });
          buffer = buffer.slice(offset + 1);
          offset = -1;
          completed = true;
        } else if (depth === 0 && !/\s/.test(char)) throw new Error('Invalid PipeWire frame');
      }
      return completed;
    },
    reset() {
      nodes.clear();
      buffer = '';
      offset = depth = 0;
      quoted = escaped = false;
    },
  };
}
