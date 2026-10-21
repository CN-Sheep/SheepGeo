import {createHash} from 'node:crypto';
import {readFileSync, readdirSync} from 'node:fs';
import {resolve, relative, dirname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const entries=readFileSync(resolve(root,'SHA256SUMS'),'utf8').trim().split('\n').map(line=>{
  const match=/^([a-f0-9]{64})  (.+)$/.exec(line);
  if(!match) throw new Error('Invalid manifest entry');
  const target=resolve(root,match[2]);
  if(!target.startsWith(root+sep)) throw new Error('Manifest path escapes release directory');
  return {digest:match[1],name:match[2],target};
});
const expected=new Set(entries.map(item=>item.name));
if(expected.size!==entries.length) throw new Error('Duplicate manifest paths');
let checked=0;
for(const entry of entries){
  const digest=createHash('sha256').update(readFileSync(entry.target)).digest('hex');
  if(digest!==entry.digest) throw new Error('Release checksum mismatch');
  checked++;
}
function walk(directory){
  for(const item of readdirSync(directory,{withFileTypes:true})){
    if(item.isSymbolicLink()) throw new Error('Release contains a symbolic link');
    const target=resolve(directory,item.name);
    if(item.isDirectory()){
      if(['node_modules','.git'].includes(item.name)) continue;
      walk(target);
    } else {
      const name=relative(root,target).split(sep).join('/');
      if(name!=='SHA256SUMS' && !expected.has(name)) throw new Error('Unexpected file in release directory');
    }
  }
}
walk(root);
console.log(JSON.stringify({verified:true,files:checked}));
