import {mkdir,writeFile,access} from 'node:fs/promises';
const base=new URL('../assets/fonts/',import.meta.url);await mkdir(base,{recursive:true});
const names=["thmanyah-serif-display-400.woff2","thmanyah-serif-display-700.woff2","thmanyah-serif-display-900.woff2","thmanyah-sans-400.woff2","thmanyah-sans-500-600.woff2","thmanyah-sans-700-900.woff2","el-messiri-400.woff2","el-messiri-600.woff2","el-messiri-700.woff2"];
for(const name of names){try{await access(new URL(name,base));continue;}catch{}
const response=await fetch('https://raw.githubusercontent.com/almohammdin/hatta-brand-guide/e1b04ca2bad839f7b05476c33f8d6f8609f6fc34/assets/fonts/'+name);if(!response.ok)throw Error(name+': '+response.status);
await writeFile(new URL(name,base),new Uint8Array(await response.arrayBuffer()));console.log('Saved '+name);}
