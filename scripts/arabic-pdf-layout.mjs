import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const escape = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inline = text => escape(text).replace(/\+?\d[\d,]*(?:\.\d+)?%/g, value => `<bdi dir="ltr">${value}</bdi>`);
const p = text => `<p>${inline(text)}</p>`;
const list = items => `<ul>${items.map(item => `<li>${inline(item)}</li>`).join('')}</ul>`;
const section = (title, body) => `<section><h2>${escape(title)}</h2>${body}</section>`;
const link = (url, label) => `<a href="${escape(url)}">${escape(label)}</a>`;

// Keep the detailed PDF tied to the live Arabic content. Fail when the site's
// structure changes instead of silently leaving new experience or tools out.
async function readArabicContent(page, projectDir) {
  await page.goto(pathToFileURL(path.join(projectDir, 'index.html')).href, {waitUntil:'domcontentloaded'});
  const data = await page.evaluate(() => {
    const root = document.querySelector('#ar-content');
    const text = (node, selector) => node.querySelector(selector)?.textContent.replace(/\s+/g, ' ').trim() ?? '';
    const all = (node, selector) => [...node.querySelectorAll(selector)];
    return {
      name: text(root, 'h1'), role: text(root, '.rcoa-badge'), title: text(root, '.header-title'),
      intro: text(root, '.hook-box p'), paths: all(root, '.hook-box li').map(x => x.textContent.trim()),
      impact: all(root, '.impact-card').map(x => ({number:text(x,'.impact-num'),label:text(x,'.impact-label')})),
      boards: all(root, '.board-card').map(x => ({role:text(x,'.board-role'),entity:text(x,'.board-entity'),since:text(x,'.board-since'),image:x.querySelector('.board-logo').getAttribute('src')})),
      experience: all(root, '.exp-card').map(x => ({title:text(x,'.job-title'),company:text(x,'.company-name'),period:text(x,'.job-period'),achievements:all(x,'.achievement').map(y=>y.textContent.trim().replace(/^✓\s*/,'')),bullets:all(x,'.desc li').map(y=>y.textContent.trim())})),
      expertise: all(root,'.tag').map(x=>x.textContent.trim()),
      toolsIntro: text(root,'.tools-intro'),
      tools: all(root,'.tool-card').map(x=>({title:text(x,'.tool-title'),description:text(x,'.tool-desc'),url:x.querySelector('a').href})),
      journey: {title:text(root,'.knowledge-product-title'),description:text(root,'.knowledge-product-desc'),note:text(root,'.knowledge-product-note'),url:root.querySelector('.knowledge-product-media').href},
      certificates: all(root,'.cert-pro').map(x=>({title:text(x,'.cert-title'),institution:text(x,'.cert-inst'),description:text(x,'.cert-desc')})),
      education: {degree:text(root,'.degree'),university:text(root,'.university')},
      training: all(root,'.cert-item').map(x=>x.textContent.trim()),
      sections: all(root,'.section').map(x=>text(x,'.section-title')),
    };
  });
  for (const [key, count] of Object.entries({impact:4,boards:3,experience:5,expertise:16,tools:11,certificates:4,training:7,sections:8})) {
    if (data[key].length !== count) throw new Error(`Arabic PDF layout needs review: ${key} has ${data[key].length}, expected ${count}`);
  }
  data.experience.forEach(job => { job.title = job.title.replace('مؤسس والرئيس التنفيذي', 'المؤسس والرئيس التنفيذي'); });
  data.impact[0].number = '132+';
  data.impact[0].label = data.impact[0].label.replace(/^ريال/, 'مليون ريال');
  data.impact[2].number = '100+';
  data.impact[2].label = data.impact[2].label.replace(/^ريال/, 'مليون ريال');
  return data;
}

function identity(data, compact = false) {
  return `<header class="identity ${compact ? 'compact-identity' : ''}"><div class="identity-copy"><div class="eyebrow">${escape(data.role)}</div><h1>${escape(data.name)}</h1><p class="headline">${escape(data.title)}</p></div>${compact ? '' : '<img class="portrait" src="assets/naif-photo-cutout.webp" alt="نايف المحمدي">'}</header>
  <div class="contact"><span>جدة، المملكة العربية السعودية</span><a dir="ltr" href="tel:+966506350457">0506350457</a><a dir="ltr" href="mailto:almohammdin@gmail.com">almohammdin@gmail.com</a></div>
  <div class="contact-links">${link('https://www.linkedin.com/in/almohammdin/','لينكدإن')}<span> | </span>${link('https://wa.me/966506350457','واتساب')}<span> | </span>${link('https://almohammdin.github.io/mycv/','السيرة المهنية والأدوات التفاعلية')}</div>`;
}

function experience(item) {
  return `<article class="experience"><div class="job-heading"><div><h3>${escape(item.title)}</h3><p class="company">${escape(item.company)}</p></div><span class="period">${escape(item.period)}</span></div>${item.achievements.map(a=>`<p class="achievement">${inline(a)}</p>`).join('')}${list(item.bullets)}</article>`;
}
function tools(items) {
  return `<div class="tools">${items.map(t=>`<article class="tool"><h3>${link(t.url,t.title)}</h3>${p(t.description)}<a class="tool-link" href="${escape(t.url)}">استعراض الأداة ↗</a></article>`).join('')}</div>`;
}
function boards(data) {
  return `<div class="boards">${data.boards.map(b=>`<article class="board"><img src="${escape(b.image)}" alt=""><div><h3>${escape(b.entity)}</h3>${p(b.role)}<p class="muted">${escape(b.since)}</p></div></article>`).join('')}</div>`;
}

const institutions = ['كلية إس دي إيه بوكوني للإدارة | إيطاليا', 'الأكاديمية الإنسانية بجامعة هارفارد', 'جامعة ولاية نيويورك | عبر كورسيرا', ''];
const training = [
  'الابتكار في الحكومة | مركز محمد بن راشد للحكومة الذكية، دبي',
  'بناء استجابة أفضل | جامعة هارفارد',
  'البرنامج التنفيذي الدولي للمشروعات الصغيرة والمتوسطة | جامعة بوكوني',
  'فاعلية مجالس إدارة الشركات العائلية | الأكاديمية المالية',
  'أخصائي تنمية مستدامة | القطاع الخيري غير الربحي',
  'أخصائي جودة مؤسسية | القطاع غير الربحي',
  'عضو | شبكة المسؤولية الاجتماعية الإقليمية',
];

function fullPages(d) {
  return [
    {title:'الملف التنفيذي', html:identity(d)+section('قيادة الاستثمار من الفرصة إلى العائد والأثر',p(d.intro))+section('مسارات صناعة القيمة',list(d.paths))+section('أبرز مؤشرات الأثر',`<div class="impact">${d.impact.map(x=>`<article><strong dir="ltr">${escape(x.number)}</strong>${p(x.label)}</article>`).join('')}</div>`)},
    {title:'المناصب الحالية والخبرة المهنية', html:section(d.sections[0],boards(d))+section('الخبرة المهنية | الأدوار الحالية',d.experience.slice(0,2).map(experience).join(''))},
    {title:'الخبرة المهنية والإنجازات', html:section('الخبرة المهنية | الاستثمار والتحول المؤسسي',d.experience.slice(2).map(experience).join(''))},
    {title:'مناطق الخبرة والأدوات التفاعلية', html:section(d.sections[2],`<ul class="expertise">${d.expertise.map(x=>`<li>${escape(x)}</li>`).join('')}</ul>`)+section(d.sections[3],p(d.toolsIntro)+tools(d.tools.slice(0,6)))},
    {title:'الأدوات التفاعلية والرحلات المعرفية', html:section('أدوات نايف التفاعلية | تتمة',tools(d.tools.slice(6)))+section(d.sections[4],`<article class="journey"><h3>${escape(d.journey.title)}</h3>${p(d.journey.description)}${p(d.journey.note.replace('الرحلاتسبق','الرحلات: سبق').replace('نموذج لشكل','نموذجًا لشكل'))}<a href="${escape(d.journey.url)}">استعراض نموذج رحلة سيئول المعرفية ↗</a></article>`)},
    {title:'التأهيل العلمي والتطوير المهني', html:section(d.sections[5],d.certificates.map((c,i)=>`<article class="certificate"><h3>${escape(c.title)}</h3>${institutions[i]?`<p class="institution">${escape(institutions[i])}</p>`:''}${p(c.description)}</article>`).join(''))+section(d.sections[6],`<article class="education"><h3>${escape(d.education.degree)}</h3>${p(d.education.university)}</article>`)+section(d.sections[7],list(training))},
  ];
}

function shortPages(d) {
  const concise = [
    ['تأسيس ممارسة استشارية في الاستثمار والحوكمة والتحول لخدمة الشركات العائلية والتجارية؛ دعم مجالس الإدارة في تقييم الفرص والصفقات وبناء أطر الصلاحيات ومؤشرات الأداء.'],
    ['الإسهام في تأسيس كيان مهني يمثل مصالح قطاع يضم قرابة 6,500 من ملاك المطاعم والمقاهي، وتطوير الحوكمة والشراكات ومنتدى الضيافة والرحلات المعرفية.'],
    ['تقديم المشورة في الحوكمة والمخاطر وإعادة الهيكلة، وقيادة برنامج جاهزية مدارس الأقصى لمدة 18 شهرًا بأثر تقديري تجاوز 132 مليون ريال في قيمة الشركة.', 'إعادة تموضع أصول وقفية للاستثمار طويل الأجل، ومتابعة الملكيات العائلية والإسهام في الميثاق العائلي وأطر الحوكمة.'],
    ['تأسيس وتطوير شركة استثمار وتشغيل على مدى 15 عامًا، وقيادة تفاوض اندماج لسلسلة مقاهٍ تضم أكثر من 60 فرعًا داخل وخارج المملكة، والإشراف على ملف استحواذ استراتيجي.'],
    ['إدارة وحوكمة محفظة استثمارية تجاوزت 100 مليون ريال؛ نمو الإيرادات بنسبة 600% وقاعدة المشتركين بنسبة 1,700%، مع تقييم الفرص وتطوير برامج التمويل المستدام.'],
  ];
  const jobs = d.experience.map((job,i)=>experience({...job,achievements:[],bullets:concise[i]}));
  const summary = 'قيادي ومستشار بخبرة تنفيذية واستشارية تتجاوز 25 عامًا في الاستثمار وتطوير الأصول وهيكلة الصفقات وحوكمة مجالس الإدارة. يساند القيادات في تحويل الفرص إلى مبادرات قابلة للتنفيذ والقياس، تربط العائد المالي بالأثر المؤسسي المستدام.';
  return [
    {title:'الخبرة التنفيذية والاستشارية',html:identity(d,true)+section('الملخص المهني',p(summary))+section('الخبرة المهنية المختارة',jobs.slice(0,3).join(''))+section('عضويات إضافية',p('عضو مجلس الأعمال السعودي البيروفي | اتحاد الغرف السعودية'))},
    {title:'الإنجازات والتأهيل ومناطق الخبرة',html:section('الخبرة المهنية المختارة | تتمة',jobs.slice(3).join(''))+section('مناطق الخبرة',p('الاستثمار وتطوير الأصول، هيكلة الصفقات والشراكات، الاندماج والاستحواذ، التحليل المالي والتقييم، حوكمة مجالس الإدارة والشركات العائلية، إدارة المخاطر، التحول وإعادة الهيكلة، وقياس العائد والأثر.'))+section('المؤهل العلمي والشهادات المهنية',`<p><strong>${escape(d.education.degree)}</strong> | ${escape(d.education.university)}</p>`+list(d.certificates.map((c,i)=>`${c.title}${institutions[i]?' | '+institutions[i]:''}`)))+section('تطوير مهني وعضويات',p('فاعلية مجالس إدارة الشركات العائلية | الأكاديمية المالية؛ الابتكار في الحكومة | مركز محمد بن راشد للحكومة الذكية؛ تنمية مستدامة وجودة مؤسسية في القطاع غير الربحي؛ عضو شبكة المسؤولية الاجتماعية الإقليمية.'))+section('الأدوات الرقمية والرحلات المعرفية',p('تطوير 11 أداة تفاعلية في أعمال المجالس والشركات العائلية والتوسع والصفقات والمخاطر والامتثال والتقييم والنمو والشراكات والصلاحيات. تصميم رحلات معرفية مهنية إلى المعارض والأسواق الدولية، تشمل تجارب في الصين وكوريا.')+`<p>${link('https://almohammdin.github.io/mycv/','استعراض الأدوات والتفاصيل في السيرة الكاملة ↗')}</p>`)},
  ];
}

export async function generateArabicPdfs(browser, projectDir, addLocalFonts) {
  const page = await browser.newPage({viewport:{width:1000,height:1400}});
  try {
    const data = await readArabicContent(page, projectDir);
    const css = await readFile(path.join(projectDir,'assets/arabic-pdf.css'),'utf8');
    for (const variant of ['full','short']) {
      const pages = variant === 'full' ? fullPages(data) : shortPages(data);
      const label = variant === 'full' ? 'السيرة المهنية الكاملة' : 'السيرة المهنية المختصرة';
      const html = `<!doctype html><html lang="ar-SA" dir="rtl"><head><meta charset="utf-8"><base href="${pathToFileURL(projectDir + path.sep).href}"><title>نايف المحمدي | ${label}</title><style>${css}</style></head><body class="${variant}">${pages.map((s,i)=>`<article class="sheet"><div class="running-head"><span>نايف المحمدي</span><span>${escape(s.title)}</span></div><main>${s.html}</main><footer><a href="https://almohammdin.github.io/mycv/" dir="ltr">almohammdin.github.io/mycv</a><span>${label}</span><span>الصفحة ${i+1} من ${pages.length}</span></footer></article>`).join('')}</body></html>`;
      await page.setContent(html,{waitUntil:'load'});
      await addLocalFonts(page);
      await page.emulateMedia({media:'print'});
      await page.evaluate(async()=>{
        await Promise.all([400,500,600,700].map(w=>document.fonts.load(`${w} 16px "IBM Plex Sans Arabic"`,'نايف المحمدي الاستثمار')));
        await document.fonts.ready;
        await Promise.all([...document.images].map(img=>img.decode()));
      });
      const errors = await page.evaluate(()=>{
        const problems=[];
        if(document.querySelectorAll('h1').length!==1) problems.push('Expected one document title');
        for(const [index,sheet] of [...document.querySelectorAll('.sheet')].entries()) {
          const main=sheet.querySelector('main').getBoundingClientRect();
          const foot=sheet.querySelector('footer').getBoundingClientRect();
          const bounds=sheet.getBoundingClientRect();
          if(main.bottom>foot.top-10) problems.push(`Page ${index+1}: content reaches footer`);
          for(const el of sheet.querySelectorAll('main *')) {
            const r=el.getBoundingClientRect();
            if(r.width && (r.left < bounds.left-1 || r.right > bounds.right+1)) problems.push(`Page ${index+1}: horizontal overflow in ${el.className || el.tagName}`);
          }
        }
        if(/[\u202a-\u202e\u2066-\u2069\u200e\u200f\u061c]/u.test(document.body.textContent)) problems.push('Unexpected bidi controls');
        return problems;
      });
      if(errors.length) throw new Error(`${variant} Arabic PDF validation failed: ${errors.join('; ')}`);
      const filename = variant === 'full' ? 'Naif-Almohammdi-CV-AR.pdf' : 'Naif-Almohammdi-CV-AR-Short.pdf';
      await page.pdf({path:path.join(projectDir,filename),format:'A4',preferCSSPageSize:true,printBackground:true,tagged:true,outline:true,displayHeaderFooter:false});
      console.log(`${filename}: ${pages.length} designed pages; RTL, fonts and overflow checks passed`);
      // Optional review source, outside the website by default.
      if(process.env.PDF_REVIEW_DIR) {
        await writeFile(path.join(process.env.PDF_REVIEW_DIR,`${variant}.html`),await page.content());
        await page.screenshot({path:path.join(process.env.PDF_REVIEW_DIR,`${variant}.png`),fullPage:true});
      }
    }
  } finally { await page.close(); }
}
