(()=>{
const tree=document.querySelector('.nav-tree'),other=tree?.querySelector('details[data-menu-name^="Configuração"]');if(!tree||!other)return;
const members=[...tree.children],management=members.filter(n=>n!==other&&!n.dataset.menuName?.startsWith('Formulários')),others=members.filter(n=>!management.includes(n));
const key='cicluz-sidebar-sections-v1';let state={};try{state=JSON.parse(localStorage.getItem(key)||'{}')}catch(e){}
const calendar='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18M7 15h3M14 15h3"/></svg>';
const agenda=document.createElement('details');agenda.className='agenda-menu-item';agenda.dataset.menuName='Agenda/Atividades';agenda.innerHTML='<summary><span class="menu-icon-circle" style="color:#7c3aed">'+calendar+'</span><span class="menu-name"><span>Agenda/Atividades</span></span></summary><div class="children"><p class="agenda-empty">Nenhuma atividade cadastrada.</p></div>';other.before(agenda);
tree.classList.add('sidebar-sectioned');
function section(id,label,nodes,before){const b=document.createElement('button');b.type='button';b.className='sidebar-section-toggle';b.innerHTML='<span>'+label+'</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 9 7 7 7-7"/></svg>';before.before(b);function update(){const open=state[id]!==false;b.setAttribute('aria-expanded',String(open));b.setAttribute('aria-label',(open?'Recolher ':'Expandir ')+label);nodes.forEach(n=>n.classList.toggle('sidebar-section-hidden',!open))}b.onclick=()=>{state[id]=state[id]===false;update();try{localStorage.setItem(key,JSON.stringify(state))}catch(e){}};update()}
section('management','GESTÃO',management,tree.firstElementChild);section('agenda','AGENDA',[agenda],agenda);section('others','OUTROS',others,other);
})();
