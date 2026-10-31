(()=>{
function standardize(root=document){const buttons=[...(root.matches?.('button')?[root]:[]),...root.querySelectorAll('button')];for(const button of buttons)if(/^(salvar(?:\s+.*)?|cancelar)$/i.test(button.textContent.trim()))button.classList.add('standard-form-action')}
standardize();new MutationObserver(records=>{for(const r of records){if(r.type==='characterData'){const b=r.target.parentElement?.closest('button');if(b)standardize(b)}else for(const node of r.addedNodes)if(node.nodeType===1)standardize(node)}}).observe(document.body,{childList:true,subtree:true,characterData:true});
})();
