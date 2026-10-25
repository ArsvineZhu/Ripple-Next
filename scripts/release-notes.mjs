import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tag = process.argv[2];
if (!/^v\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(tag ?? ''))
  throw new Error('Provide a version tag, for example v4.1.0-beta.1');
const version = tag.slice(1);
const base = `https://github.com/ArsvineZhu/Ripple-Next/blob/${tag}/`;
const imageBase = `https://raw.githubusercontent.com/ArsvineZhu/Ripple-Next/${tag}/`;
const notes = ['en', 'zh-CN'].map((locale) => {
  const relative = `docs/releases/${version}.${locale}.md`;
  return fs
    .readFileSync(path.join(root, relative), 'utf8')
    .replace(/(!?\[[^\]]*\]\()([^):]+)(\))/g, (match, prefix, target, suffix) => {
      if (/^(https?:|#)/.test(target)) return match;
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(relative), target));
      return prefix + (prefix.startsWith('!') ? imageBase : base) + resolved + suffix;
    })
    .trim();
});
process.stdout.write(notes.join('\n\n---\n\n') + '\n');
