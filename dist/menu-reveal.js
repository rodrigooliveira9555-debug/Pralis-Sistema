(()=>{
 const side=document.querySelector('.side'),nav=side?.querySelector('.nav');if(!nav)return;
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 function reveal(anchor,region){
  if(!anchor?.isConnected||!region?.getClientRects().length)return;
  const viewport=nav.getBoundingClientRect(),title=anchor.getBoundingClientRect(),content=region.getBoundingClientRect();
  const visibleBottom=Math.min(viewport.bottom,window.innerHeight)-12,visibleTop=viewport.top+8;
  if(content.bottom<=visibleBottom&&title.top>=visibleTop)return;
  let shift=content.bottom-visibleBottom;
  // Keep the selected heading and the beginning of its children together.
  shift=Math.min(shift,title.top-visibleTop);
  if(title.top<visibleTop)shift=title.top-visibleTop;
  if(Math.abs(shift)>1)nav.scrollTo({top:Math.max(0,nav.scrollTop+shift),behavior:reduced.matches?'instant':'smooth'});
 }
 side.addEventListener('click',event=>{
  const target=event.target.closest('summary,.sidebar-section-toggle,.unified-expand-toggle,.tree-control');if(!target||event.target.closest('.drag-handle,.menu-item-move'))return;
  const details=target.tagName==='SUMMARY'?target.parentElement:null;
  const wasOpen=details?.open,wasExpanded=target.getAttribute('aria-expanded');
  const previous=new Set(nav.querySelectorAll('details[open]'));
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(details){if(!wasOpen&&details.open)reveal(target,details);return;}
   if(target.classList.contains('sidebar-section-toggle')){
    if(wasExpanded!=='true'&&target.getAttribute('aria-expanded')==='true'){
     const next=target.nextElementSibling;if(next)reveal(target,next);
    }return;
   }
   const newlyOpen=[...nav.querySelectorAll('details[open]')].filter(el=>!previous.has(el)&&el.getClientRects().length);
   const view=nav.getBoundingClientRect();const nearby=newlyOpen.find(el=>{const r=el.querySelector('summary')?.getBoundingClientRect();return r&&r.bottom>=view.top&&r.top<view.bottom})||newlyOpen[0];
   if(nearby)reveal(nearby.querySelector('summary'),nearby);
  }));
 },true);
})();
