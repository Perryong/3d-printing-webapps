import { build } from 'esbuild';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const directory = await mkdtemp(join(tmpdir(), 'stl-viewer-test-'));
try {
  const outfile = join(directory, 'tests.mjs');
  await build({ stdin: { contents: (process.argv.slice(2).length ? process.argv.slice(2) : (await readdir('tests')).filter(f => f.endsWith('.test.ts')).map(f => 'tests/' + f)).map(f => `import '${process.cwd()}/${f}';`).join('\n'), resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', outfile });
  const result = spawnSync(process.execPath, ['--test', outfile], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
