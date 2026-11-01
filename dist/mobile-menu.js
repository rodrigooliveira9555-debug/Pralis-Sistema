(()=>{
 const side=document.querySelector('.side'),main=document.querySelector('.main'),closeButton=document.getElementById('toggleMenu');
 if(!side||!main||!closeButton)return;
 const media=matchMedia('(min-width:0px)');
 const openButton=document.createElement('button');
 openButton.type='button';openButton.className='mobile-menu-open';openButton.textContent='☰';openButton.setAttribute('aria-label','Abrir menu');openButton.setAttribute('aria-expanded','false');
 side.id=side.id||'app-navigation';openButton.setAttribute('aria-controls',side.id);
 document.querySelector('.top>div').prepend(openButton);
 const backdrop=document.createElement('div');backdrop.className='mobile-menu-backdrop';backdrop.hidden=true;backdrop.setAttribute('aria-hidden','true');document.body.append(backdrop);
 let opened=false,scrollY=0,desktopCollapsed=side.classList.contains('collapsed');
 const desktopToggle=closeButton.onclick;
 function renderMenuToggle(expanded){closeButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5v14'+(expanded?'M15 6l-6 6 6 6M9 12h11':'M13 6l6 6-6 6M5 12h14')+'"/></svg>';closeButton.title=expanded?'Recolher menu principal':'Expandir menu principal';closeButton.dataset.navigationControl='menu';}


 function setOpen(value,restoreFocus=true){
  if(!media.matches)return;
  if(value===opened)return;
  opened=value;
  if(value){scrollY=window.scrollY;document.body.style.setProperty('--menu-scroll-top',-scrollY+'px');}
  document.body.classList.toggle('mobile-menu-visible',value);backdrop.hidden=!value;main.inert=value;side.inert=false;side.classList.toggle('collapsed',!value);
  openButton.setAttribute('aria-expanded',String(value));side.removeAttribute('aria-hidden');renderMenuToggle(value);closeButton.setAttribute('aria-label',value?'Recolher menu':'Expandir menu');
  if(value){side.setAttribute('role','dialog');side.setAttribute('aria-modal','true');side.setAttribute('aria-label','Menu principal');closeButton.focus();}
  else{side.removeAttribute('role');side.removeAttribute('aria-modal');document.body.style.removeProperty('--menu-scroll-top');window.scrollTo(0,scrollY);if(restoreFocus)openButton.focus();}
 }
 function sync(){
  if(media.matches){desktopCollapsed=side.classList.contains('collapsed');side.classList.remove('collapsed');document.querySelector('.app').classList.remove('collapsed');renderMenuToggle(true);closeButton.setAttribute('aria-label','Fechar menu');side.inert=true;side.setAttribute('aria-hidden','true');}
  else{if(opened){opened=false;document.body.classList.remove('mobile-menu-visible');backdrop.hidden=true;main.inert=false;document.body.style.removeProperty('--menu-scroll-top');window.scrollTo(0,scrollY);}side.inert=false;side.removeAttribute('aria-hidden');side.removeAttribute('role');side.removeAttribute('aria-modal');side.classList.toggle('collapsed',desktopCollapsed);document.querySelector('.app').classList.toggle('collapsed',desktopCollapsed);renderMenuToggle(!desktopCollapsed);closeButton.setAttribute('aria-label',desktopCollapsed?'Expandir menu':'Recolher menu');openButton.setAttribute('aria-expanded','false');}
 }
 closeButton.onclick=e=>media.matches?setOpen(!opened):desktopToggle.call(closeButton,e);
 openButton.onclick=()=>setOpen(!opened);backdrop.onclick=()=>setOpen(false);
 side.addEventListener('click',e=>{if(e.target.closest('.nav summary')&&side.classList.contains('collapsed'))setOpen(true,false)},true);
 side.addEventListener('click',e=>{const target=e.target.closest('.nav button,.nav a');if(!opened||!target||target.matches('.sidebar-section-toggle')||target.closest('summary'))return;setOpen(false);});
 document.addEventListener('keydown',e=>{if(!opened)return;if(e.key==='Escape'){e.preventDefault();setOpen(false);}if(e.key==='Tab'){const focusable=[...side.querySelectorAll('button,a[href],summary,input,select,[tabindex="0"]')].filter(x=>!x.disabled&&x.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
 document.addEventListener('cicluz-open-menu',()=>{if(media.matches)setOpen(true);else{side.classList.remove('collapsed');document.querySelector('.app').classList.remove('collapsed');renderMenuToggle(true);closeButton.setAttribute('aria-label','Recolher menu');side.querySelector('.overview-link')?.focus()}});
 media.addEventListener('change',sync);sync();setOpen(true,false);
})();
