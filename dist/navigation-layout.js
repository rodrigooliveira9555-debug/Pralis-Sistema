(()=>{
 const side=document.querySelector('.side'),main=document.querySelector('.main'),top=document.querySelector('.top');
 if(!side||!main||!top)return;
 const footer=document.createElement('footer');footer.className='sidebar-footer';
 const controls=top.querySelector('.side-controls');if(controls){side.insertBefore(controls,side.querySelector('.nav'));const toggle=document.getElementById('toggleMenu');if(toggle){toggle.classList.add('menu-layout-toggle');side.prepend(toggle)}}
 const divider=document.createElement('div');divider.className='menu-top-divider';divider.setAttribute('aria-hidden','true');side.insertBefore(divider,controls||side.querySelector('.nav'));
 const menuToggle=document.getElementById('toggleMenu');if(controls&&menuToggle)controls.append(menuToggle);
 const management=side.querySelector('[data-section="management"]');if(management){management.classList.add('menu-management-heading');side.insertBefore(management,side.querySelector('.nav'))}
 const session=window.CicluzSessao,userName=session?.perfil?.nome||'';const user=document.createElement('div');user.className='sidebar-user';user.setAttribute('aria-label','Usuário: '+userName);
 const avatar=top.querySelector('.avatar');if(avatar)user.append(avatar);
 const name=document.createElement('span');name.className='sidebar-user-name';name.textContent=userName;user.append(name);if(avatar)avatar.textContent=userName.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0].toUpperCase()).join('');if(session){const logout=document.createElement('button');logout.type='button';logout.className='sidebar-user-sair';logout.title='Sair';logout.setAttribute('aria-label','Sair do sistema');logout.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>';logout.onclick=async()=>{logout.disabled=true;if(!await session.sair())logout.disabled=false};user.append(logout)}footer.append(user);side.append(footer);
 const brand=side.querySelector('.brand');
 const fullLogo=brand?.querySelector('.brand-logo-wrap');
 // The line and logo share one beam profile, thickness, clock and pixel speed.
 const svgNS='http://www.w3.org/2000/svg';
 const beamTracks=[];
 const beamProfile=[[42,.08,5.4],[34,.16,5.7],[26,.28,6],[18,.48,6.3],[12,.88,6.6]];
 function addBeam(svg,d,mask){
  const group=document.createElementNS(svgNS,'g');
  if(mask)group.setAttribute('mask',mask);
  svg.append(group);
  const layers=beamProfile.map(([size,opacity,width])=>{
   const path=document.createElementNS(svgNS,'path');
   for(const [key,value] of Object.entries({d,fill:'none',stroke:'#fff','stroke-width':width,'stroke-opacity':opacity,'stroke-linecap':'butt'}))path.setAttribute(key,value);
   group.append(path);return {path,size};
  });
  const track={svg,layers,length:layers[0].path.getTotalLength()};beamTracks.push(track);return track;
 }
 if(fullLogo){
  fullLogo.querySelectorAll('.logo-path-light,.logo-color-light').forEach(el=>el.remove());
  fullLogo.insertAdjacentHTML('beforeend','<svg class="logo-color-light" viewBox="0 0 220 64" aria-hidden="true"><defs><mask id="logo-ribbon-alpha-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="220" height="64" style="mask-type:alpha"><image href="cicluz-gestao-padaria-logo.png" width="177.6" height="64" preserveAspectRatio="none"/></mask></defs></svg>');
  addBeam(fullLogo.querySelector('.logo-color-light'),'M 25.7 16 C 25.7 6.8 37.2 6.8 37.2 16 L 37.2 19 C 44 13.6 49.7 15.1 49.3 22.2 C 49 25.2 46.4 27 43 28.8 L 20 41 C 13.4 44.5 9.2 37.4 15.2 32.1 L 18.3 29.2 C 8.2 23.4 12.3 12.9 19.3 16.3 L 43 29.1 C 52.7 34.5 49.3 44 42.5 41.6 L 37.2 39 C 37.2 50.7 25.7 50.7 25.7 41 L 25.7 16 Z','url(#logo-ribbon-alpha-mask)');
 }
 const lineSvg=document.createElementNS(svgNS,'svg');lineSvg.classList.add('divider-beam');lineSvg.setAttribute('aria-hidden','true');divider.append(lineSvg);
 const lineTrack=addBeam(lineSvg,'M 0 1.5 H 100');
 const resizeBeam=()=>{const width=divider.clientWidth;lineSvg.setAttribute('viewBox','0 0 '+width+' 3');lineTrack.layers.forEach(({path})=>path.setAttribute('d','M 0 1.5 H '+width));lineTrack.length=width;};
 new ResizeObserver(resizeBeam).observe(divider);resizeBeam();
 const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)');
 const start=performance.now();let lastFrame=0;
 function animateBeam(now){
  if(now-lastFrame>30){
   lastFrame=now;
   for(const track of beamTracks){
    const distance=((now-start)/1000*24)%Math.max(1,track.length);
    for(const {path,size} of track.layers){
     path.style.display=reducedMotion.matches?'none':'';
     const length=Math.min(size,track.length*.8);
     path.setAttribute('stroke-dasharray',length+' '+Math.max(0,track.length-length));
     path.setAttribute('stroke-dashoffset',String(-distance+length/2));
    }
   }
  }
  requestAnimationFrame(animateBeam);
 }
 requestAnimationFrame(animateBeam);
 let outlineId=0;
 window.CicluzBeam={attachOutline(host){
  const svg=document.createElementNS(svgNS,'svg'),id='cicluz-search-outline-'+(++outlineId);
  svg.setAttribute('class','people-search-outline');svg.setAttribute('aria-hidden','true');
  svg.innerHTML='<defs><linearGradient id="'+id+'"><stop offset="0%" stop-color="#ff0000"/><stop offset="13.043%" stop-color="#ff0000"/><stop offset="17.391%" stop-color="#ff8000"/><stop offset="30.435%" stop-color="#ff8000"/><stop offset="34.783%" stop-color="#f2d000"/><stop offset="47.826%" stop-color="#f2d000"/><stop offset="52.174%" stop-color="#00e833"/><stop offset="65.217%" stop-color="#00e833"/><stop offset="69.565%" stop-color="#0055ff"/><stop offset="82.609%" stop-color="#0055ff"/><stop offset="86.957%" stop-color="#8000ff"/><stop offset="100%" stop-color="#8000ff"/></linearGradient><mask id="'+id+'-mask" style="mask-type:alpha"><path fill="none" stroke="white" stroke-width="2"/></mask></defs><path class="outline-color" fill="none" stroke="url(#'+id+')" stroke-width="2"/>';
  host.append(svg);const track=addBeam(svg,'M 0 0 H 1','url(#'+id+'-mask)');
  const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;const r=Math.min(8,h/2-1,w/2-1),x=w-1,y=h-1;
   const d='M '+(1+r)+' 1 H '+(x-r)+' A '+r+' '+r+' 0 0 1 '+x+' '+(1+r)+' V '+(y-r)+' A '+r+' '+r+' 0 0 1 '+(x-r)+' '+y+' H '+(1+r)+' A '+r+' '+r+' 0 0 1 1 '+(y-r)+' V '+(1+r)+' A '+r+' '+r+' 0 0 1 '+(1+r)+' 1 Z';
   svg.setAttribute('viewBox','0 0 '+w+' '+h);svg.querySelectorAll('path').forEach(p=>p.setAttribute('d',d));track.length=track.layers[0].path.getTotalLength();};new ResizeObserver(resize).observe(host);resize();
 },attachSymbol(host){
  const original=fullLogo?.querySelector('.logo-color-light');if(!original)return;
  const svg=original.cloneNode(true),id='footer-logo-alpha';
  svg.setAttribute('viewBox','10 6 42 44');svg.setAttribute('class','people-footer-symbol');
  svg.querySelector('mask').id=id;
  svg.querySelectorAll(':scope>g').forEach(el=>el.remove());
  const art=document.createElementNS(svgNS,'image');art.setAttribute('href','cicluz-gestao-padaria-logo.png');art.setAttribute('width','177.6');art.setAttribute('height','64');art.setAttribute('preserveAspectRatio','none');svg.append(art);
  host.append(svg);addBeam(svg,original.querySelector('g>path').getAttribute('d'),'url(#'+id+')');
 }};
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
 const side=document.querySelector('.side'),tree=side?.querySelector('.nav-tree'),controls=side?.querySelector('.side-controls'),management=side?.querySelector('.menu-management-heading');
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
  if(!original)original=new Map([...new Set([...roots,...entries,...(management?[management]:[])])].map(el=>[el,{hidden:el.hidden,open:el.open,sectionHidden:el.classList.contains('sidebar-section-hidden')}]));
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
  if(management){const end=roots.findIndex(el=>el.classList.contains('sidebar-section-toggle'));management.hidden=!roots.slice(0,end<0?roots.length:end).some(el=>!el.hidden)}
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
