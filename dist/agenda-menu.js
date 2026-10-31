(()=>{
const tree=document.querySelector('.nav-tree'),other=tree?.querySelector('details[data-menu-name^="Configuração"]');if(!tree||!other||tree.querySelector('.agenda-section-heading'))return;const heading=document.createElement('div');heading.className='agenda-section-heading';heading.textContent='AGENDA';heading.setAttribute('role','heading');heading.setAttribute('aria-level','2');other.before(heading);
})();
