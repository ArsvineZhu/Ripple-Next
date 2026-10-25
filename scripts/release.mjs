import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--dry-run')) throw Error('Usage: pnpm release [--dry-run]');
const dryRun = args.includes('--dry-run');
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)) throw Error('Invalid package version');
const tag = `v${version}`;
const repo = 'ArsvineZhu/Ripple-Next';
function run(command, argv, { capture = false, allowFailure = false } = {}) {
  const result = spawnSync(command, argv, {
    cwd,
    windowsHide: true,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure)
    throw Error(
      `${command} ${argv.join(' ')} failed${result.stderr ? `: ${result.stderr.trim()}` : ''}`,
    );
  return capture ? result.stdout.trim() : result.status;
}
// Generate both locales before creating any remote release state.
run(process.execPath, ['scripts/release-notes.mjs', tag], { capture: true });
const head = run('git', ['rev-parse', 'HEAD'], { capture: true });
if (dryRun) {
  console.log(`Ready to release Ripple Next ${version} from ${head}.`);
  console.log(
    `pnpm release will push ${tag}, wait for platform checks/packages, and publish a regular release.`,
  );
  console.log('The release command requires a clean checkout at the current origin/main commit.');
  process.exit(0);
}
if (run('git', ['status', '--porcelain'], { capture: true }))
  throw Error('Commit the release changes before running pnpm release.');
run('gh', ['auth', 'status']);
run('git', ['fetch', 'origin', 'main']);
if (head !== run('git', ['rev-parse', 'origin/main'], { capture: true }))
  throw Error('Integrate the approved release commit into main before publishing.');
const remoteTag = run('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`], {
  capture: true,
});
if (remoteTag && remoteTag.split(/\s/)[0] !== head)
  throw Error(`${tag} already points to a different commit. Choose a new version.`);
if (!remoteTag) {
  const localTag = run('git', ['rev-parse', '--verify', `refs/tags/${tag}`], {
    capture: true,
    allowFailure: true,
  });
  if (localTag && localTag !== head) throw Error(`Local ${tag} points to a different commit.`);
  if (!localTag) run('git', ['tag', tag, head]);
  run('git', ['push', 'origin', `refs/tags/${tag}`]);
}
let runId;
let conclusion;
for (let attempt = 0; attempt < 60; attempt++) {
  const runs = JSON.parse(
    run(
      'gh',
      [
        'run',
        'list',
        '--repo',
        repo,
        '--workflow',
        'build.yml',
        '--event',
        'push',
        '--commit',
        head,
        '--json',
        'databaseId,headBranch,conclusion',
        '--limit',
        '10',
      ],
      { capture: true },
    ),
  );
  const build = runs.find((item) => item.headBranch === tag);
  runId = build?.databaseId;
  conclusion = build?.conclusion;
  if (runId) break;
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
if (!runId) throw Error(`Tag pushed. Find its build at https://github.com/${repo}/actions`);
if (['failure', 'cancelled', 'timed_out'].includes(conclusion))
  run('gh', ['run', 'rerun', String(runId), '--repo', repo, '--failed']);
run('gh', ['run', 'watch', String(runId), '--repo', repo, '--exit-status', '--interval', '15']);
const release = JSON.parse(
  run('gh', ['release', 'view', tag, '--repo', repo, '--json', 'url,isDraft,isPrerelease,assets'], {
    capture: true,
  }),
);
if (release.isDraft || release.isPrerelease || release.assets.length !== 9)
  throw Error(`Inspect release status and packages: ${release.url}`);
console.log(`Published ${release.url} (9 packages, regular release).`);
