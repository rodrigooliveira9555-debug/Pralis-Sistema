(()=>{
 const mounted=new WeakMap();let pinLogoId=0;
 const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
 const isVisible=view=>view.matches('dialog')?view.open:view.matches('.dialog')?view.parentElement.classList.contains('show'):view.classList.contains('show');
 function mount(view){
  const panel=view.querySelector(':scope>.panel'),head=panel?.querySelector(':scope>.head'),content=panel?.querySelector(':scope>.content');
  if(!head||!panel||!content||mounted.has(view))return;
  view.classList.add('app-screen-shell');
  const title=()=>head.querySelector('h2,h3')?.textContent.trim()||'Tela';
  const screenKey=()=>(view.matches('dialog,.dialog')?'dialog':view.id)+'|'+title()+'|'+(head.querySelector('.header-identity p')?.textContent.trim()||'');
  let context='',nativeSearch=null,nativeSearchButton=null,nativeSort=null,nativeExpand=null,nativeBack=null,nativeClose=null;
  const adoptedInputs=new Map(),profileSearchHosts=new WeakMap(),proxies=new Map();
  let sortDirection=null,sortMode=0,originalOrders=new WeakMap();
  const rowsFor=container=>[...container.children].filter(n=>n.matches('.record,.financial-group,.job-item,.salary-row,.location-node,.account-list-row,tr,.list-row'));
  const rowContainers=()=>[...content.querySelectorAll('.record-grid,.financial-subgroups,.jobs-list,#jobs-list,#salary-list,.location-tree,.location-children,tbody')].filter(c=>!c.closest('dialog'));
  const rowName=row=>row.querySelector('.job-copy b,.job-main b,.location-name,b,td')?.textContent||row.textContent;
  const rowId=row=>row.dataset.target||row.dataset.id||row.dataset.menuItemKey||row.querySelector('[data-id]')?.dataset.id||rowName(row);
  function rememberOriginalRows(){for(const container of rowContainers()){let order=originalOrders.get(container);if(!order){order=new Map();originalOrders.set(container,order)}for(const row of rowsFor(container))if(!order.has(rowId(row)))order.set(rowId(row),order.size)}}
  function sortRows(desc){rememberOriginalRows();for(const container of rowContainers()){const rows=rowsFor(container);if(rows.length<2)continue;const order=originalOrders.get(container);const sorted=[...rows].sort((a,b)=>desc===null?(order.get(rowId(a))-order.get(rowId(b))):Number(a.matches('.account-inactive')||!!a.querySelector('.account-inactive'))-Number(b.matches('.account-inactive')||!!b.querySelector('.account-inactive'))||((desc?-1:1)*rowName(a).localeCompare(rowName(b),'pt-BR',{numeric:true,sensitivity:'base'})));if(rows.some((r,i)=>r!==sorted[i]))sorted.forEach(r=>container.append(r))}}


  const footer=document.createElement('footer');footer.className='people-bottom-header';footer.setAttribute('aria-label','Controles de '+title());
  const home=document.createElement('button');home.type='button';home.className='people-home-logo';home.title='Mostrar menu rápido';home.setAttribute('aria-label',home.title);home.setAttribute('aria-expanded','false');
  window.CicluzBeam?.attachSymbol(home);
  const goHome=()=>{if(view.matches('dialog'))view.close();else if(view.matches('.dialog'))view.parentElement.classList.remove('show');document.dispatchEvent(new Event('cicluz-open-menu'))};
  const left=document.createElement('div');left.className='people-footer-left';left.setAttribute('role','toolbar');left.setAttribute('aria-label','Navegação e filtros');
  const right=document.createElement('div');right.className='people-footer-right';right.setAttribute('role','toolbar');right.setAttribute('aria-label','Ações e cabeçalho');
  const tools=document.createElement('div');tools.className='people-bottom-tools';tools.setAttribute('role','toolbar');tools.setAttribute('aria-label','Menu rápido de '+title());tools.id='quick-menu-'+(view.id||'dialog');tools.hidden=true;home.setAttribute('aria-controls',tools.id);
  const searchBox=document.createElement('div');searchBox.className='people-bottom-search';searchBox.hidden=true;
  const search=document.createElement('input');search.type='search';search.dataset.shellFallback='true';search.placeholder='Buscar em Gestão de Pessoas';search.setAttribute('aria-label','Buscar em Gestão de Pessoas');searchBox.append(search);
  const extras=document.createElement('div');extras.className='people-bottom-extras';
  const control=(label,svg,handler)=>{const button=document.createElement('button');button.type='button';button.title=label;button.setAttribute('aria-label',label);button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+svg+'</svg>';button.onclick=handler;extras.append(button);return button};
  const records=()=>rowContainers().flatMap(rowsFor);
  let dateRange=null;
  const rowDate=row=>{const raw=row.dataset.date||row.querySelector('time[datetime]')?.getAttribute('datetime')||'';const day=raw.slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return null;const parsed=new Date(day+'T12:00:00Z');return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===day?day:null};
  const periodHidden=new WeakMap();
  const filter=()=>{for(const row of records())if(periodHidden.has(row)){row.hidden=periodHidden.get(row);periodHidden.delete(row)}if(nativeSearch)nativeSearch.dispatchEvent(new Event('input',{bubbles:true}));const q=nativeSearch?'':fold(search.value),rows=records(),hasDates=rows.some(row=>rowDate(row));rows.forEach(row=>{const text=fold(row.textContent),day=rowDate(row),base=nativeSearch&&row.hidden,period=!!(dateRange&&hasDates&&(!day||day<dateRange.start||day>dateRange.end));if(period)periodHidden.set(row,base);row.hidden=base||(!!q&&!text.includes(q))||period})};
  function searchState(){footer.classList.toggle('people-search-open',!searchBox.hidden);positionSearch()}
  function positionSearch(){searchBox.style.removeProperty('right');searchBox.style.removeProperty('width')}
  const start=control('Menu inicial','<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/>',goHome);start.className='people-start-control';
  const searchToggle=control('Abrir busca','<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',()=>{if(searchToggle.dataset.available==='false')return;if(nativeSearchButton){nativeSearchButton.click();syncQueries();if(!searchBox.hidden)nativeSearch?.focus();else searchToggle.focus();return}searchBox.hidden=!searchBox.hidden;search.hidden=searchBox.hidden;searchState();searchToggle.setAttribute('aria-pressed',String(!searchBox.hidden));searchToggle.setAttribute('aria-expanded',String(!searchBox.hidden));if(!searchBox.hidden)search.focus();else{search.value='';filter()}});
  search.oninput=filter;search.onkeydown=e=>{if(e.key==='Escape'){searchBox.hidden=true;searchState();search.value='';filter();searchToggle.setAttribute('aria-pressed','false');searchToggle.setAttribute('aria-expanded','false');searchToggle.focus()}};
  window.CicluzBeam?.attachOutline(searchBox);
  searchToggle.classList.add('people-search-toggle');
  const sortLabel='Organizar de A a Z';
  const sort=control(sortLabel,'',()=>{
   if(sort.dataset.available==='false')return;
   rememberOriginalRows();sortMode=(sortMode+1)%3;sortDirection=sortMode===0?null:sortMode===2;
   sortRows(sortDirection);updateSortLabel();announce(sortMode===0?'Ordem original restaurada':sortMode===1?'Organizado de A a Z':'Organizado de Z a A');
  });
  sort.classList.add('sort-az');
  function updateSortLabel(){
   const current=['Ordem original','Ordem de A a Z','Ordem de Z a A'];
   const next=['Organizar de A a Z','Organizar de Z a A','Restaurar ordem original'];
   sort.title=current[sortMode];sort.setAttribute('aria-label',sort.title);
   sort.setAttribute('aria-description','Próximo clique: '+next[sortMode]);
   sort.dataset.sortMode=['original','asc','desc'][sortMode];
   sort.setAttribute('aria-pressed',String(sortMode!==0));
   sort.textContent=['','A/Z','Z/A'][sortMode];if(sortMode===0)sort.innerHTML='<span class="people-order-dots" aria-hidden="true">⠿</span>';
  }
  updateSortLabel();
  let allExpanded=false;
  const expand=control('Expandir tudo','<path d="m5 9 7-6 7 6M5 15l7 6 7-6"/>',()=>{if(nativeExpand){nativeExpand.click();return}allExpanded=!allExpanded;content.querySelectorAll('details').forEach(el=>el.open=allExpanded);expand.setAttribute('aria-expanded',String(allExpanded));expand.title=allExpanded?'Recolher tudo':'Expandir tudo';expand.setAttribute('aria-label',expand.title)});
  let displayKey='cicluz-people-display-v1';let displayState={zoomed:false,compact:false,dock:'bottom',order:[]};
  try{const value=JSON.parse(localStorage.getItem(displayKey)||'null');if(value&&typeof value==='object')displayState={...displayState,...value}}catch{}
  function applyDisplay(){
   displayState.zoomed=false;view.classList.remove('people-content-zoomed');view.classList.toggle('people-content-narrow',!!displayState.compact);
   displayState.dock=displayState.dock==='top'?'top':'bottom';view.classList.toggle('people-bar-top',displayState.dock==='top');footer.dataset.barPosition=displayState.dock;
   position.setAttribute('aria-pressed',String(displayState.dock==='top'));position.title=displayState.dock==='top'?'Barra superior — mover para baixo':'Barra inferior — mover para cima';position.setAttribute('aria-label',position.title);
   requestAnimationFrame(positionDatePanel);
   width.setAttribute('aria-pressed',String(!!displayState.compact));width.title=displayState.compact?'Expandir na horizontal — maior':'Recolher na horizontal — menor';width.setAttribute('aria-label',width.title);
  }
  const width=control('Recolher na horizontal — menor','<path d="m9 5-6 7 6 7M15 5l6 7-6 7"/>',()=>{displayState.compact=!displayState.compact;applyDisplay()});
  const position=control('Posição da barra','<rect x="3.5" y="3.5" width="17" height="4" rx="1.5"/><rect x="3.5" y="16.5" width="17" height="4" rx="1.5"/><path d="M9 14V10m-2 2 2-2 2 2M15 10v4m-2-2 2 2 2-2"/>',()=>{
   displayState.dock=displayState.dock==='top'?'bottom':'top';setQuickOpen(false);closeChooser();setDateOpen(false);applyDisplay();
   try{localStorage.setItem(displayKey,JSON.stringify(displayState))}catch{announce('A posição foi alterada, mas não foi possível salvá-la')}
   home.focus();
  });position.className='people-position-control';
  const status=document.createElement('span');status.className='people-save-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const save=control('Salvar','<path d="m5 12 4 4L19 6"/>',()=>{
   const native=head.querySelector('.header-save-circle');if(native){native.click();return}
   try{displayState.order=records().map(row=>rowId(row));localStorage.setItem(displayKey,JSON.stringify(displayState));localStorage.setItem(preferencesKey,JSON.stringify(preferences));status.textContent='Configuração salva';setTimeout(()=>status.textContent='',2400)}catch{status.textContent='Não foi possível salvar a configuração'}
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
  const datePanel=document.createElement('form');datePanel.className='people-date-panel';datePanel.hidden=true;datePanel.inert=true;datePanel.setAttribute('aria-label','Buscar por período');
  datePanel.innerHTML='<label>De<input type="date" name="start" aria-label="Data inicial" required></label><label>Até<input type="date" name="end" aria-label="Data final" required></label><p class="people-date-message" role="status"></p><div class="people-date-actions"><button type="submit" class="people-date-search" aria-label="Buscar período" title="Buscar"><svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></button><button type="button" class="people-date-clear" aria-label="Limpar período" title="Limpar"><svg viewBox="0 0 24 24"><path d="M12 2v10M8 12h8l3 9H5zM9 16l-1 5m4-5v5m3-5 1 5"/></svg></button><button type="button" class="people-date-close" aria-label="Fechar calendário" title="Fechar"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>';
  const dateStart=datePanel.elements.start,dateEnd=datePanel.elements.end,dateMessage=datePanel.querySelector('.people-date-message');
  const back=control('Voltar','<path d="m15 5-7 7 7 7"/>',()=>{if(nativeBack&&!nativeBack.disabled)nativeBack.click()});back.className='people-back-control';
  const close=control('Fechar','<path d="m6 6 12 12M18 6 6 18"/>',()=>{if(nativeClose)nativeClose.click();else if(view.matches('dialog'))view.close();else if(view.matches('.dialog'))view.parentElement.classList.remove('show');else goHome()});close.className='people-close-control';
  const dateButton=control('Data de … a …','<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h2M13 14h2M7 18h2"/>',()=>{if(dateButton.dataset.available!=='false')setDateOpen(datePanel.hidden)});
  dateButton.setAttribute('aria-expanded','false');datePanel.id='date-panel-'+(view.id||'dialog');dateButton.setAttribute('aria-controls',datePanel.id);
  function positionDatePanel(){
   const rect=footer.getBoundingClientRect(),style=getComputedStyle(footer),inset=parseFloat(style.getPropertyValue('--footer-inset'))||8;
   const viewport=window.visualViewport,left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0;
   const dockTop=displayState.dock==='top',available=dockTop?top+(viewport?.height||window.innerHeight)-rect.bottom-inset:rect.top-top-inset;
   footer.style.setProperty('--toolbar-available-height',Math.max(0,available)+'px');
   if(datePanel.hidden)return;
   const right=Math.min(rect.right, left+(viewport?.width||window.innerWidth))-Math.max(inset,parseFloat(style.paddingRight)||0);
   const start=Math.max(rect.left,left)+Math.max(inset,parseFloat(style.paddingLeft)||0);
   const bottom=Math.min(rect.top,top+(viewport?.height||window.innerHeight))-inset;
   const ceiling=Math.max(top,collapsed?rect.top-panel.clientHeight:head.getBoundingClientRect().bottom);
   datePanel.style.setProperty('--date-top',dockTop?Math.max(top,rect.bottom+inset)+'px':'auto');
   datePanel.style.setProperty('--date-bottom',dockTop?'auto':Math.max(0,window.innerHeight-bottom)+'px');
   datePanel.style.setProperty('--date-right',Math.max(0,window.innerWidth-right)+'px');
   datePanel.style.setProperty('--date-max-width',Math.max(0,right-start)+'px');
   datePanel.style.setProperty('--date-max-height',Math.max(0,dockTop?available-inset:bottom-ceiling-inset)+'px');
  }
  function setDateOpen(open){datePanel.hidden=!open;datePanel.inert=!open;dateButton.setAttribute('aria-expanded',String(open));if(open){closeChooser();dateMessage.textContent='';positionDatePanel()}}
  window.addEventListener('resize',positionDatePanel);
  window.visualViewport?.addEventListener('resize',positionDatePanel);
  window.visualViewport?.addEventListener('scroll',positionDatePanel);
  new ResizeObserver(positionDatePanel).observe(footer);
  function updateDateLabel(){const format=value=>value.split('-').reverse().join('/');const label=dateRange?'Data de '+format(dateRange.start)+' a '+format(dateRange.end):'Data de … a …';dateButton.title=label;dateButton.setAttribute('aria-label',label);dateButton.setAttribute('aria-pressed',String(!!dateRange));if(typeof controls!=='undefined'&&controls.has('date'))controls.get('date').label=label}
  dateStart.oninput=()=>{dateStart.setCustomValidity('');dateEnd.setCustomValidity('')};dateEnd.oninput=()=>dateEnd.setCustomValidity('');
  datePanel.onsubmit=event=>{event.preventDefault();dateEnd.setCustomValidity('');if(dateStart.value>dateEnd.value){dateEnd.setCustomValidity('A data final deve ser igual ou posterior à data inicial.');dateMessage.textContent='A data final deve ser igual ou posterior à data inicial.';dateEnd.reportValidity();return}dateRange={start:dateStart.value,end:dateEnd.value};updateDateLabel();filter();if(!records().some(row=>rowDate(row))){dateMessage.textContent='Esta tela não possui registros com datas para filtrar.';return}setDateOpen(false);announce('Período aplicado: '+records().filter(row=>!row.hidden).length+' registros');dateButton.focus()};
  datePanel.querySelector('.people-date-clear').onclick=()=>{dateRange=null;dateStart.value='';dateEnd.value='';dateEnd.setCustomValidity('');updateDateLabel();filter();dateMessage.textContent=''};
  datePanel.querySelector('.people-date-close').onclick=()=>{setDateOpen(false);dateButton.focus()};
  datePanel.addEventListener('keydown',e=>{if(e.key==='Escape'){setDateOpen(false);dateButton.focus()}});
  document.addEventListener('pointerdown',e=>{if(!datePanel.hidden&&!datePanel.contains(e.target)&&!dateButton.contains(e.target))setDateOpen(false)});
  const sold=metricControl('VND','vendido','#eab308',['vnd','sales','sold','vendido']);
  const bought=metricControl('COM','comprado','#22c55e',['com','purchases','bought','comprado']);
  const profit=metricControl('LUC','lucro','#2563eb',['luc','profit','lucro']);
  const result=metricControl('RES','resultado','#7c3aed',['res','result','resultado']);
  const print=control('Imprimir','<path d="M7 8V3h10v5M7 17H3V9h18v8h-4M7 13h10v8H7z"/><path d="M17 11h1"/>',()=>{view.classList.add('shell-print-target');document.body.classList.add('shell-printing');window.addEventListener('afterprint',()=>{view.classList.remove('shell-print-target');document.body.classList.remove('shell-printing')},{once:true});window.print()});
  const exportConfig=control('Exportar configuração','<path d="M12 16V3m-4 4 4-4 4 4M4 14v7h16v-7"/>',()=>{
   const payload={format:'cicluz-screen-toolbar',version:1,screen:context,preferences,display:{compact:!!displayState.compact,dock:displayState.dock,order:records().map(row=>rowId(row))},buttonOrder};
   const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='cicluz-configuracao-cabecalho.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('Configuração exportada');
  });
  const importFile=document.createElement('input');importFile.type='file';importFile.accept='application/json,.json';importFile.hidden=true;importFile.setAttribute('aria-label','Arquivo de configuração do cabeçalho');
  const importConfig=control('Importar configuração','<path d="M12 3v13m-4-4 4 4 4-4M4 14v7h16v-7"/>',()=>importFile.click());
  importFile.onchange=async()=>{
   const file=importFile.files[0];if(!file)return;
   try{
    if(file.size>100000)throw Error('Arquivo de configuração muito grande');
    const data=JSON.parse(await file.text());if(!['cicluz-people-toolbar','cicluz-screen-toolbar'].includes(data.format)||data.version!==1)throw Error('Arquivo de configuração incompatível');
    preferences={};for(const key of controls.keys())if(typeof data.preferences?.[key]==='boolean')preferences[key]=data.preferences[key];if(data.preferences?._disabled&&typeof data.preferences._disabled==='object')preferences._disabled=Object.fromEntries(Object.entries(data.preferences._disabled).filter(([key,value])=>controls.has(key)&&value===true));if(data.preferences?._hidden&&typeof data.preferences._hidden==='object')for(const [key,value] of Object.entries(data.preferences._hidden))if(controls.has(key)&&value===true)preferences[key]=false;
    buttonOrder=Array.isArray(data.buttonOrder)?[...new Set(data.buttonOrder.filter(key=>typeof key==='string'&&controls.has(key)))]:[];
    displayState={zoomed:false,compact:data.display?.compact===true,dock:data.display?.dock==='top'?'top':'bottom',order:Array.isArray(data.display?.order)?data.display.order.filter(key=>typeof key==='string').slice(0,1000):[]};
    localStorage.setItem(preferencesKey,JSON.stringify(preferences));localStorage.setItem(displayKey,JSON.stringify(displayState));persistButtonOrder();applyDisplay();applyPreferences();
    const positions=new Map(displayState.order.map((id,i)=>[id,i]));for(const container of rowContainers()){const rows=rowsFor(container),ordered=[...rows].sort((a,b)=>(positions.get(rowId(a))??9999)-(positions.get(rowId(b))??9999));if(rows.some((r,i)=>r!==ordered[i]))ordered.forEach(row=>container.append(row))}
    if(!chooser.hidden)renderChoices();announce('Configuração importada');
   }catch(error){announce(error.message||'Não foi possível importar a configuração')}
   finally{importFile.value=''}
  };
  applyDisplay();
  const toggle=document.createElement('button');toggle.type='button';toggle.className='people-header-toggle';toggle.innerHTML='<svg viewBox="0 0 24 24"><path d="m5 15 7-7 7 7"/></svg>';
  let collapsed=false;
  function toggleState(){view.classList.toggle('people-top-hidden',collapsed);toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Mostrar cabeçalho superior':'Ocultar cabeçalho superior');toggle.title=toggle.getAttribute('aria-label');if(!datePanel.hidden)requestAnimationFrame(positionDatePanel)}
  toggle.onclick=()=>{collapsed=!collapsed;toggleState()};
  let preferencesKey='cicluz-people-footer-buttons-v1';let preferences={};
  try{const value=JSON.parse(localStorage.getItem(preferencesKey)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))preferences=normalizePreferences(value)}catch{}
  const controls=new Map([['search',{button:searchToggle,label:'Buscar'}],['sort',{button:sort,label:sortLabel}],['date',{button:dateButton,label:'Data de … a …'}],['expand',{button:expand,label:'Expandir / recolher tudo'}],['sold',{button:sold,label:'Organizar por + vendido / − vendido'}],['bought',{button:bought,label:'Organizar por + comprado / − comprado'}],['profit',{button:profit,label:'Organizar por + lucro / − lucro'}],['result',{button:result,label:'Organizar por + resultado / − resultado'}],['print',{button:print,label:'Imprimir'}],['import',{button:importConfig,label:'Importar configuração'}],['export',{button:exportConfig,label:'Exportar configuração'}],['width',{button:width,label:'Maior / menor na horizontal'}],['position',{button:position,label:'Posição da barra'}],['save',{button:save,label:'Salvar'}]]);
  const chooser=document.createElement('div');chooser.className='people-toolbar-options';chooser.id='toolbar-options-'+(view.id||'dialog');chooser.hidden=true;chooser.inert=true;chooser.setAttribute('role','group');chooser.setAttribute('aria-label','Atalhos disponíveis e menu rápido');
  const more=document.createElement('button');more.type='button';more.className='people-toolbar-more';more.title='Mais atalhos';more.setAttribute('aria-label',more.title);more.setAttribute('aria-expanded','false');more.setAttribute('aria-pressed','false');more.setAttribute('aria-controls',chooser.id);more.innerHTML='<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>';
  function setChooserOpen(open){chooser.hidden=!open;chooser.inert=!open;more.setAttribute('aria-expanded',String(open));more.setAttribute('aria-pressed',String(open));if(open){chooserCompact=true;setDateOpen(false);setQuickOpen(false);renderChoices()}}
  function closeChooser(){setChooserOpen(false)}

  let orderKey='cicluz-people-footer-order-v1';let buttonOrder=[];
  try{const value=JSON.parse(localStorage.getItem(orderKey)||'[]');if(Array.isArray(value))buttonOrder=value.filter(key=>typeof key==='string')}catch{}
  function persistButtonOrder(){try{localStorage.setItem(orderKey,JSON.stringify(buttonOrder))}catch{}}
  const fixedKeys=new Set(['search','position','sort','date','save']);
  const defaultQuick=new Set(['expand','sold','bought','profit','result']);
  const pinned=key=>preferences[key]===true||(preferences[key]===undefined&&defaultQuick.has(key));
  const enabled=key=>fixedKeys.has(key)||preferences._disabled?.[key]!==true;
  function normalizePreferences(value){
   const next=value&&typeof value==='object'&&!Array.isArray(value)?{...value}:{};
   if(next._hidden&&typeof next._hidden==='object')for(const [key,hidden] of Object.entries(next._hidden))if(hidden===true)next[key]=false;
   delete next._hidden;
   if(!next._disabled||typeof next._disabled!=='object'||Array.isArray(next._disabled))delete next._disabled;
   return next;
  }
  function orderedControls(){const keys=[...new Set([...buttonOrder,...controls.keys()])];return keys.filter(key=>controls.has(key)&&!fixedKeys.has(key)).map(key=>[key,controls.get(key)])}
  function setQuickOpen(open){tools.hidden=!open;footer.classList.toggle('people-quick-open',open);home.setAttribute('aria-expanded',String(open));home.title=open?'Ocultar menu rápido':'Mostrar menu rápido';home.setAttribute('aria-label',home.title);if(open){closeChooser();setDateOpen(false)}}
  home.onclick=()=>setQuickOpen(tools.hidden);
  document.addEventListener('pointerdown',event=>{if(!tools.hidden&&!tools.contains(event.target)&&!home.contains(event.target))setQuickOpen(false)});

  function applyPreferences(){
   const ordered=orderedControls(),buttons=ordered.map(([,entry])=>entry.button),wanted=new Set(buttons);
   for(const child of [...tools.children])if(!wanted.has(child)&&!child.matches('.people-quick-empty'))child.remove();
   let empty=tools.querySelector('.people-quick-empty');if(!empty){empty=document.createElement('span');empty.className='people-quick-empty';empty.textContent='Escolha seus atalhos nos três pontos';tools.append(empty)}
   for(const [key,{button}] of ordered){button.hidden=!pinned(key)||button.dataset.available==='false';button.disabled=!enabled(key)||button.dataset.nativeDisabled==='true';button.dataset.controlKey=key}
   const current=[...tools.children].filter(child=>wanted.has(child));if(buttons.some((button,i)=>current[i]!==button))buttons.forEach(button=>tools.append(button));
   empty.hidden=buttons.some(button=>!button.hidden);
   for(const button of [searchToggle,position,sort,dateButton,save])button.hidden=false;
   searchToggle.setAttribute('aria-disabled',String(searchToggle.dataset.available==='false'));sort.setAttribute('aria-disabled',String(sort.disabled||sort.dataset.available==='false'));dateButton.setAttribute('aria-disabled',String(dateButton.dataset.available==='false'));
   searchState();
  }
  let dragging=null;
  let chooserCompact=true,chooserSignature='';
  const choicesFingerprint=()=>JSON.stringify([chooserCompact,...orderedControls().map(([key,{button,label}])=>[key,label,button.dataset.available,button.disabled,button.innerHTML,pinned(key),enabled(key)])]);
  function moveControl(key,target,before=true){
   const keys=orderedControls().map(([id])=>id);if(key===target)return;
   const from=keys.indexOf(key);if(from<0)return;keys.splice(from,1);const at=keys.indexOf(target);if(at<0)return;keys.splice(at+(before?0:1),0,key);buttonOrder=keys;persistButtonOrder();applyPreferences();renderChoices();
  }
  function renderChoices(){
   chooserSignature=choicesFingerprint();chooser.replaceChildren();chooser.classList.toggle('people-options-compact',chooserCompact);
   const heading=document.createElement('div');heading.className='people-options-heading';
   const title=document.createElement('b');title.textContent=chooserCompact?'Atalhos disponíveis':'Configurar menu rápido';
   const headingIcon=document.createElement('span');headingIcon.className='people-options-heading-icon';headingIcon.setAttribute('aria-hidden','true');headingIcon.innerHTML=more.innerHTML;
   const resize=document.createElement('button');resize.type='button';resize.className='people-options-resize';resize.setAttribute('aria-expanded',String(!chooserCompact));resize.setAttribute('aria-label',chooserCompact?'Configurar menu rápido':'Voltar aos atalhos disponíveis');resize.title=resize.getAttribute('aria-label');resize.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(chooserCompact?'m15 5-7 7 7 7':'m9 5 7 7-7 7')+'"/></svg>';
   resize.onclick=()=>{chooserCompact=!chooserCompact;renderChoices();chooser.querySelector('.people-options-resize').focus()};
   heading.append(headingIcon,title,resize);const inner=document.createElement('div');inner.className='people-options-inner';chooser.append(heading,inner);
   const candidates=orderedControls().filter(([key,{button}])=>button.dataset.available!=='false'&&(!chooserCompact||!pinned(key)));if(!chooserCompact)candidates.sort(([a],[b])=>(!enabled(a)?2:pinned(a)?1:0)-(!enabled(b)?2:pinned(b)?1:0));
   if(!candidates.length){const empty=document.createElement('p');empty.className='people-choices-empty';empty.textContent='Todos os atalhos disponíveis estão no menu rápido.';inner.append(empty)}
   for(const [key,{button,label}] of candidates){
    const row=document.createElement('div');row.className='people-toolbar-row';row.dataset.choiceKey=key;
    const handle=document.createElement('button');handle.type='button';handle.className='people-order-handle';handle.draggable=true;handle.title='Arraste para mover ou use as setas para cima e para baixo';handle.setAttribute('aria-label','Mover '+label);handle.innerHTML='<svg viewBox="0 0 12 20"><circle cx="3" cy="4" r="1"/><circle cx="9" cy="4" r="1"/><circle cx="3" cy="10" r="1"/><circle cx="9" cy="10" r="1"/><circle cx="3" cy="16" r="1"/><circle cx="9" cy="16" r="1"/></svg>';
    handle.ondragstart=e=>{dragging=key;e.dataTransfer.setData('text/plain',key)};handle.ondragend=()=>dragging=null;
    row.ondragover=e=>{if(dragging)e.preventDefault()};row.ondrop=e=>{e.preventDefault();if(dragging)moveControl(dragging,key,e.clientY<row.getBoundingClientRect().top+row.offsetHeight/2);dragging=null};
    handle.onkeydown=e=>{if(!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const keys=orderedControls().map(([id])=>id),index=keys.indexOf(key),target=keys[index+(e.key==='ArrowUp'?-1:1)];if(target){moveControl(key,target,e.key==='ArrowUp');chooser.querySelector('[data-choice-key="'+key+'"] .people-order-handle')?.focus()}};
    let touchStart=null;
    handle.onpointerdown=e=>{if(e.pointerType!=='touch')return;touchStart={y:e.clientY,id:e.pointerId};handle.setPointerCapture(e.pointerId)};
    handle.onpointerup=e=>{if(!touchStart)return;const delta=e.clientY-touchStart.y;touchStart=null;const target=[...chooser.querySelectorAll('.people-toolbar-row')].find(el=>{const rect=el.getBoundingClientRect();return e.clientY>=rect.top&&e.clientY<=rect.bottom});if(Math.abs(delta)>8&&target)moveControl(key,target.dataset.choiceKey,delta<0)};
    const action=document.createElement('button');action.type='button';action.className='people-toolbar-run';action.setAttribute('aria-label','Executar '+label);action.disabled=button.disabled||button.dataset.available==='false';
    const symbol=document.createElement('span');symbol.className='people-option-symbol';symbol.innerHTML=button.innerHTML;symbol.style.setProperty('--metric-color',button.style.getPropertyValue('--metric-color'));if(button.classList.contains('people-metric-control'))symbol.classList.add('people-metric-control');
    const name=document.createElement('span');name.textContent=label;name.className='people-option-name';action.append(symbol,name);action.onclick=()=>{closeChooser();button.click()};
    const power=document.createElement('button');power.type='button';power.className='people-toolbar-enable';power.setAttribute('role','switch');power.setAttribute('aria-label','Ativar função: '+label);power.setAttribute('aria-checked',String(enabled(key)));power.title=enabled(key)?'Desligar '+label:'Ligar '+label;power.innerHTML='<span class="people-enable-track" aria-hidden="true"><span class="people-enable-thumb"></span></span>';
    power.onclick=()=>{if(!preferences._disabled)preferences._disabled={};preferences._disabled[key]=enabled(key);persistPreferences();applyPreferences();power.setAttribute('aria-checked',String(enabled(key)));power.title=enabled(key)?'Desligar '+label:'Ligar '+label;action.disabled=button.disabled||button.dataset.available==='false';row.classList.toggle('people-option-disabled',!enabled(key));if(key==='sort'&&enabled(key)&&sortMode!==0)sortRows(sortDirection);chooserSignature=choicesFingerprint()};
    const pin=document.createElement('button');pin.type='button';pin.className='people-toolbar-pin';pin.title=pinned(key)?'Remover do menu rápido: '+label:'Incluir no menu rápido: '+label;pin.setAttribute('aria-label',pin.title);pin.setAttribute('aria-pressed',String(pinned(key)));const maskId='quick-pin-logo-'+(++pinLogoId);pin.innerHTML='<svg viewBox="10 6 42 44" aria-hidden="true"><defs><mask id="'+maskId+'" maskUnits="userSpaceOnUse" x="10" y="6" width="42" height="44" style="mask-type:alpha"><image href="cicluz-gestao-padaria-logo.png" width="177.6" height="64" preserveAspectRatio="none"/></mask></defs><rect x="10" y="6" width="42" height="44" fill="currentColor" mask="url(#'+maskId+')"/></svg>';
    pin.onclick=()=>{preferences[key]=!pinned(key);persistPreferences();applyPreferences();renderChoices();chooser.querySelector('[data-choice-key="'+key+'"] .people-toolbar-pin')?.focus()};
    row.classList.toggle('people-option-disabled',!enabled(key));row.classList.toggle('people-option-pinned',pinned(key));action.title=label;row.append(handle,action,power,pin);inner.append(row);
   }
  }
  function persistPreferences(){try{localStorage.setItem(preferencesKey,JSON.stringify(preferences))}catch{announce('Não foi possível salvar os atalhos')}}
  more.onclick=()=>setChooserOpen(chooser.hidden);
  document.addEventListener('pointerdown',e=>{if(!chooser.hidden&&!chooser.contains(e.target)&&!more.contains(e.target))closeChooser()});
  footer.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(!chooser.hidden){closeChooser();more.focus()}else if(!tools.hidden){setQuickOpen(false);home.focus()}});
  left.append(start,position,sort,dateButton,searchToggle);right.append(more,back,close,save,toggle);save.classList.add('people-save-control');dateButton.classList.add('people-date-control');footer.append(tools,searchBox,left,home,right,chooser,datePanel,status,importFile);panel.append(footer);
  footer.addEventListener('click',event=>{const button=event.target.closest('button');if(!button||button.matches('.people-toolbar-choice,.people-toolbar-more'))return;button.classList.add('people-click-feedback');setTimeout(()=>button.classList.remove('people-click-feedback'),220)});
  applyPreferences();
  function readState(key,fallback){try{const value=JSON.parse(localStorage.getItem(key)||'null');return value&&typeof value==='object'?value:fallback}catch{return fallback}}
  function loadContext(){
   context=screenKey();const legacy=view.id==='sector-view'&&title()==='Gestão de Pessoas';
   const prefix=legacy?'cicluz-people':'cicluz-screen-'+encodeURIComponent(context);
   displayKey=prefix+'-display-v1';preferencesKey=prefix+'-footer-buttons-v1';orderKey=prefix+'-footer-order-v1';
   preferences=normalizePreferences(readState(preferencesKey,{}));buttonOrder=readState(orderKey,[]);if(!Array.isArray(buttonOrder))buttonOrder=[];
   displayState={zoomed:false,compact:false,dock:'bottom',order:[],...readState(displayKey,{})};
   applyDisplay();applyPreferences();
   if(Array.isArray(displayState.order)){const positions=new Map(displayState.order.map((id,i)=>[id,i]));for(const container of rowContainers()){const rows=rowsFor(container);const ordered=[...rows].sort((a,b)=>(positions.get(rowId(a))??9999)-(positions.get(rowId(b))??9999));if(rows.some((r,i)=>r!==ordered[i]))ordered.forEach(row=>container.append(row))}}
   footer.setAttribute('aria-label','Controles de '+title());tools.setAttribute('aria-label','Menu rápido de '+title());search.placeholder='Buscar em '+title();search.setAttribute('aria-label',search.placeholder);
  }
  function syncQueries(){
   for(const [input,marker] of adoptedInputs){if(!marker.isConnected){input.remove();adoptedInputs.delete(input)}}
   for(const dock of head.querySelectorAll(':scope>.fixed-header-tools'))footer.append(dock);
   const candidates=[...footer.querySelectorAll('.fixed-header-tools input[type=search]'),...content.querySelectorAll('.profiles-search input[type=search]')];
   for(const input of candidates){if(adoptedInputs.has(input))continue;const host=input.closest('.profiles-search');if(host)profileSearchHosts.set(input,host);const marker=document.createComment('screen-search-origin');input.before(marker);adoptedInputs.set(input,marker);input.addEventListener('keydown',event=>{if(event.key==='Escape')queueMicrotask(()=>{const host=profileSearchHosts.get(input);if(host)host.hidden=true;syncQueries();searchToggle.focus()})});searchBox.append(input)}
   nativeSearch=[...adoptedInputs.keys()].find(input=>input.isConnected)||null;
   search.hidden=!!nativeSearch||searchBox.hidden;
   if(nativeSearch){const host=profileSearchHosts.get(nativeSearch);if(host)nativeSearch.hidden=host.hidden;searchBox.hidden=nativeSearch.hidden;searchToggle.setAttribute('aria-expanded',String(!nativeSearch.hidden));searchToggle.setAttribute('aria-pressed',String(!nativeSearch.hidden))}
   for(const dock of footer.querySelectorAll(':scope>.fixed-header-tools'))dock.hidden=![...dock.querySelectorAll('select,button,input')].some(el=>!el.hidden&&!el.closest('[hidden]:not(.fixed-header-tools)'));
   searchState();positionDatePanel();
  }
  let previousActive=false;
  function sync(){
   const active=isVisible(view);
   if(!active){if(previousActive){closeChooser();setQuickOpen(false);setDateOpen(false);searchBox.hidden=true;search.hidden=true;searchState();for(const [input] of adoptedInputs)input.hidden=true;collapsed=false;toggleState()}previousActive=false;return}
   if(!previousActive||context!==screenKey()){
    collapsed=false;toggleState();closeChooser();searchBox.hidden=true;search.hidden=true;search.value='';sortDirection=null;sortMode=0;originalOrders=new WeakMap();updateSortLabel();setQuickOpen(false);dateRange=null;dateStart.value='';dateEnd.value='';setDateOpen(false);updateDateLabel();loadContext();
   }
   previousActive=true;
   for(const table of content.querySelectorAll('table')){if(table.closest('.shell-table-scroll,.profiles-matrix'))continue;const wrap=document.createElement('div');wrap.className='shell-table-scroll';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Tabela; deslize para os lados');table.before(wrap);wrap.append(table)}
   const sources=[...head.querySelectorAll('.shortcut-actions button')].filter(b=>{if(b.matches('.mobile-menu-open,.header-identity-toggle')||b.hidden)return false;const label=b.getAttribute('aria-label')||b.title||'';if(/^(Voltar|Fechar)(?:\s|$)/i.test(label))return true;const owner=fold(title());if(!b.dataset.shellOwnerTitle)b.dataset.shellOwnerTitle=owner;return b.dataset.shellOwnerTitle===owner});
   nativeSearchButton=sources.find(b=>b.matches('.header-search-circle')||/^(?:Abrir |Recolher )?busca(?:r)?(?: |$)/i.test(b.getAttribute('aria-label')||b.title||''))||null;
   nativeSort=sources.find(b=>b.matches('.sort-az'))||null;
   nativeExpand=sources.find(b=>b.matches('.unified-expand-toggle')||/^(?:Expandir|Recolher) (?:tudo|todos|todas)/.test(b.getAttribute('aria-label')||b.title||''))||null;
   const nativeSave=sources.find(b=>b.matches('.header-save-circle'));
   nativeBack=sources.find(b=>/^Voltar(?:\s|$)/i.test(b.getAttribute('aria-label')||b.title||''))||null;nativeClose=sources.find(b=>/^Fechar(?:\s|$)/i.test(b.getAttribute('aria-label')||b.title||''))||null;back.disabled=!nativeBack||nativeBack.disabled;
   const list=!!content.querySelector('.record-grid,.job-item,.salary-row,.location-tree,tbody,.record');
   searchToggle.dataset.available=String(!!nativeSearchButton||list);sort.dataset.available=String(!!nativeSort||list);dateButton.dataset.available=String(records().some(row=>rowDate(row)));expand.dataset.available=String(!!nativeExpand||!!content.querySelector('details'));
   for(const b of [sold,bought,profit,result])b.dataset.available=String(list);
   expand.dataset.nativeDisabled=String(nativeExpand?.disabled||false);
   if(nativeExpand){if(expand.innerHTML!==nativeExpand.innerHTML)expand.innerHTML=nativeExpand.innerHTML;for(const attr of ['aria-expanded','aria-label','title']){const value=nativeExpand.getAttribute(attr);if(value!==null&&expand.getAttribute(attr)!==value)expand.setAttribute(attr,value)}}
   save.disabled=!!nativeSave?.disabled;
   const delegated=sources.filter(b=>![nativeSearchButton,nativeSort,nativeExpand,nativeSave,nativeBack,nativeClose].includes(b));
   for(const [source,entry] of proxies)if(!delegated.includes(source)){entry.button.remove();controls.delete(entry.key);proxies.delete(source)}
   for(const source of delegated){
    let entry=proxies.get(source);const label=source.getAttribute('aria-label')||source.title||source.textContent.trim();
    if(!entry){const button=document.createElement('button');button.type='button';button.className='people-footer-action';button.onclick=()=>{source.click();syncQueries()};entry={button,key:'action:'+(source.id||label)};proxies.set(source,entry)}
    const {button,key}=entry;
    if(button.innerHTML!==source.innerHTML)button.innerHTML=source.innerHTML;
    if(button.getAttribute('aria-label')!==label){button.setAttribute('aria-label',label);button.title=label}
    button.dataset.nativeDisabled=String(source.disabled);button.disabled=source.disabled;for(const attr of ['aria-expanded','aria-pressed']){const value=source.getAttribute(attr);if(value!==null)button.setAttribute(attr,value);else button.removeAttribute(attr)}
    controls.set(key,{button,label});
   }
   syncQueries();if(sortMode===0)originalOrders=new WeakMap();rememberOriginalRows();applyPreferences();if(sortMode!==0&&enabled('sort'))sortRows(sortDirection);if(!chooser.hidden&&chooserSignature!==choicesFingerprint())renderChoices();
  }
  content.addEventListener('pointerdown',e=>{if(e.target.closest('.menu-item-move,.account-move,.drag-handle,.location-move')){sortDirection=null;sortMode=0;originalOrders=new WeakMap();updateSortLabel()}},true);
  mounted.set(view,{sync,footer,head,reset:()=>{if(nativeSearchButton?.getAttribute('aria-expanded')==='true')nativeSearchButton.click();for(const [input] of adoptedInputs){input.hidden=true;const host=profileSearchHosts.get(input);if(host)host.hidden=true}previousActive=false;sync()}});
  let queued=false;
  new MutationObserver(records=>{
   if(records.every(r=>footer.contains(r.target)))return;
   if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync()});
  }).observe(view,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','hidden','aria-label','aria-expanded','aria-pressed','disabled','open']});
  sync();
 }
 function scan(){document.querySelectorAll('.view.show').forEach(mount);document.querySelectorAll('dialog[open],.modal.show>.dialog').forEach(dialog=>{if(!mounted.has(dialog)){prepareDialog(dialog);mount(dialog)}})}
 function prepareDialog(dialog){
  if(dialog.querySelector(':scope>.panel'))return;
  let head=dialog.querySelector('.location-dialog-header,.organogram-dialog-header,.organogram-editor-header');
  const heading=head?.querySelector('h2,h3')||dialog.querySelector(':scope>h2,:scope>h3');if(!heading)return;
  if(!dialog.id)dialog.id='screen-dialog-'+(++dialogCount);
  if(!head){head=document.createElement('div');heading.before(head);head.append(heading)}
  head.classList.add('head');head.dataset.headerStandard='yes';
  let identity=head.querySelector('.header-identity');if(!identity){identity=document.createElement('div');identity.className='header-identity';heading.before(identity);identity.append(heading)}
  let tools=head.querySelector('.location-dialog-tools,.organogram-dialog-tools,.shortcut-actions');if(!tools){tools=document.createElement('div');tools.className='shortcut-actions';head.append(tools)}tools.classList.add('shortcut-actions');
  if(!tools.querySelector('button[aria-label="Fechar"]')){const close=document.createElement('button');close.type='button';close.className='shortcut-circle';close.setAttribute('aria-label','Fechar');close.title='Fechar';close.innerHTML='<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>';close.onclick=()=>dialog.matches('dialog')?dialog.close():dialog.parentElement.classList.remove('show');tools.append(close)}
  let icon=head.querySelector('.sector-icon,.location-icon,.origin-icon');if(!icon){icon=document.createElement('span');icon.className='sector-icon';icon.innerHTML=document.querySelector('.view.show>.panel>.head .sector-icon')?.innerHTML||'<svg viewBox="0 0 24 24"><path d="M4 3h16v18H4zM8 8h8M8 13h8"/></svg>';head.prepend(icon)}icon.classList.add('sector-icon');
  const content=document.createElement('div');content.className='content';const panel=document.createElement('div');panel.className='panel';
  head.remove();while(dialog.firstChild)content.append(dialog.firstChild);panel.append(head,content);dialog.append(panel);dialog.classList.add('shell-dialog');
 }
 let dialogCount=0;
 const boot=()=>{scan();new MutationObserver(records=>{if(records.some(r=>r.type==='childList'||r.attributeName==='open'||r.target.matches?.('.modal')))scan()}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','class']});document.addEventListener('cicluz-menu-visibility',()=>{if(!document.body.classList.contains('mobile-menu-visible'))for(const view of document.querySelectorAll('.app-screen-shell'))mounted.get(view)?.reset()})};
 if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',boot);else boot();
})();
