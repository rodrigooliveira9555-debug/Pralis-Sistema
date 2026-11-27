(()=>{
 function sync(){
  const view=document.querySelector('.view.show');
  const accent=view?getComputedStyle(view).getPropertyValue('--menu-accent').trim():'';
  document.querySelectorAll('dialog[open],.modal.show>.dialog').forEach(dialog=>{
   const color=dialog.dataset.accent||accent||'#7c3aed';
   if(dialog.style.getPropertyValue('--dialog-accent')!==color)dialog.style.setProperty('--dialog-accent',color);
  });
 }
 // Enquanto a página carrega não há diálogo aberto: uma rodada só no fim, em vez de recalcular o estilo a cada script.
 let esperando=false;
 const aoMudar=()=>{if(document.readyState!=='loading')return sync();if(!esperando){esperando=true;document.addEventListener('DOMContentLoaded',sync,{once:true})}};
 new MutationObserver(aoMudar).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','class']});sync();
})();
