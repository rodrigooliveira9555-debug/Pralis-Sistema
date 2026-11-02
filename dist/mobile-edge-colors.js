(()=>{
 const root=document.documentElement,mobile=matchMedia('(max-width:760px), (hover:none) and (pointer:coarse)');
 const top=document.createElement('div'),bottom=document.createElement('div');
 top.className='mobile-top-edge-fill';bottom.className='mobile-bottom-edge-fill';
 top.setAttribute('aria-hidden','true');bottom.setAttribute('aria-hidden','true');document.body.append(top,bottom);
 let theme=document.querySelector('meta[name="theme-color"]');
 if(!theme){theme=document.createElement('meta');theme.name='theme-color';document.head.prepend(theme)}
 function hex(value){const match=value.match(/^rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/);return match?'#'+match.slice(1,4).map(n=>Number(n).toString(16).padStart(2,'0')).join(''):value}
 function colour(element){for(let current=element;current;current=current.parentElement){const value=getComputedStyle(current).backgroundColor;if(value&&value!=='transparent'&&value!=='rgba(0, 0, 0, 0)')return hex(value)}return '#ffffff'}
 function update(){
  const menu=document.body.classList.contains('mobile-menu-visible');
  const view=document.querySelector('.view.show'),head=view?.querySelector(':scope>.panel>.head');
  const people=view?.id==='sector-view'&&view.querySelector('#sector-title')?.textContent.trim()==='Gestão de Pessoas';
  let value=document.body.classList.contains('dark-theme')?'#222128':'#ffffff';
  const topHidden=view?.classList.contains('people-top-hidden')||head?.hidden||head&&getComputedStyle(head).display==='none';
  if(!menu&&head&&!topHidden){
   value=people?'#7c3aed':colour(head);
   if(people&&view.style.getPropertyValue('--menu-accent')!=='#7c3aed')view.style.setProperty('--menu-accent','#7c3aed');

  }
  if(root.style.getPropertyValue('--mobile-top-fill')!==value)root.style.setProperty('--mobile-top-fill',value);
  document.querySelectorAll('meta[name="theme-color"]').forEach(meta=>{meta.removeAttribute('media');if(meta.getAttribute('content')!==value)meta.setAttribute('content',value)});
  if(mobile.matches&&root.style.getPropertyValue('background-color')!==value)root.style.setProperty('background-color',value,'important');
 }
 let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;update()})}
 new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden']});
 new MutationObserver(schedule).observe(document.head,{subtree:true,childList:true,attributes:true,attributeFilter:['content','media']});
 mobile.addEventListener('change',schedule);window.addEventListener('resize',schedule);window.addEventListener('pageshow',schedule);document.addEventListener('visibilitychange',schedule);document.addEventListener('cicluz-menu-visibility',schedule);document.addEventListener('transitionend',schedule,true);
 update();
})();
