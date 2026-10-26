import {readFile} from 'node:fs/promises';
const base='https://almohammdin.github.io/mycv/';
const nonce=Date.now();
const index=await fetch(base+'?verify='+nonce,{cache:'no-store'});
if(!index.ok)throw Error('Homepage '+index.status);
const html=await index.text();
if(!html.includes('assets/cv.css?v=3')||!html.includes('الإصدار 3.0')||html.includes('src="./assets/hatta-logo'))throw Error('Published identity does not match');
for(const file of ['assets/cv.css','assets/fonts/thmanyah-sans-400.woff2','assets/social/naif-link-preview-v3.png','Naif-Almohammdi-CV-AR.pdf','Naif-Almohammdi-CV-AR-Short.pdf','Naif-Almohammdi-CV-EN.pdf']){
 const response=await fetch(base+file+'?verify='+nonce,{cache:'no-store'});
 if(!response.ok)throw Error(file+' '+response.status);
 const bytes=new Uint8Array(await response.arrayBuffer());
 if(bytes.length<100)throw Error('Empty asset '+file);
 if(file.endsWith('.pdf')&&new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('Invalid PDF '+file);
 if(file.endsWith('.css')){const expected=await readFile(file,'utf8');if(new TextDecoder().decode(bytes)!==expected)throw Error('CSS version mismatch');}
 console.log('Published: '+file+' ('+bytes.length+' bytes)');
}
console.log('Live version 3.0 verified.');
