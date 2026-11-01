(()=>{
 const side=document.querySelector('.side'),main=document.querySelector('.main'),top=document.querySelector('.top');
 if(!side||!main||!top)return;
 const footer=document.createElement('footer');footer.className='sidebar-footer';
 const controls=top.querySelector('.side-controls');if(controls){side.insertBefore(controls,side.querySelector('.nav'));const toggle=document.getElementById('toggleMenu');if(toggle){toggle.classList.add('menu-layout-toggle');side.prepend(toggle)}}
 const divider=document.createElement('div');divider.className='menu-top-divider';divider.setAttribute('aria-hidden','true');side.insertBefore(divider,side.querySelector('.nav'));
 const user=document.createElement('div');user.className='sidebar-user';user.setAttribute('aria-label','Usuário: Rodrigo Oliveira');
 const avatar=top.querySelector('.avatar');if(avatar)user.append(avatar);
 const name=document.createElement('span');name.className='sidebar-user-name';name.textContent='Rodrigo Oliveira';user.append(name);footer.append(user);side.append(footer);
 const brand=side.querySelector('.brand');
 const fullLogo=brand?.querySelector('.brand-logo-wrap');
 if(fullLogo&&!fullLogo.querySelector('.logo-path-light'))fullLogo.insertAdjacentHTML('beforeend','<svg class="logo-path-light" viewBox="0 16 60 64" aria-hidden="true"><defs><linearGradient id="logo-path-light-gradient" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#fff" stop-opacity="0"/><stop offset=".22" stop-color="#fff8b8" stop-opacity=".45"/><stop offset=".5" stop-color="#fff"/><stop offset=".78" stop-color="#fff8b8" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><filter id="logo-path-light-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="1.1" result="soft"/><feMerge><feMergeNode in="soft"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect x="-8" y="-3.5" width="16" height="7" rx="3.5" fill="url(#logo-path-light-gradient)" filter="url(#logo-path-light-glow)"><animateMotion dur="11s" repeatCount="indefinite" rotate="auto" path="M 21 30 C 21 20 34 19 36 27 L 36 34 C 41 30 49 29 51 36 C 53 41 50 45 46 46 L 14 64 C 8 66 3 61 5 55 C 6 52 9 50 12 48 C 6 45 4 41 6 36 C 8 31 13 29 17 32 L 46 50 C 51 53 53 57 50 62 C 47 68 41 66 36 62 C 37 69 33 73 28 73 C 23 73 20 68 21 63 L 21 30"/></rect></svg>');
 if(fullLogo&&!fullLogo.querySelector('.logo-color-light'))fullLogo.insertAdjacentHTML('beforeend','<svg class="logo-color-light" viewBox="0 0 220 64" aria-hidden="true"><defs><mask id="logo-color-light-mask" maskUnits="userSpaceOnUse"><rect x="-11" y="-4" width="22" height="8" rx="4" fill="#fff"><animateMotion dur="15s" repeatCount="indefinite" rotate="auto" path="M 26 18 C 26 10 36 9 38 16 L 38 21 C 42 18 48 17 49 23 C 51 27 49 30 45 30 L 20 45 C 16 46 12 43 14 38 C 15 35 17 34 19 32 C 14 30 13 26 14 23 C 16 19 20 18 23 20 L 45 34 C 49 36 51 39 49 43 C 47 47 42 46 38 43 C 39 48 36 52 32 52 C 28 52 26 48 26 44 L 26 18"/></rect></mask></defs><image href="cicluz-gestao-padaria-logo.png" x="0" y="0" width="177.6" height="64" preserveAspectRatio="none" mask="url(#logo-color-light-mask)" style="filter:brightness(1.48) saturate(1.75) drop-shadow(0 0 2px rgba(255,255,255,.9))"/></svg>');
 const colorMask=fullLogo?.querySelector('#logo-color-light-mask');if(colorMask)colorMask.innerHTML='<path d="M 26 18 C 26 10 36 9 38 16 L 38 21 C 42 18 48 17 49 23 C 51 27 49 30 45 30 L 20 45 C 16 46 12 43 14 38 C 15 35 17 34 19 32 C 14 30 13 26 14 23 C 16 19 20 18 23 20 L 45 34 C 49 36 51 39 49 43 C 47 47 42 46 38 43 C 39 48 36 52 32 52 C 28 52 26 48 26 44 L 26 18" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="28 190" stroke-dashoffset="0"><animate attributeName="stroke-dashoffset" values="0;-218" dur="15s" repeatCount="indefinite"/></path>';
 const colorSvg=fullLogo?.querySelector('.logo-color-light'),colorDefs=colorSvg?.querySelector('defs');if(colorDefs&&!colorDefs.querySelector('#logo-ribbon-alpha-mask'))colorDefs.insertAdjacentHTML('afterbegin','<mask id="logo-ribbon-alpha-mask" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="220" height="64" style="mask-type:alpha"><image href="cicluz-gestao-padaria-logo.png" x="0" y="0" width="177.6" height="64" preserveAspectRatio="none"/></mask>');
 if(colorMask)colorMask.innerHTML='<g mask="url(#logo-ribbon-alpha-mask)"><path d="M 26 18 C 26 10 36 9 38 16 L 38 21 C 42 18 48 17 49 23 C 51 27 49 30 45 30 L 20 45 C 16 46 12 43 14 38 C 15 35 17 34 19 32 C 14 30 13 26 14 23 C 16 19 20 18 23 20 L 45 34 C 49 36 51 39 49 43 C 47 47 42 46 38 43 C 39 48 36 52 32 52 C 28 52 26 48 26 44 L 26 18" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="28 190" stroke-dashoffset="0"><animate attributeName="stroke-dashoffset" values="0;-218" dur="15s" repeatCount="indefinite"/></path></g>';
 const colorPath=colorMask?.querySelector('path');if(colorPath)colorPath.setAttribute('stroke-width','5.5');
 const colorImage=fullLogo?.querySelector('.logo-color-light image');if(colorImage)colorImage.style.filter='brightness(1.85) saturate(2.2) drop-shadow(0 0 4px rgba(255,255,255,.95))';
 const pathLight=fullLogo?.querySelector('.logo-path-light animateMotion');if(pathLight){pathLight.setAttribute('dur','15s');const stripe=pathLight.parentElement;if(stripe){stripe.setAttribute('x','-11');stripe.setAttribute('y','-4');stripe.setAttribute('width','22');stripe.setAttribute('height','8');stripe.setAttribute('rx','4')}}
 if(brand){function brandState(){const compact=side.classList.contains('collapsed');if(compact){brand.setAttribute('role','button');brand.setAttribute('tabindex','0');brand.setAttribute('aria-label','Expandir menu principal')}else{brand.removeAttribute('role');brand.removeAttribute('tabindex');brand.removeAttribute('aria-label')}}brand.addEventListener('click',()=>{if(side.classList.contains('collapsed'))document.dispatchEvent(new Event('cicluz-open-menu'))});brand.addEventListener('keydown',e=>{if(side.classList.contains('collapsed')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();document.dispatchEvent(new Event('cicluz-open-menu'))}});new MutationObserver(brandState).observe(side,{attributes:true,attributeFilter:['class']});brandState()}
 const opener=document.querySelector('.mobile-menu-open');
 const dock=document.createElement('div');dock.className='mobile-menu-dock';main.prepend(dock);
 function place(){
  if(!opener)return;
  const head=main.querySelector('.view.show>.panel>.head');const actions=head?.querySelector('.shortcut-actions');
  const target=actions||dock;if(opener.parentElement!==target)target.prepend(opener);
  dock.hidden=!!actions;
 }
 let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;place()})}).observe(main,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});place();
})();

// Terminologia única da Gestão de Pessoas.
(()=>{
 const labels=new Map([['Atualização salarial','Atualização salarial de cargos'],['Ficha de Cargos','Ficha de cargos']]);
 const refresh=()=>{const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){const next=labels.get(node.nodeValue.trim());if(next)node.nodeValue=node.nodeValue.replace(node.nodeValue.trim(),next)}};
 refresh();new MutationObserver(refresh).observe(document.body,{childList:true,subtree:true});
})();

// Main-menu search is transient: it never survives leaving the menu.
(()=>{
 const side=document.querySelector('.side'),tree=side?.querySelector('.nav-tree'),controls=side?.querySelector('.side-controls');
 if(!tree||!controls)return;
 const button=document.createElement('button');button.type='button';button.className='tree-control menu-search-toggle';
 button.title='Buscar no menu';button.setAttribute('aria-label','Abrir busca no menu');button.setAttribute('aria-expanded','false');button.setAttribute('aria-pressed','false');
 button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
 const box=document.createElement('div');box.className='menu-search-box';box.id='main-menu-search';box.hidden=true;
 const input=document.createElement('input');input.type='search';input.className='shared-header-search';input.placeholder='Buscar…';input.setAttribute('aria-label','Buscar opções do menu');input.autocomplete='off';
 const status=document.createElement('p');status.className='menu-search-status';status.setAttribute('role','status');status.hidden=true;
 box.append(input,status);controls.append(button);controls.after(box);button.setAttribute('aria-controls',box.id);
 let original=null;
 const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
 function restore(){if(!original)return;for(const [el,state]of original){el.hidden=state.hidden;if(el.tagName==='DETAILS')el.open=state.open;el.classList.toggle('sidebar-section-hidden',state.sectionHidden)}original=null;status.hidden=true;status.textContent=''}
 function filter(){const query=fold(input.value);if(!query){restore();return}
  const roots=[...tree.children],entries=[...tree.querySelectorAll('.children>button')];
  if(!original)original=new Map([...new Set([...roots,...entries])].map(el=>[el,{hidden:el.hidden,open:el.open,sectionHidden:el.classList.contains('sidebar-section-hidden')}]));
  let count=0;
  for(const root of roots){if(root.classList.contains('sidebar-section-toggle'))continue;
   root.classList.remove('sidebar-section-hidden');
   if(root.tagName==='DETAILS'){
    const own=fold(root.querySelector('summary .menu-name')?.textContent||root.dataset.menuName).includes(query);
    const children=[...root.querySelectorAll(':scope>.children>button')];let matches=0;
    for(const child of children){const show=own||fold(child.textContent).includes(query);child.hidden=!show;if(show)matches++}
    root.hidden=!own&&!matches;if(!root.hidden){root.open=true;count+=matches||1}
   }else{root.hidden=!fold(root.textContent).includes(query);if(!root.hidden)count++}
  }
  for(let i=0;i<roots.length;i++)if(roots[i].classList.contains('sidebar-section-toggle')){let visible=false;for(let j=i+1;j<roots.length&&!roots[j].classList.contains('sidebar-section-toggle');j++)if(!roots[j].hidden)visible=true;roots[i].hidden=!visible}
  status.hidden=count>0;status.textContent=count?'':'Nenhuma opção encontrada.';
 }
 function close(){restore();input.value='';box.hidden=true;button.setAttribute('aria-expanded','false');button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Abrir busca no menu');button.title='Buscar no menu'}
 button.onclick=()=>{if(!box.hidden){close();return}box.hidden=false;button.setAttribute('aria-expanded','true');button.setAttribute('aria-pressed','true');button.setAttribute('aria-label','Recolher busca no menu');button.title='Recolher busca no menu';input.focus()};
 input.addEventListener('input',filter);input.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();button.focus()}});
 document.addEventListener('cicluz-menu-visibility',close);
})();

// Expansion and selection are independent: only the last menu destination is marked.
(()=>{
 const nav=document.querySelector('.nav-tree');if(!nav)return;
 nav.addEventListener('click',event=>{
  if(event.target.closest('.drag-handle,.menu-item-move,.sidebar-section-toggle'))return;
  const target=event.target.closest('summary,button');if(!target||!nav.contains(target))return;
  nav.querySelectorAll('.menu-selected,.active,[aria-current]').forEach(item=>{
   item.classList.remove('menu-selected','active');item.removeAttribute('aria-current');
  });
  target.classList.add('menu-selected','active');target.setAttribute('aria-current','true');
 });
})();
