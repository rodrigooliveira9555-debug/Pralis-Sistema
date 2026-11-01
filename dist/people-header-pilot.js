(()=>{
 const boot=()=>{
  const view=document.getElementById('sector-view'),head=view?.querySelector('.head'),panel=view?.querySelector('.panel');
  if(!head||!panel)return;
  const footer=document.createElement('footer');footer.className='people-bottom-header';footer.setAttribute('aria-label','Controles de Gestão de Pessoas');
  const home=document.createElement('button');home.type='button';home.className='people-home-logo';home.title='Menu principal';home.setAttribute('aria-label','Menu principal');
  window.CicluzBeam?.attachSymbol(home);
  home.onclick=()=>document.dispatchEvent(new Event('cicluz-open-menu'));
  const tools=document.createElement('div');tools.className='people-bottom-tools';
  const searchBox=document.createElement('div');searchBox.className='people-bottom-search';searchBox.hidden=true;
  const search=document.createElement('input');search.type='search';search.placeholder='Buscar em Gestão de Pessoas';search.setAttribute('aria-label','Buscar em Gestão de Pessoas');searchBox.append(search);
  const extras=document.createElement('div');extras.className='people-bottom-extras';
  const control=(label,svg,handler)=>{const button=document.createElement('button');button.type='button';button.title=label;button.setAttribute('aria-label',label);button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+svg+'</svg>';button.onclick=handler;extras.append(button);return button};
  const records=()=>[...view.querySelectorAll('#sector-content .record-grid>.record')];
  const filter=()=>{const q=search.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');records().forEach(row=>{const text=row.textContent.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');row.hidden=!!q&&!text.includes(q)})};
  const searchToggle=control('Abrir busca','<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',()=>{searchBox.hidden=!searchBox.hidden;searchToggle.setAttribute('aria-pressed',String(!searchBox.hidden));searchToggle.setAttribute('aria-expanded',String(!searchBox.hidden));if(!searchBox.hidden)search.focus();else{search.value='';filter()}});
  search.oninput=filter;search.onkeydown=e=>{if(e.key==='Escape'){searchBox.hidden=true;search.value='';filter();searchToggle.setAttribute('aria-pressed','false');searchToggle.setAttribute('aria-expanded','false');searchToggle.focus()}};
  let savedOrder=null;
  const sort=control('Ordenar de A a Z','<path d="M3 17 6 5l3 12M4 13h4M14 5h7l-7 12h7M11 19l2 2 2-2"/>',()=>{
   const grid=view.querySelector('#sector-content .record-grid');if(!grid)return;
   if(savedOrder){savedOrder.filter(row=>row.parentElement===grid).forEach(row=>grid.append(row));savedOrder=null;sort.setAttribute('aria-pressed','false');sort.title='Ordenar de A a Z';sort.setAttribute('aria-label',sort.title)}
   else{savedOrder=[...grid.children];[...savedOrder].sort((a,b)=>(a.querySelector('b')?.textContent||a.textContent).localeCompare(b.querySelector('b')?.textContent||b.textContent,'pt-BR',{sensitivity:'base',numeric:true})).forEach(row=>grid.append(row));sort.setAttribute('aria-pressed','true');sort.title='Restaurar ordem anterior';sort.setAttribute('aria-label',sort.title)}
  });
  let allExpanded=false;
  const expand=control('Expandir tudo','<path d="m5 9 7-6 7 6M5 15l7 6 7-6"/>',()=>{allExpanded=!allExpanded;view.querySelectorAll('#sector-content details').forEach(el=>el.open=allExpanded);expand.setAttribute('aria-expanded',String(allExpanded));expand.title=allExpanded?'Recolher tudo':'Expandir tudo';expand.setAttribute('aria-label',expand.title)});
  const toggle=document.createElement('button');toggle.type='button';toggle.className='people-header-toggle';toggle.innerHTML='<svg viewBox="0 0 24 24"><path d="m5 15 7-7 7 7"/></svg>';
  let collapsed=false;
  function toggleState(){view.classList.toggle('people-top-hidden',collapsed);toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Mostrar cabeçalho superior':'Ocultar cabeçalho superior');toggle.title=toggle.getAttribute('aria-label')}
  toggle.onclick=()=>{collapsed=!collapsed;toggleState()};
  footer.append(home,searchBox,extras,tools,toggle);panel.append(footer);
  let previousActive=false,signature='';
  function sync(){
   const active=view.classList.contains('show')&&document.getElementById('sector-title')?.textContent.trim()==='Gestão de Pessoas';
   if(active!==previousActive){view.classList.toggle('people-header-pilot',active);collapsed=false;toggleState();previousActive=active;searchBox.hidden=true;search.value='';searchToggle.setAttribute('aria-pressed','false');searchToggle.setAttribute('aria-expanded','false');savedOrder=null;sort.setAttribute('aria-pressed','false');sort.title='Ordenar de A a Z';sort.setAttribute('aria-label',sort.title)}
   if(!active)return;
   expand.disabled=!view.querySelector('#sector-content details');
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
