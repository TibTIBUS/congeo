import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
await build({entryPoints:['tests/approved.mjs'],bundle:true,platform:'node',format:'esm',packages:'external',outfile:'.worker-build/tests/approved.mjs'});
const result=spawnSync(process.execPath,['.worker-build/tests/approved.mjs'],{stdio:'inherit'});process.exit(result.status??1);
