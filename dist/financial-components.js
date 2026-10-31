function formatFinancialName(value){return String(value||'').toLocaleLowerCase('pt-BR').replace(/^(cnt|vnd|ret|mer|des)(?=\s|$)/i,m=>m.toUpperCase())}
// Ações compartilhadas por Contas e todos os grupos financeiros.
function createFinancialActions({label,container,onEdit,onDelete}){
 const arrow=document.createElement('button');arrow.type='button';arrow.className='account-action-toggle';arrow.textContent='›';arrow.setAttribute('aria-label','Ações de '+label);arrow.setAttribute('aria-expanded','false');
 const actions=document.createElement('div');actions.className='account-row-actions';actions.hidden=true;
 const edit=document.createElement('button');edit.type='button';edit.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4-.8L19 8l-3-3L5 16zM14.5 6.5l3 3"/></svg>';edit.title='Editar';edit.setAttribute('aria-label','Editar '+label);edit.onclick=e=>{e.preventDefault();e.stopPropagation();onEdit()};
 const remove=document.createElement('button');remove.type='button';remove.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7M14 10v7"/></svg>';remove.title='Excluir';remove.setAttribute('aria-label','Excluir '+label);remove.onclick=e=>{e.preventDefault();e.stopPropagation();onDelete()};actions.append(remove,edit);
 arrow.onclick=e=>{e.preventDefault();e.stopPropagation();const opening=actions.hidden;container.querySelectorAll('.account-row-actions').forEach(x=>x.hidden=true);container.querySelectorAll('.account-action-toggle').forEach(x=>x.setAttribute('aria-expanded','false'));actions.hidden=!opening;arrow.setAttribute('aria-expanded',String(opening))};return {arrow,actions};
}
