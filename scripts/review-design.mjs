import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await mkdir(path.join(root,'review'),{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 for(const lang of ['ar','en']){
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:width>1000?1050:844});
   await page.goto(pathToFileURL(path.join(root,'index.html')).href);
   await page.evaluate(lang=>switchLang(lang),lang);await page.evaluate(async()=>{await Promise.all([document.fonts.load('400 16px "Thmanyah Sans"','الاستثمار'),document.fonts.load('400 16px "Thmanyah Serif Display"','الاستثمار'),document.fonts.load('400 16px "El Messiri"','Investment')]);await document.fonts.ready;});
   await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
   const issues=await page.evaluate(({lang,width})=>{
    const active=document.querySelector('.lang-content.active');const bad=[];
    if(document.documentElement.lang!==lang)bad.push('language');
    if(document.querySelector('#btn-'+lang).getAttribute('aria-pressed')!=='true')bad.push('language button state');
    if(document.documentElement.scrollWidth>width+1)bad.push('page overflow '+document.documentElement.scrollWidth);
    const hero=active.querySelector('.header');
    if(hero.querySelector('.naif-logo').getBoundingClientRect().top<60)bad.push('logo above initial viewport');
    for(const href of ['https://wa.me/966506350457','https://www.linkedin.com/in/almohammdin/','tel:+966506350457','mailto:almohammdin@gmail.com']){
     const a=hero.querySelector('a[href="'+href+'"]');
     if(!a||!a.getClientRects().length)bad.push('initial contact missing '+href);
     if(a&&a.getBoundingClientRect().top>hero.querySelector('.hero-summary').getBoundingClientRect().top)bad.push('contact below introduction '+href);
    }
    for(const a of hero.querySelectorAll('.phone-btn')){
     const rect=a.getBoundingClientRect();
     if(rect.width<44||rect.height<44)bad.push('contact touch target');
    }
    if(hero.querySelector('.rcoa-badge').classList.contains('sr-only'))bad.push('professional role hidden');
    const intro=hero.querySelector('.hero-summary').textContent;
    if(!intro.includes(lang==='ar'?'هيكلة الصفقات، وبناء القرار المؤسسي':'deal structuring and institutional decision-making'))bad.push('introduction shortened');
    if(active.querySelectorAll('.expertise-group').length!==4||active.querySelectorAll('.tag').length!==16)bad.push('expertise groups or content lost');
    if(active.querySelectorAll('.impact-heading').length!==4)bad.push('impact headings lost');
    if(active.querySelectorAll('.exp-card').length!==5)bad.push('experience lost');
    if(active.querySelectorAll('.tool-card').length!==11)bad.push('tools lost');
    if(active.querySelectorAll('.tools-grid:not(.additional-tools) > .tool-card').length!==6)bad.push('featured count');
    if(active.querySelector('img[src*="hatta-logo"]'))bad.push('Hatta logo remains');
    for(const [family,sample] of [['Thmanyah Sans','الاستثمار'],['Thmanyah Serif Display','الاستثمار'],['El Messiri','Investment']]){
     if(!document.fonts.check('400 16px "'+family+'"',sample))bad.push('font '+family);
    }
    for(const image of active.querySelectorAll('img:not([loading=lazy])'))if(!image.complete||!image.naturalWidth)bad.push('broken image '+image.src);
    return bad;
   },{lang,width});
   errors.push(...issues.map(x=>lang+' '+width+': '+x));
   await page.screenshot({path:path.join(root,'review',lang+'-'+width+'.jpg'),type:'jpeg',animations:'disabled',quality:78});
   const scope=page.locator('#'+lang+'-content');
   await scope.locator('.download-menu summary').click();
   const links=await scope.locator('.download-options a').count();
   if(links!==(lang==='ar'?2:1))errors.push('Download options '+lang);
   await page.keyboard.press('Escape');
   if(await scope.locator('.download-menu').getAttribute('open')!==null)errors.push('Escape menu');
   await scope.locator('.more-tools summary').click();
   if(!await scope.locator('.additional-tools').isVisible())errors.push('Tools expansion '+lang);
   if(width===1440)await scope.locator('#expertise-'+lang).screenshot({path:path.join(root,'review','expertise-'+lang+'.jpg'),type:'jpeg',animations:'disabled',quality:80});
   if(width===1440)await scope.locator('#tools-'+lang).screenshot({path:path.join(root,'review','tools-'+lang+'.jpg'),type:'jpeg',animations:'disabled',quality:72});
  }
 }
 await page.setViewportSize({width:1200,height:630});
 const base=pathToFileURL(root+path.sep).href;
 await page.setContent('<!doctype html><html lang="ar" dir="rtl"><head><base href="'+base+'"><link rel="stylesheet" href="assets/fonts.css"><style>*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#061f56;color:white;display:flex;align-items:center;justify-content:center;text-align:center;position:relative}body:before{content:"";position:absolute;inset:34px;border:1px solid #b47a2d66;border-radius:24px}img{width:520px;height:220px;object-fit:contain;margin:0 auto 35px;display:block}h1{font:700 80px/1.4 "Thmanyah Serif Display";margin:0;font-feature-settings:"salt" 1}p{font:500 40px/1.5 "Thmanyah Sans";color:#e6d2ae;margin:14px 0 0;font-feature-settings:"salt" 1}</style></head><body><main><img src="naif-logo.svg" alt="نايف المحمدي"><h1>الاستثمار وتطوير الأعمال</h1><p>حوكمة مجالس الإدارة</p></main></body></html>',{waitUntil:'load'});
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
 await page.screenshot({path:path.join(root,'assets/social/naif-link-preview-v3.png')});
 await page.setViewportSize({width:320,height:168});
 await page.setContent('<html><head><base href="'+base+'"></head><body style="margin:0"><img src="assets/social/naif-link-preview-v3.png" style="width:320px;height:168px"></body></html>',{waitUntil:'load'});
 await page.evaluate(async()=>Promise.all([...document.images].map(i=>i.decode())));
 await page.screenshot({path:path.join(root,'review','og-small.jpg'),type:'jpeg',animations:'disabled',quality:90});
 await writeFile(path.join(root,'review','checks.json'),JSON.stringify({errors},null,2));
 if(errors.length)throw Error(errors.join('; '));
 console.log('Arabic and English at 1440, 390 and 320 pixels: layout, fonts, tools and download controls passed.');
}finally{await browser.close();}
