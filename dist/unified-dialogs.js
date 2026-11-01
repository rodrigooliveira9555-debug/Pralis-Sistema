(()=>{
 function sync(){
  const view=document.querySelector('.view.show');
  const accent=view?getComputedStyle(view).getPropertyValue('--menu-accent').trim():'';
  document.querySelectorAll('dialog[open],.modal.show>.dialog').forEach(dialog=>{
   const color=accent||'#7c3aed';
   if(dialog.style.getPropertyValue('--dialog-accent')!==color)dialog.style.setProperty('--dialog-accent',color);
  });
 }
 new MutationObserver(sync).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','class']});sync();
})();
