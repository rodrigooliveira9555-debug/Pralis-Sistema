(()=>{
 const boot=()=>{
  const view=document.getElementById('sector-view'),head=view?.querySelector('.head'),panel=view?.querySelector('.panel');
  if(!head||!panel)return;
  const footer=document.createElement('footer');footer.className='people-bottom-header';footer.setAttribute('aria-label','Controles de Gestão de Pessoas');
  const home=document.createElement('button');home.type='button';home.className='people-home-logo';home.title='Menu principal';home.setAttribute('aria-label','Menu principal');
  window.CicluzBeam?.attachSymbol(home);
  home.onclick=()=>document.dispatchEvent(new Event('cicluz-open-menu'));
  const tools=document.createElement('div');tools.className='people-bottom-tools';
  const toggle=document.createElement('button');toggle.type='button';toggle.className='people-header-toggle';toggle.innerHTML='<svg viewBox="0 0 24 24"><path d="m5 15 7-7 7 7"/></svg>';
  let collapsed=false;
  function toggleState(){view.classList.toggle('people-top-hidden',collapsed);toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Mostrar cabeçalho superior':'Ocultar cabeçalho superior');toggle.title=toggle.getAttribute('aria-label')}
  toggle.onclick=()=>{collapsed=!collapsed;toggleState()};
  footer.append(home,tools,toggle);panel.append(footer);
  let previousActive=false,signature='';
  function sync(){
   const active=view.classList.contains('show')&&document.getElementById('sector-title')?.textContent.trim()==='Gestão de Pessoas';
   if(active!==previousActive){view.classList.toggle('people-header-pilot',active);collapsed=false;toggleState();previousActive=active}
   if(!active)return;
   const sources=[...head.querySelectorAll('.shortcut-actions button')].filter(b=>!b.matches('.mobile-menu-open')&&!b.hidden);
   const next=sources.map(b=>(b.getAttribute('aria-label')||b.title||b.textContent)+'|'+b.innerHTML).join(';;');
   if(next===signature)return;signature=next;
   tools.replaceChildren();
   sources.forEach(source=>{const button=document.createElement('button');button.type='button';button.className='people-footer-action';button.innerHTML=source.innerHTML;const label=source.getAttribute('aria-label')||source.title||source.textContent.trim();button.title=label;button.setAttribute('aria-label',label);button.onclick=()=>source.click();tools.append(button)});
  }
  let queued=false;
  new MutationObserver(records=>{
   if(records.every(r=>footer.contains(r.target)))return;
   if(queued)return;queued=true;queueMicrotask(()=>{queued=false;sync()});
  }).observe(view,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','hidden','aria-label']});
  sync();
 };
 if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',boot);else boot();
})();
