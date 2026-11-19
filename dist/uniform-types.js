/* DES - Tipos de Uniforme (19/11/2026, Rodrigo): cadastro das peças de uniforme, em Cadastros Geral Colaboradores.
   A lista nasce com as peças que já vinham no sistema (uniforms-data.js) e passa a ser guardada em cicluz-uniformes-tipos-v1 no
   primeiro salvamento. Os códigos (uni-01…) nunca mudam: lançamentos, compras, estoque e referência por cargo apontam para eles.
   Tipo não é apagado, só desativado: o inativo some das escolhas novas e continua aparecendo no histórico. */
(()=>{
'use strict';
const D=window.CicluzUniformData,U=window.CicluzUniformUI;if(!D||!U)return;
const {el,button,fold,confirmDialog}=U;
const ACCENT='var(--section-accent,#ef4444)',GRUPO='Cadastros Geral Colaboradores',TITULO='DES - Tipos de Uniforme',PATH=menuCrumb(2,GRUPO,TITULO);
/* Ícone de cada peça (19/11/2026, Rodrigo): segue o que está escrito no nome — boné, touca, camisa, calça, avental ou calçado. Traço
   simples, no mesmo peso dos outros ícones de linha. Peça que não é nenhuma dessas usa a camisa. */
const ICONES_PECA={
 camisa:'<path d="M8 3 3 7l3 4 2-1v10h8V10l2 1 3-4-5-4a4 4 0 0 1-8 0z"/>',
 calca:'<path d="M7 3h10l1.5 18H14l-2-11-2 11H5.5z"/><path d="M7 6.5h10"/>',
 bone:'<path d="M4 15a8 8 0 0 1 16 0"/><path d="M4 15h15.5c1.8 0 3 1.1 3 2.5H9.5"/><path d="M12 7V5.5"/>',
 touca:'<path d="M5 15.5V13a7 7 0 0 1 14 0v2.5"/><path d="M4 15.5h16V20H4z"/><path d="M9 15.5V20M15 15.5V20"/>',
 avental:'<path d="M9 5h6v3.5l3 2.5v10H6V11l3-2.5z"/><path d="M9 5c0-3 6-3 6 0"/><path d="M10 14.5h4v3h-4z"/>',
 calcado:'<path d="M3 9v8h18v-1.3c0-1.3-.9-2.3-2.2-2.6L15 12.5l-4-4-2.5 2z"/><path d="M3 20h18"/><path d="M12 12.5l1.5-1.5M14.5 14l1.5-1.5"/>'
};
const NOMES_PECA=[['camisa','Camisa'],['calca','Calça'],['bone','Boné'],['touca','Touca'],['avental','Avental'],['calcado','Calçado']];
/* O ícone escolhido no cadastro vale; sem escolha (automático), vale o que está escrito no nome. Ícone da biblioteca é guardado pelo id. */
function desenhoDe(id){return ICONES_PECA[id]||window.CicluzIconLibrary?.custom.find(x=>x.id===id)?.path||''}
function iconeDaPeca(u){const escolhido=u.icon&&desenhoDe(u.icon);if(escolhido)return escolhido;const p=fold(u.name.split(' - ').pop());if(p.startsWith('bone'))return ICONES_PECA.bone;if(p.startsWith('touca'))return ICONES_PECA.touca;if(p.startsWith('calcado'))return ICONES_PECA.calcado;if(p.startsWith('calca'))return ICONES_PECA.calca;if(p.startsWith('avental'))return ICONES_PECA.avental;return ICONES_PECA.camisa}

const view=el('section','view');view.id='uniform-types-view';view.style.setProperty('--menu-accent',ACCENT);
const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','var(--section-text,#9c1c1c)');
const head=el('div','head'),heading=el('div');heading.append(el('h2',null,TITULO),el('p',null,PATH));head.append(heading);
const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);
addShortcuts(view.id,()=>menuBack(2,GRUPO)());
body.append(el('p','profiles-note','Peças de uniforme usadas em Uniformes Entrega (-) Recebimento (+), no controle de estoque e na referência por cargo. O grupo junta as peças na hora de escolher.'));
const aviso=el('p','profiles-error');aviso.setAttribute('role','alert');

/* Cadastro em janela */
const lbl=(name,node,cls)=>{const l=el('label',cls,name);node.setAttribute('aria-label',name.replace(/\s*\*$/,''));l.append(node);return l};
const form=el('form','form-fields uniforms-form');form.noValidate=true;U.soJanela(form,'Dados do tipo de uniforme');
const nome=el('input'),grupo=el('input'),categoria=el('select'),ativo=el('select'),grupos=el('datalist');
nome.maxLength=80;nome.placeholder='Ex.: LOJA/ATENDIMENTO - CAMISA M';grupo.maxLength=60;grupo.placeholder='Ex.: LOJA/ATENDIMENTO';grupos.id='uniform-types-grupos';grupo.setAttribute('list',grupos.id);
categoria.add(new Option('Selecione',''));for(const c of [...D.categories,'Outro'])categoria.add(new Option(c,c));ativo.add(new Option('Ativo','1'));ativo.add(new Option('Inativo','0'));
const erro=el('p','uniforms-wide profiles-error');erro.setAttribute('role','alert');
/* Identidade no padrão único do sistema (U.blocoIcone / U.quadroIdentidade / U.previaIcone, o desenho do cadastro de grupo): "Automático"
   segue o nome; depois as seis peças e os ícones importados na biblioteca do sistema. O cartão de prévia mostra o ícone que vai valer. */
const opcoesDeIcone=()=>[{id:'',label:'Automático (pelo nome)',desenho:iconeDaPeca({name:nome.value||''})},...NOMES_PECA.map(([id,n])=>({id,label:n,desenho:ICONES_PECA[id]})),...(window.CicluzIconLibrary?.custom||[]).filter(x=>x.path).map(x=>({id:x.id,label:x.label||x.name||'Ícone da biblioteca',desenho:x.path}))];
const previa=U.previaIcone(),icone=U.blocoIcone({rotulo:'Ícone do tipo de uniforme',opcoes:opcoesDeIcone(),escolhido:'',aoMudar:()=>pintarPrevia()});
function repintarIcones(){const v=icone.valor;icone.pintar(opcoesDeIcone());icone.definir(v)}
function pintarPrevia(){previa.pintar(iconeDaPeca({name:nome.value||'',icon:icone.valor}),nome.value.trim().toLocaleUpperCase('pt-BR')||'Nome do uniforme')}
nome.addEventListener('input',()=>{if(!icone.valor)repintarIcones();pintarPrevia()});
/* VÍNCULO COM CARGO (19/11/2026, Rodrigo): segundo quadro da janela. Supera a tela "DES - Uniformes por Cargo". O vínculo fica onde
   sempre ficou — a referência por cargo, em cicluz-uniformes-v1 (references[cargo].items) — para o lançamento continuar mostrando as
   peças do cargo. Vincular por aqui inclui a peça na referência do cargo com quantidade 1 (quem já tinha quantidade mantém a sua);
   desvincular tira a peça da referência daquele cargo. A escolha usa a janela padrão de lista de escolha (seletorArvore). */
const cargos=new Set(),quadroCargos=el('fieldset','uniforms-wide quadro-interno'),resumoCargos=el('div','campo-de-locais-resumo');quadroCargos.append(el('legend',null,'Vínculo com cargo'));
const listaDeCargos=()=>(window.CicluzUniformStore?.jobs()||[]).slice().sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
function pintarCargos(){const nomes=listaDeCargos().filter(j=>cargos.has(j.key)).map(j=>j.name);resumoCargos.replaceChildren(el('small','profiles-note',nomes.length?nomes.length+(nomes.length===1?' cargo vinculado: ':' cargos vinculados: ')+nomes.slice(0,8).join(', ')+(nomes.length>8?' e mais '+(nomes.length-8):'')+'.':'Nenhum cargo vinculado.'))}
function escolherCargos(){const C=window.CicluzContratos;if(!C)return;C.seletorArvore({titulo:'Cargos',sigla:'DES',cores:{cor:ACCENT,corTexto:'var(--section-text,#9c1c1c)'},rotuloBusca:'Buscar cargo',vazio:'Nenhum cargo cadastrado em DES - Cargos C/Salários.',iconeFolha:'<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0"/>',
 nos:()=>listaDeCargos().map(j=>({id:j.key,nome:j.name,ativo:true,folha:true,conta:[j.full&&j.full!==j.name?j.full:'',j.cbo?'CBO '+j.cbo:''].filter(Boolean).join(' · ')||'Cargo'})),marcados:cargos,aoConfirmar:s=>{cargos.clear();s.forEach(k=>cargos.add(k));pintarCargos()}})}
{const cu=window.CicluzComprasUI,b=cu?cu.botaoTitulo('Cargos','Escolher os cargos que usam este uniforme',escolherCargos):button('Cargos',escolherCargos,'btn');const caixa=el('div','campo-de-locais');caixa.append(b,resumoCargos);quadroCargos.append(caixa)}
function carregarCargos(id){cargos.clear();const st=window.CicluzUniformStore;if(st&&id){st.load();for(const [k,r] of Object.entries(st.get().references||{}))if((r.items||[]).some(i=>i.uniformId===id))cargos.add(k)}pintarCargos()}
function gravarCargos(id){const st=window.CicluzUniformStore;if(!st)return true;st.load();const jobs=listaDeCargos();return st.transact(()=>{const refs=st.get().references;for(const j of jobs){const ref=refs[j.key],tem=!!ref&&(ref.items||[]).some(i=>i.uniformId===id),quer=cargos.has(j.key);
  if(quer&&!tem){const r=ref||(refs[j.key]={jobName:j.full||j.name,items:[]});r.items.push({uniformId:id,quantity:1})}else if(!quer&&tem){ref.items=ref.items.filter(i=>i.uniformId!==id);if(!ref.items.length)delete refs[j.key]}}})}
const sit=U.campoSituacao(ativo,'Situação do tipo de uniforme',''); /* sem texto de ajuda dentro do quadro, como no cadastro de grupo */
const acoes=el('div','uniforms-wide actions'),salvar=el('button','btn','Salvar');salvar.type='submit';acoes.append(button('Cancelar',()=>reset(),'btn ghost'),salvar);
sit.classList.remove('uniforms-wide');
form.append(U.quadroIdentidade(lbl('Nome do uniforme (peça e tamanho) *',nome),icone),lbl('Grupo *',grupo),sit,lbl('Categoria *',categoria),grupos,previa.box,quadroCargos,erro,acoes);
const wrap=el('div');body.append(aviso,form,wrap);
let editando=null;
function reset(){U.closeEditor(form);editando=null;nome.value='';grupo.value='';categoria.value='';ativo.value='1';icone.definir('');cargos.clear();pintarCargos();erro.textContent=''}
function abrir(titulo){grupos.replaceChildren(...[...new Set(D.uniforms.map(u=>u.family))].map(f=>new Option(f)));sit.pintar();repintarIcones();pintarPrevia();erro.textContent='';U.openEditor(form,titulo,reset)}
function novo(){reset();abrir('Novo tipo de uniforme')}
function editar(u){reset();editando=u.id;nome.value=u.name;grupo.value=u.family;categoria.value=u.category;ativo.value=u.active===false?'0':'1';icone.definir(u.icon&&desenhoDe(u.icon)?u.icon:'');carregarCargos(u.id);abrir('Editar tipo de uniforme: '+u.name)}
function gravar(mudar){if(D.falhou()){erro.textContent='Não foi possível ler os tipos de uniforme salvos. Nada foi gravado para não sobrescrever os dados.';return false}
 const tipos=D.uniforms.map(u=>({id:u.id,name:u.name,category:u.category,family:u.family,active:u.active!==false,...(u.icon?{icon:u.icon}:{})}));mudar(tipos);try{D.gravarTipos(tipos);return true}catch{erro.textContent='Não foi possível salvar neste navegador.';return false}}
form.onsubmit=e=>{e.preventDefault();erro.textContent='';const n=nome.value.trim().toLocaleUpperCase('pt-BR'),g=grupo.value.trim().toLocaleUpperCase('pt-BR'),c=categoria.value,errs=[];
 if(!n)errs.push('Informe o nome do uniforme.');if(!g)errs.push('Informe o grupo.');if(!c)errs.push('Selecione a categoria.');
 if(n&&D.uniforms.some(u=>u.id!==editando&&fold(u.name)===fold(n)))errs.push('Já existe um tipo de uniforme com este nome.');
 if(errs.length){erro.textContent=errs[0];window.CicluzComprasUI?.sinalizarObrigatorios(form);return}
 const era=editando,escolhido=icone.valor;let idGravado=era;const ok=gravar(tipos=>{if(era){const t=tipos.find(u=>u.id===era);Object.assign(t,{name:n,family:g,category:c,active:ativo.value==='1'});if(escolhido)t.icon=escolhido;else delete t.icon}
  else{const maior=tipos.reduce((m,u)=>{const x=/^uni-(\d+)$/.exec(u.id);return x?Math.max(m,+x[1]):m},0);idGravado='uni-'+String(maior+1).padStart(2,'0');tipos.push({id:idGravado,name:n,family:g,category:c,active:ativo.value==='1',...(escolhido?{icon:escolhido}:{})})}});
 if(!ok)return;if(!gravarCargos(idGravado)){erro.textContent='O tipo foi salvo, mas não foi possível gravar o vínculo com os cargos neste navegador.';return}reset();render();window.CicluzComprasUI?.avisar((era?'Tipo de uniforme atualizado: ':'Tipo de uniforme cadastrado: ')+n+'.')};
function alternar(u){const rodar=()=>{if(gravar(tipos=>{const x=tipos.find(y=>y.id===u.id);x.active=u.active===false}))render();return null};
 if(u.active!==false)confirmDialog('Desativar tipo de uniforme?','"'+u.name+'" deixa de aparecer em novos lançamentos, compras e referências. O estoque e o histórico continuam como estão.','Desativar',rodar,()=>{});else rodar()}

function render(){const cu=window.CicluzComprasUI;wrap.replaceChildren();aviso.textContent=D.falhou()?'Não foi possível ler os tipos de uniforme salvos neste navegador. Nada será gravado para não sobrescrever os dados.':'';if(!cu)return;
 const lista=D.uniforms,sec=cu.secao('Tipos de Uniforme',undefined,cu.pontaDaLista(lista.length,lista.length+(lista.length===1?' tipo cadastrado':' tipos cadastrados'))),linhas=el('div','compras-lista');
 sec.querySelector('.compras-secao-cab h3').replaceChildren(cu.botaoTitulo('Novo Tipo de Uniforme','Cadastrar peça de uniforme',novo));
 if(!lista.length)linhas.append(cu.vazio('Nenhum tipo de uniforme cadastrado.','Use "Novo Tipo de Uniforme" para cadastrar.'));
 for(const u of lista){const on=u.active!==false,row=cu.linhaLista({icone:iconeDaPeca(u),titulo:u.name,detalhe:u.category+' · grupo '+u.family+' · '+(q=>q===1?'1 cargo':q+' cargos')(Object.values(window.CicluzUniformStore?.get().references||{}).filter(r=>(r.items||[]).some(i=>i.uniformId===u.id)).length),direita:el('span','account-list-state',on?'Ativo':'Inativo'),acoes:{rotulo:u.name,lista:linhas,aoEditar:()=>editar(u),aoExcluir:()=>alternar(u)}});
  U.botaoSituacao(row,on,u.name);if(!on)row.classList.add('inativo');linhas.append(row)}
 sec.append(linhas);wrap.append(sec)}

window.CicluzUniformTypes={ICONES_PECA,NOMES_PECA,iconeDaPeca};
window.showUniformTypes=()=>{document.querySelectorAll('.view').forEach(x=>x.classList.remove('show'));view.classList.add('show');document.getElementById('crumb').textContent=PATH;const t=document.getElementById('title');if(t)t.textContent=TITULO;D.recarregar();window.CicluzUniformStore?.load();reset();render();normalizeHeaderActions(view)};
})();
