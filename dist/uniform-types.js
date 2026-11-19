/* DES - Tipos de Uniforme (19/11/2026, Rodrigo): cadastro das peças de uniforme, em Cadastros Geral Colaboradores.
   A lista nasce com as peças que já vinham no sistema (uniforms-data.js) e passa a ser guardada em cicluz-uniformes-tipos-v1 no
   primeiro salvamento. Os códigos (uni-01…) nunca mudam: lançamentos, compras, estoque e referência por cargo apontam para eles.
   Tipo não é apagado, só desativado: o inativo some das escolhas novas e continua aparecendo no histórico. */
(()=>{
'use strict';
const D=window.CicluzUniformData,U=window.CicluzUniformUI;if(!D||!U)return;
const {el,button,fold,confirmDialog}=U;
const ACCENT='var(--section-accent,#ef4444)',GRUPO='Cadastros Geral Colaboradores',TITULO='DES - Tipos de Uniforme',PATH=menuCrumb(2,GRUPO,TITULO);
const ICONE='<path d="M8 3 3 7l3 4 2-1v10h8V10l2 1 3-4-5-4a4 4 0 0 1-8 0z"/>';

const view=el('section','view');view.id='uniform-types-view';view.style.setProperty('--menu-accent',ACCENT);
const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','var(--section-text,#9c1c1c)');
const head=el('div','head'),heading=el('div');heading.append(el('h2',null,TITULO),el('p',null,PATH));head.append(heading);
const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);
addShortcuts(view.id,()=>menuBack(2,GRUPO)());
body.append(el('p','profiles-note','Peças de uniforme usadas em Uniformes Entrega/Recebimento, Uniformes Compras, no controle de estoque e na referência por cargo. O grupo junta as peças na hora de escolher.'));
const aviso=el('p','profiles-error');aviso.setAttribute('role','alert');

/* Cadastro em janela */
const lbl=(name,node,cls)=>{const l=el('label',cls,name);node.setAttribute('aria-label',name.replace(/\s*\*$/,''));l.append(node);return l};
const form=el('form','form-fields uniforms-form');form.noValidate=true;U.soJanela(form,'Dados do tipo de uniforme');
const nome=el('input'),grupo=el('input'),categoria=el('select'),ativo=el('select'),grupos=el('datalist');
nome.maxLength=80;nome.placeholder='Ex.: LOJA/ATENDIMENTO - CAMISA M';grupo.maxLength=60;grupo.placeholder='Ex.: LOJA/ATENDIMENTO';grupos.id='uniform-types-grupos';grupo.setAttribute('list',grupos.id);
categoria.add(new Option('Selecione',''));for(const c of [...D.categories,'Outro'])categoria.add(new Option(c,c));ativo.add(new Option('Ativo','1'));ativo.add(new Option('Inativo','0'));
const erro=el('p','uniforms-wide profiles-error');erro.setAttribute('role','alert');
const sit=U.campoSituacao(ativo,'Situação do tipo de uniforme','Tipo inativo não aparece em novos lançamentos, compras e referências; o histórico continua mostrando.');
const acoes=el('div','uniforms-wide actions'),salvar=el('button','btn','Salvar');salvar.type='submit';acoes.append(button('Cancelar',()=>reset(),'btn ghost'),salvar);
form.append(lbl('Nome do uniforme (peça e tamanho) *',nome,'uniforms-wide'),lbl('Grupo *',grupo),lbl('Categoria *',categoria),grupos,sit,erro,acoes);
const wrap=el('div');body.append(aviso,form,wrap);
let editando=null;
function reset(){U.closeEditor(form);editando=null;nome.value='';grupo.value='';categoria.value='';ativo.value='1';erro.textContent=''}
function abrir(titulo){grupos.replaceChildren(...[...new Set(D.uniforms.map(u=>u.family))].map(f=>new Option(f)));sit.pintar();erro.textContent='';U.openEditor(form,titulo,reset)}
function novo(){reset();abrir('Novo tipo de uniforme')}
function editar(u){reset();editando=u.id;nome.value=u.name;grupo.value=u.family;categoria.value=u.category;ativo.value=u.active===false?'0':'1';abrir('Editar tipo de uniforme: '+u.name)}
function gravar(mudar){if(D.falhou()){erro.textContent='Não foi possível ler os tipos de uniforme salvos. Nada foi gravado para não sobrescrever os dados.';return false}
 const tipos=D.uniforms.map(u=>({id:u.id,name:u.name,category:u.category,family:u.family,active:u.active!==false}));mudar(tipos);try{D.gravarTipos(tipos);return true}catch{erro.textContent='Não foi possível salvar neste navegador.';return false}}
form.onsubmit=e=>{e.preventDefault();erro.textContent='';const n=nome.value.trim().toLocaleUpperCase('pt-BR'),g=grupo.value.trim().toLocaleUpperCase('pt-BR'),c=categoria.value,errs=[];
 if(!n)errs.push('Informe o nome do uniforme.');if(!g)errs.push('Informe o grupo.');if(!c)errs.push('Selecione a categoria.');
 if(n&&D.uniforms.some(u=>u.id!==editando&&fold(u.name)===fold(n)))errs.push('Já existe um tipo de uniforme com este nome.');
 if(errs.length){erro.textContent=errs[0];window.CicluzComprasUI?.sinalizarObrigatorios(form);return}
 const era=editando,ok=gravar(tipos=>{if(era){Object.assign(tipos.find(u=>u.id===era),{name:n,family:g,category:c,active:ativo.value==='1'})}
  else{const maior=tipos.reduce((m,u)=>{const x=/^uni-(\d+)$/.exec(u.id);return x?Math.max(m,+x[1]):m},0);tipos.push({id:'uni-'+String(maior+1).padStart(2,'0'),name:n,family:g,category:c,active:ativo.value==='1'})}});
 if(!ok)return;reset();render();window.CicluzComprasUI?.avisar((era?'Tipo de uniforme atualizado: ':'Tipo de uniforme cadastrado: ')+n+'.')};
function alternar(u){const rodar=()=>{if(gravar(tipos=>{const x=tipos.find(y=>y.id===u.id);x.active=u.active===false}))render();return null};
 if(u.active!==false)confirmDialog('Desativar tipo de uniforme?','"'+u.name+'" deixa de aparecer em novos lançamentos, compras e referências. O estoque e o histórico continuam como estão.','Desativar',rodar,()=>{});else rodar()}

function render(){const cu=window.CicluzComprasUI;wrap.replaceChildren();aviso.textContent=D.falhou()?'Não foi possível ler os tipos de uniforme salvos neste navegador. Nada será gravado para não sobrescrever os dados.':'';if(!cu)return;
 const lista=D.uniforms,sec=cu.secao('Tipos de Uniforme',undefined,cu.pontaDaLista(lista.length,lista.length+(lista.length===1?' tipo cadastrado':' tipos cadastrados'))),linhas=el('div','compras-lista');
 sec.querySelector('.compras-secao-cab h3').replaceChildren(cu.botaoTitulo('Novo Tipo de Uniforme','Cadastrar peça de uniforme',novo));
 if(!lista.length)linhas.append(cu.vazio('Nenhum tipo de uniforme cadastrado.','Use "Novo Tipo de Uniforme" para cadastrar.'));
 for(const u of lista){const on=u.active!==false,row=cu.linhaLista({icone:ICONE,titulo:u.name,detalhe:u.category+' · grupo '+u.family,direita:el('span','account-list-state',on?'Ativo':'Inativo'),acoes:{rotulo:u.name,lista:linhas,aoEditar:()=>editar(u),aoExcluir:()=>alternar(u)}});
  U.botaoSituacao(row,on,u.name);if(!on)row.classList.add('inativo');linhas.append(row)}
 sec.append(linhas);wrap.append(sec)}

window.showUniformTypes=()=>{document.querySelectorAll('.view').forEach(x=>x.classList.remove('show'));view.classList.add('show');document.getElementById('crumb').textContent=PATH;const t=document.getElementById('title');if(t)t.textContent=TITULO;D.recarregar();reset();render();normalizeHeaderActions(view)};
})();
