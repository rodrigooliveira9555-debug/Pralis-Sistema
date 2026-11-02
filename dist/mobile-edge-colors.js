(()=>{
 const root=document.documentElement,mobile=matchMedia('(max-width:760px)');
 const top=document.createElement('div'),bottom=document.createElement('div');
 top.className='mobile-top-edge-fill';bottom.className='mobile-bottom-edge-fill';
 top.setAttribute('aria-hidden','true');bottom.setAttribute('aria-hidden','true');document.body.append(top,bottom);
 const existingTheme=document.querySelector('meta[name="theme-color"]'),theme=existingTheme||document.createElement('meta');
 const previousTheme=existingTheme?.getAttribute('content')||null;
 if(!existingTheme){theme.name='theme-color';document.head.append(theme)}
 const transparent=value=>!value||value==='transparent'||value==='rgba(0, 0, 0, 0)';
 function colour(element){for(let current=element;current;current=current.parentElement){const value=getComputedStyle(current).backgroundColor;if(!transparent(value))return value}return '#ffffff'}
 function update(){
  if(!mobile.matches){if(previousTheme!==null)theme.setAttribute('content',previousTheme);else theme.removeAttribute('content');return}
  const menu=document.body.classList.contains('mobile-menu-visible');
  const head=document.querySelector('.view.show>.panel>.head');
  const active=menu?document.querySelector('.side'):head?.getClientRects().length?head:null;
  const value=active?colour(active):'#ffffff';
  if(root.style.getPropertyValue('--mobile-top-fill')!==value)root.style.setProperty('--mobile-top-fill',value);
  if(theme.getAttribute('content')!==value)theme.setAttribute('content',value);
 }
 let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;update()})}
 new MutationObserver(records=>{if(records.some(record=>record.target!==root&&record.target!==theme))schedule()}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden']});
 mobile.addEventListener('change',schedule);window.addEventListener('resize',schedule);window.addEventListener('pageshow',schedule);document.addEventListener('cicluz-menu-visibility',schedule);document.addEventListener('transitionend',schedule,true);
 update();
})();
