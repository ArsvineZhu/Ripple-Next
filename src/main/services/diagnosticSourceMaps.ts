import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SourceMap } from 'node:module';

/** Map only our adjacent build maps; renderer-supplied frames cannot read arbitrary files. */
export function createDiagnosticSourceMapper(buildRoot: string) {
  const maps = new Map<string, SourceMap | null>();
  return (frame: string): string => {
    const match = frame.match(
      /^(.*?)(file:\/\/\/[^()]+|[A-Za-z]:[\\/][^()]+|\/[^()]+):(\d+):(\d+)(\)?)$/,
    );
    if (!match) return frame;
    try {
      const file = match[2].startsWith('file:') ? fileURLToPath(match[2]) : match[2];
      const relative = path.relative(buildRoot, file);
      if (
        !relative ||
        relative === '..' ||
        relative.startsWith('..' + path.sep) ||
        path.isAbsolute(relative) ||
        !/\.(?:c?js)$/.test(file)
      )
        return frame;
      let map = maps.get(file);
      if (map === undefined) {
        if (maps.size >= 16) maps.delete(maps.keys().next().value!);
        try {
          map = new SourceMap(JSON.parse(readFileSync(file + '.map', 'utf8')));
        } catch {
          map = null;
        }
        maps.set(file, map);
      }
      const entry = map?.findEntry(Number(match[3]) - 1, Number(match[4]) - 1);
      if (!entry || !('originalSource' in entry)) return frame;
      const source = entry.originalSource
        .replaceAll('\\', '/')
        .replace(/^.*?\/src\//, 'src/')
        .replace(/^(\.\.\/)+/, '');
      return `${match[1]}${source}:${entry.originalLine + 1}:${entry.originalColumn + 1}${match[5]}`;
    } catch {
      return frame;
    }
  };
}
