function switchLang(lang) {
 const selected=lang==='en'?'en':'ar';
 document.documentElement.lang=selected;document.documentElement.dir=selected==='ar'?'rtl':'ltr';
 document.body.lang=selected;document.body.dir=document.documentElement.dir;
 for(const code of ['ar','en']){
 document.getElementById(code+'-content').classList.toggle('active',selected===code);
 const button=document.getElementById('btn-'+code);
 button.classList.toggle('active',selected===code);button.setAttribute('aria-pressed',String(selected===code));
 }
 document.querySelectorAll('[data-ar][data-en]').forEach(el=>el.textContent=el.dataset[selected]);
 document.querySelectorAll('[data-target]').forEach(el=>el.href='#'+el.dataset.target+'-'+selected);
 document.querySelector('.top-label').href=selected==='ar'?'#top':'#top-en';
 document.querySelector('.page-nav').setAttribute('aria-label',selected==='ar'?'أقسام السيرة':'Profile sections');
 document.querySelectorAll('.download-menu[open]').forEach(el=>el.open=false);
}
document.addEventListener('click',event=>document.querySelectorAll('.download-menu[open]').forEach(menu=>{if(!menu.contains(event.target)||event.target.closest('.download-options a'))menu.open=false;}));
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.download-menu[open]').forEach(menu=>{menu.open=false;menu.querySelector('summary').focus();});});
window.addEventListener('beforeprint',()=>document.querySelectorAll('.more-tools').forEach(el=>{el.dataset.wasOpen=String(el.open);el.open=true;}));
window.addEventListener('afterprint',()=>document.querySelectorAll('.more-tools').forEach(el=>el.open=el.dataset.wasOpen==='true'));
