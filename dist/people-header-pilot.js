(()=>{
 const boot=()=>{
  const view=document.getElementById('sector-view'),head=view?.querySelector('.head'),panel=view?.querySelector('.panel');
  if(!head||!panel)return;
  const footer=document.createElement('footer');footer.className='people-bottom-header';footer.setAttribute('aria-label','Controles de Gestão de Pessoas');
  const home=document.createElement('button');home.type='button';home.className='people-home-logo';home.title='Menu principal';home.setAttribute('aria-label','Menu principal');
  window.CicluzBeam?.attachSymbol(home);
  home.onclick=()=>document.dispatchEvent(new Event('cicluz-open-menu'));
  const tools=document.createElement('div');tools.className='people-bottom-tools';tools.setAttribute('role','toolbar');tools.setAttribute('aria-label','Ações de Gestão de Pessoas');
  const searchBox=document.createElement('div');searchBox.className='people-bottom-search';searchBox.hidden=true;
  const search=document.createElement('input');search.type='search';search.placeholder='Buscar em Gestão de Pessoas';search.setAttribute('aria-label','Buscar em Gestão de Pessoas');searchBox.append(search);
  const extras=document.createElement('div');extras.className='people-bottom-extras';
  const control=(label,svg,handler)=>{const button=document.createElement('button');button.type='button';button.title=label;button.setAttribute('aria-label',label);button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+svg+'</svg>';button.onclick=handler;extras.append(button);return button};
  const records=()=>[...view.querySelectorAll('#sector-content .record-grid>.record')];
  const filter=()=>{const q=search.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');records().forEach(row=>{const text=row.textContent.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');row.hidden=!!q&&!text.includes(q)})};
  function searchState(){footer.classList.toggle('people-search-open',!searchBox.hidden)}
  const searchToggle=control('Abrir busca','<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',()=>{searchBox.hidden=!searchBox.hidden;searchState();searchToggle.setAttribute('aria-pressed',String(!searchBox.hidden));searchToggle.setAttribute('aria-expanded',String(!searchBox.hidden));if(!searchBox.hidden)search.focus();else{search.value='';filter()}});
  search.oninput=filter;search.onkeydown=e=>{if(e.key==='Escape'){searchBox.hidden=true;searchState();search.value='';filter();searchToggle.setAttribute('aria-pressed','false');searchToggle.setAttribute('aria-expanded','false');searchToggle.focus()}};
  window.CicluzBeam?.attachOutline(searchBox);
  searchToggle.classList.add('people-search-toggle');
  let savedOrder=null;
  const sort=control('Ordenar de A a Z','<path d="M3 17 6 5l3 12M4 13h4M14 5h7l-7 12h7M11 19l2 2 2-2"/>',()=>{
   const grid=view.querySelector('#sector-content .record-grid');if(!grid)return;
   if(savedOrder){savedOrder.filter(row=>row.parentElement===grid).forEach(row=>grid.append(row));savedOrder=null;sort.setAttribute('aria-pressed','false');sort.title='Ordenar de A a Z';sort.setAttribute('aria-label',sort.title)}
   else{savedOrder=[...grid.children];[...savedOrder].sort((a,b)=>(a.querySelector('b')?.textContent||a.textContent).localeCompare(b.querySelector('b')?.textContent||b.textContent,'pt-BR',{sensitivity:'base',numeric:true})).forEach(row=>grid.append(row));sort.setAttribute('aria-pressed','true');sort.title='Restaurar ordem anterior';sort.setAttribute('aria-label',sort.title)}
  });
  const sharedSort=createAlphabetizeButton(sort.onclick);sort.replaceChildren(...sharedSort.childNodes);sort.classList.add('sort-az');
  let allExpanded=false;
  const expand=control('Expandir tudo','<path d="m5 9 7-6 7 6M5 15l7 6 7-6"/>',()=>{allExpanded=!allExpanded;view.querySelectorAll('#sector-content details').forEach(el=>el.open=allExpanded);expand.setAttribute('aria-expanded',String(allExpanded));expand.title=allExpanded?'Recolher tudo':'Expandir tudo';expand.setAttribute('aria-label',expand.title)});
  const displayKey='cicluz-people-display-v1';let displayState={zoomed:false,compact:false,order:[]};
  try{const value=JSON.parse(localStorage.getItem(displayKey)||'null');if(value&&typeof value==='object')displayState={...displayState,...value}}catch{}
  function applyDisplay(){
   displayState.zoomed=false;view.classList.remove('people-content-zoomed');view.classList.toggle('people-content-narrow',!!displayState.compact);
   width.setAttribute('aria-pressed',String(!!displayState.compact));width.title=displayState.compact?'Expandir na horizontal — maior':'Recolher na horizontal — menor';width.setAttribute('aria-label',width.title);
  }
  const width=control('Recolher na horizontal — menor','<path d="m9 5-6 7 6 7M15 5l6 7-6 7"/>',()=>{displayState.compact=!displayState.compact;applyDisplay()});
  const status=document.createElement('span');status.className='people-save-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const save=control('Salvar','<path d="m5 12 4 4L19 6"/>',()=>{
   const native=head.querySelector('.header-save-circle');if(native){native.click();return}
   try{displayState.order=records().map(row=>row.dataset.target||row.querySelector('b')?.textContent||'');localStorage.setItem(displayKey,JSON.stringify(displayState));localStorage.setItem(preferencesKey,JSON.stringify(preferences));status.textContent='Configuração salva';setTimeout(()=>status.textContent='',2400)}catch{status.textContent='Não foi possível salvar a configuração'}
  });

  const announce=text=>{status.textContent=text;setTimeout(()=>{if(status.textContent===text)status.textContent=''},4000)};
  function metricControl(code,label,color,fields){
   let descending=true;
   const button=control('Organizar por + '+label+' / − '+label,'',()=>{
    const rows=records(),grid=rows[0]?.parentElement;
    const value=row=>{for(const field of fields){const raw=row.dataset[field];if(raw!==undefined&&raw!==''&&Number.isFinite(Number(raw)))return Number(raw)}return null};
    if(!rows.some(row=>value(row)!==null)){announce('Esta lista não possui valores de '+(code==='RES'?'resultado':code==='LUC'?'lucro':code==='VND'?'vendas':'compras')+' para ordenar.');return}
    rows.sort((a,b)=>{const av=value(a),bv=value(b);if(av===null)return bv===null?0:1;if(bv===null)return -1;return descending?bv-av:av-bv}).forEach(row=>grid.append(row));
    button.setAttribute('aria-pressed',String(descending));button.textContent=(descending?'−':'+')+code;descending=!descending;
   });
   button.textContent='+'+code;button.classList.add('people-metric-control');button.style.setProperty('--metric-color',color);
   return button;
  }
  const sold=metricControl('VND','vendido','#eab308',['vnd','sales','sold','vendido']);
  const bought=metricControl('COM','comprado','#22c55e',['com','purchases','bought','comprado']);
  const profit=metricControl('LUC','lucro','#2563eb',['luc','profit','lucro']);
  const result=metricControl('RES','resultado','#7c3aed',['res','result','resultado']);
  const print=control('Imprimir','<path d="M7 8V3h10v5M7 17H3V9h18v8h-4M7 13h10v8H7z"/><path d="M17 11h1"/>',()=>window.print());
  const exportConfig=control('Exportar configuração','<path d="M12 16V3m-4 4 4-4 4 4M4 14v7h16v-7"/>',()=>{
   const payload={format:'cicluz-people-toolbar',version:1,preferences,display:{compact:!!displayState.compact,order:records().map(row=>row.dataset.target||row.querySelector('b')?.textContent||'')},buttonOrder};
   const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='cicluz-configuracao-cabecalho.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('Configuração exportada');
  });
  const importFile=document.createElement('input');importFile.type='file';importFile.accept='application/json,.json';importFile.hidden=true;importFile.setAttribute('aria-label','Arquivo de configuração do cabeçalho');
  const importConfig=control('Importar configuração','<path d="M12 3v13m-4-4 4 4 4-4M4 14v7h16v-7"/>',()=>importFile.click());
  importFile.onchange=async()=>{
   const file=importFile.files[0];if(!file)return;
   try{
    if(file.size>100000)throw Error('Arquivo de configuração muito grande');
    const data=JSON.parse(await file.text());if(data.format!=='cicluz-people-toolbar'||data.version!==1)throw Error('Arquivo de configuração incompatível');
    preferences={};for(const key of controls.keys())if(typeof data.preferences?.[key]==='boolean')preferences[key]=data.preferences[key];
    buttonOrder=Array.isArray(data.buttonOrder)?[...new Set(data.buttonOrder.filter(key=>typeof key==='string'&&controls.has(key)))]:[];
    displayState={zoomed:false,compact:data.display?.compact===true,order:Array.isArray(data.display?.order)?data.display.order.filter(key=>typeof key==='string').slice(0,1000):[]};
    localStorage.setItem(preferencesKey,JSON.stringify(preferences));localStorage.setItem(displayKey,JSON.stringify(displayState));persistButtonOrder();applyDisplay();applyPreferences();
    const rows=records(),grid=rows[0]?.parentElement;displayState.order.forEach(key=>{const row=rows.find(r=>(r.dataset.target||r.querySelector('b')?.textContent||'')===key);if(row&&grid)grid.append(row)});
    if(!chooser.hidden)renderChoices();announce('Configuração importada');
   }catch(error){announce(error.message||'Não foi possível importar a configuração')}
   finally{importFile.value=''}
  };
  applyDisplay();
  const toggle=document.createElement('button');toggle.type='button';toggle.className='people-header-toggle';toggle.innerHTML='<svg viewBox="0 0 24 24"><path d="m5 15 7-7 7 7"/></svg>';
  let collapsed=false;
  function toggleState(){view.classList.toggle('people-top-hidden',collapsed);toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Mostrar cabeçalho superior':'Ocultar cabeçalho superior');toggle.title=toggle.getAttribute('aria-label')}
  toggle.onclick=()=>{collapsed=!collapsed;toggleState()};
  const preferencesKey='cicluz-people-footer-buttons-v1';let preferences={};
  try{const value=JSON.parse(localStorage.getItem(preferencesKey)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))preferences=value}catch{}
  const controls=new Map([['search',{button:searchToggle,label:'Buscar'}],['sort',{button:sort,label:'A/Z'}],['expand',{button:expand,label:'Expandir / recolher tudo'}],['sold',{button:sold,label:'Organizar por + vendido / − vendido'}],['bought',{button:bought,label:'Organizar por + comprado / − comprado'}],['profit',{button:profit,label:'Organizar por + lucro / − lucro'}],['result',{button:result,label:'Organizar por + resultado / − resultado'}],['print',{button:print,label:'Imprimir'}],['import',{button:importConfig,label:'Importar configuração'}],['export',{button:exportConfig,label:'Exportar configuração'}],['width',{button:width,label:'Maior / menor na horizontal'}],['save',{button:save,label:'Salvar'}]]);
  const chooser=document.createElement('div');chooser.className='people-toolbar-options';chooser.id='people-toolbar-options';chooser.hidden=true;chooser.inert=true;chooser.setAttribute('role','group');chooser.setAttribute('aria-label','Botões do cabeçalho inferior');
  const more=document.createElement('button');more.type='button';more.className='people-toolbar-more';more.title='Personalizar botões';more.setAttribute('aria-label',more.title);more.setAttribute('aria-expanded','false');more.setAttribute('aria-pressed','false');more.setAttribute('aria-controls',chooser.id);more.innerHTML='<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>';
  function setChooserOpen(open){chooser.hidden=!open;chooser.inert=!open;more.setAttribute('aria-expanded',String(open));more.setAttribute('aria-pressed',String(open));if(open)renderChoices()}
  function closeChooser(){setChooserOpen(false)}

  const orderKey='cicluz-people-footer-order-v1';let buttonOrder=[];
  try{const value=JSON.parse(localStorage.getItem(orderKey)||'[]');if(Array.isArray(value))buttonOrder=value.filter(key=>typeof key==='string')}catch{}
  function persistButtonOrder(){try{localStorage.setItem(orderKey,JSON.stringify(buttonOrder))}catch{}}
  function orderedControls(){const keys=[...new Set([...buttonOrder,...controls.keys()])];return keys.filter(key=>controls.has(key)).map(key=>[key,controls.get(key)])}
  function applyPreferences(){
   for(const [key,{button}] of orderedControls()){
    button.hidden=preferences[key]===false;button.dataset.controlKey=key;
    if(key==='search')continue;else tools.append(button);
   }
   if(searchToggle.hidden&&!searchBox.hidden){searchBox.hidden=true;search.value='';filter();searchToggle.setAttribute('aria-expanded','false');searchToggle.setAttribute('aria-pressed','false')}
   tools.before(searchToggle,searchBox);searchState();
  }
  let dragging=null;
  let chooserCompact=false;
  try{chooserCompact=localStorage.getItem('cicluz-people-chooser-compact-v1')==='true'}catch{}
  function moveControl(key,target,before=true){
   const keys=orderedControls().map(([id])=>id);if(key===target)return;
   const from=keys.indexOf(key);if(from<0)return;keys.splice(from,1);const at=keys.indexOf(target);if(at<0)return;keys.splice(at+(before?0:1),0,key);buttonOrder=keys;persistButtonOrder();applyPreferences();renderChoices();
  }
  function renderChoices(){
   chooser.replaceChildren();chooser.classList.toggle('people-options-compact',chooserCompact);
   const heading=document.createElement('div');heading.className='people-options-heading';
   const title=document.createElement('b');title.textContent='Botões do cabeçalho inferior';
   const headingIcon=document.createElement('span');headingIcon.className='people-options-heading-icon';headingIcon.setAttribute('aria-hidden','true');headingIcon.innerHTML=more.innerHTML;
   const resize=document.createElement('button');resize.type='button';resize.className='people-options-resize';resize.setAttribute('aria-expanded',String(!chooserCompact));resize.setAttribute('aria-label',chooserCompact?'Expandir menu lateralmente':'Contrair menu para somente ícones');resize.title=resize.getAttribute('aria-label');resize.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(chooserCompact?'m15 5-7 7 7 7':'m9 5 7 7-7 7')+'"/></svg>';
   resize.onclick=()=>{chooserCompact=!chooserCompact;try{localStorage.setItem('cicluz-people-chooser-compact-v1',String(chooserCompact))}catch{}renderChoices();chooser.querySelector('.people-options-resize').focus()};
   heading.append(headingIcon,title,resize);const inner=document.createElement('div');inner.className='people-options-inner';chooser.append(heading,inner);
   for(const [key,{button,label}] of orderedControls()){
    const row=document.createElement('div');row.className='people-toolbar-row';row.dataset.choiceKey=key;
    const handle=document.createElement('button');handle.type='button';handle.className='people-order-handle';handle.draggable=true;handle.title='Arraste para mover ou use as setas para cima e para baixo';handle.setAttribute('aria-label','Mover '+label);handle.innerHTML='<svg viewBox="0 0 12 20"><circle cx="3" cy="4" r="1"/><circle cx="9" cy="4" r="1"/><circle cx="3" cy="10" r="1"/><circle cx="9" cy="10" r="1"/><circle cx="3" cy="16" r="1"/><circle cx="9" cy="16" r="1"/></svg>';
    handle.ondragstart=e=>{dragging=key;e.dataTransfer.setData('text/plain',key)};handle.ondragend=()=>dragging=null;
    row.ondragover=e=>{if(dragging)e.preventDefault()};row.ondrop=e=>{e.preventDefault();if(dragging)moveControl(dragging,key,e.clientY<row.getBoundingClientRect().top+row.offsetHeight/2);dragging=null};
    handle.onkeydown=e=>{if(!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const keys=orderedControls().map(([id])=>id),index=keys.indexOf(key),target=keys[index+(e.key==='ArrowUp'?-1:1)];if(target){moveControl(key,target,e.key==='ArrowUp');chooser.querySelector('[data-choice-key="'+key+'"] .people-order-handle')?.focus()}};
    let touchStart=null;
    handle.onpointerdown=e=>{if(e.pointerType!=='touch')return;touchStart={y:e.clientY,id:e.pointerId};handle.setPointerCapture(e.pointerId)};
    handle.onpointerup=e=>{if(!touchStart)return;const delta=e.clientY-touchStart.y;touchStart=null;const target=[...chooser.querySelectorAll('.people-toolbar-row')].find(el=>{const rect=el.getBoundingClientRect();return e.clientY>=rect.top&&e.clientY<=rect.bottom});if(Math.abs(delta)>8&&target)moveControl(key,target.dataset.choiceKey,delta<0)};
    const action=document.createElement('button');action.type='button';action.className='people-toolbar-run';action.setAttribute('aria-label','Executar '+label);action.disabled=button.disabled;
    const symbol=document.createElement('span');symbol.className='people-option-symbol';symbol.innerHTML=button.innerHTML;symbol.style.setProperty('--metric-color',button.style.getPropertyValue('--metric-color'));if(button.classList.contains('people-metric-control'))symbol.classList.add('people-metric-control');
    const name=document.createElement('span');name.textContent=label;name.className='people-option-name';action.append(symbol,name);action.onclick=()=>{closeChooser();button.click()};
    const visibility=document.createElement('button');visibility.type='button';visibility.className='people-toolbar-visibility';visibility.setAttribute('aria-label','Exibir '+label);visibility.setAttribute('aria-pressed',String(preferences[key]!==false));visibility.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';visibility.onclick=()=>{preferences[key]=preferences[key]===false;try{localStorage.setItem(preferencesKey,JSON.stringify(preferences))}catch{}applyPreferences();visibility.setAttribute('aria-pressed',String(preferences[key]!==false));row.classList.toggle('people-option-hidden',preferences[key]===false);row.classList.toggle('people-option-pinned',preferences[key]!==false)};
    row.classList.toggle('people-option-hidden',preferences[key]===false);row.classList.toggle('people-option-pinned',preferences[key]!==false);action.title=label;row.append(handle,action,visibility);inner.append(row);
   }
  }
  more.onclick=()=>setChooserOpen(chooser.hidden);
  document.addEventListener('pointerdown',e=>{if(!chooser.hidden&&!chooser.contains(e.target)&&!more.contains(e.target))closeChooser()});
  footer.addEventListener('keydown',e=>{if(e.key==='Escape'&&!chooser.hidden){closeChooser();more.focus()}});
  footer.append(home,searchBox,tools,more,toggle,chooser,status,importFile);panel.append(footer);
  footer.addEventListener('click',event=>{const button=event.target.closest('button');if(!button||button.matches('.people-toolbar-choice,.people-toolbar-more'))return;button.classList.add('people-click-feedback');setTimeout(()=>button.classList.remove('people-click-feedback'),220)});
  const edge=document.createElementNS('http://www.w3.org/2000/svg','svg');edge.setAttribute('class','people-footer-edge');edge.setAttribute('aria-hidden','true');const edgePath=document.createElementNS(edge.namespaceURI,'path');edge.append(edgePath);footer.prepend(edge);
  new ResizeObserver(()=>{const w=footer.clientWidth;edge.setAttribute('viewBox','0 0 '+w+' 21');edgePath.setAttribute('d','M .5 .5 A 19.5 19.5 0 0 0 20 20 H '+(w-20)+' A 19.5 19.5 0 0 0 '+(w-.5)+' .5')}).observe(footer);
  applyPreferences();
  let previousActive=false,signature='';
  function sync(){
   const active=view.classList.contains('show')&&document.getElementById('sector-title')?.textContent.trim()==='Gestão de Pessoas';
   if(active!==previousActive){view.classList.toggle('people-header-pilot',active);collapsed=false;toggleState();previousActive=active;closeChooser();searchBox.hidden=true;searchState();search.value='';searchToggle.setAttribute('aria-pressed','false');searchToggle.setAttribute('aria-expanded','false');savedOrder=null;sort.setAttribute('aria-pressed','false');sort.title='Ordenar de A a Z';sort.setAttribute('aria-label',sort.title);if(active){applyDisplay();const rows=records(),grid=rows[0]?.parentElement;for(const key of displayState.order||[]){const row=rows.find(r=>(r.dataset.target||r.querySelector('b')?.textContent||'')===key);if(row&&grid)grid.append(row)}}}
   if(!active)return;
   expand.disabled=!view.querySelector('#sector-content details');
   const sources=[...head.querySelectorAll('.shortcut-actions button')].filter(b=>!b.matches('.mobile-menu-open')&&!b.hidden);
   const next=sources.map(b=>(b.getAttribute('aria-label')||b.title||b.textContent)+'|'+b.innerHTML).join(';;');
   if(next===signature)return;signature=next;
   for(const key of [...controls.keys()])if(key.startsWith('action:'))controls.delete(key);tools.replaceChildren();
   sources.forEach(source=>{const button=document.createElement('button');button.type='button';button.className='people-footer-action';button.innerHTML=source.classList.contains('header-save-circle')?'<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>':source.innerHTML;const label=source.classList.contains('header-save-circle')?'Salvar':source.getAttribute('aria-label')||source.title||source.textContent.trim();button.title=label;button.setAttribute('aria-label',label);button.onclick=()=>source.click();tools.append(button);controls.set('action:'+(source.id||label),{button,label})});applyPreferences();if(!chooser.hidden)renderChoices();
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
