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
