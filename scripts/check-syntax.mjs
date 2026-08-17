import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

async function walk(dir) {
  const out=[];
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    if (['node_modules','.git','.expo','dist'].includes(entry.name)) continue;
    const full=path.join(dir,entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (/\.(js|jsx|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}
const files=await walk(process.cwd());
let failed=0;
for (const file of files) {
  const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(r.status!==0){failed++; console.error(r.stderr||r.stdout);}
}
if(failed){process.exit(1)}
console.log(`Syntax OK: ${files.length} fichiers`);
