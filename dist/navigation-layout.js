(()=>{
 const side=document.querySelector('.side'),main=document.querySelector('.main'),top=document.querySelector('.top');
 if(!side||!main||!top)return;
 const footer=document.createElement('footer');footer.className='sidebar-footer';
 const controls=top.querySelector('.side-controls');if(controls)side.insertBefore(controls,side.querySelector('.nav'));
 const user=document.createElement('div');user.className='sidebar-user';user.setAttribute('aria-label','Usuário: Rodrigo Oliveira');
 const avatar=top.querySelector('.avatar');if(avatar)user.append(avatar);
 const name=document.createElement('span');name.className='sidebar-user-name';name.textContent='Rodrigo Oliveira';user.append(name);footer.append(user);side.append(footer);
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
