import {build} from 'esbuild';
import {readdir,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
await mkdir('.emulator-tests',{recursive:true});
const entries=(await readdir('tests/emulator')).filter(f=>f.endsWith('.test.ts')).map(f=>'tests/emulator/'+f);
await build({entryPoints:entries,bundle:true,packages:'external',platform:'node',format:'esm',outdir:'.emulator-tests',outExtension:{'.js':'.mjs'}});
process.exitCode=spawnSync(process.execPath,['--test','--test-concurrency=1',...entries.map(f=>'.emulator-tests/'+f.split('/').pop().replace('.ts','.mjs'))],{stdio:'inherit'}).status??1;
