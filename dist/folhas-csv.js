/* Importação manual de CSV (exportado da Conplus) para as quatro telas de documentos de pagamento.
   Solução TEMPORÁRIA: CSV -> leitura -> normalização -> mesmo modelo de dados das telas -> visualização.
   Quando a API da Conplus existir, basta outra fonte (CicluzFolhas.usarFonte) entregando o mesmo modelo.
   Segurança: o arquivo é lido só no navegador; os dados ficam APENAS na memória desta página (nada vai para
   localStorage, IndexedDB, servidor ou console). Ao recarregar a página, é preciso importar de novo.
   Não há layout oficial da Conplus conhecido aqui: o sistema sugere a correspondência das colunas pelo nome e o usuário
   confere/ajusta antes de confirmar. Nada é recalculado nem inventado: valor ausente fica "—". */
(()=>{
'use strict';
const U=window.CicluzUniformUI,G=window.CicluzGP;if(!U||!G||!window.CicluzFolhas)return;
const {el,dialog}=U;
const IC={up:'M12 16V4M7 9l5-5 5 5M4 20h16',doc:'M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6',print:'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',trash:'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13'};
const norm=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');

/* ---------- Campos de cada tela (os mesmos já exibidos; nomes alternativos só ajudam a sugerir a coluna) ---------- */
const mk=(key,label,alias,kind='s')=>({key,label,alias:[label,...alias],kind});
const BASES=[['irrf','IRRF'],['inss','INSS'],['inssEmpresa','INSS Empresa']],PER=[['normal','Normal'],['13','13°'],['ferias','Férias'],['lucro','Lucro']];
const FOLHA=[
 mk('codigo','Func (código do funcionário)',['Func','Código','Cód.','Matrícula','Código do funcionário']),mk('nome','Nome',['Colaborador','Funcionário','Nome do funcionário']),
 mk('cpf','CPF do colaborador (só para vincular ao cadastro)',['CPF','CPF do funcionário']),
 mk('adm','Adm (data de admissão)',['Adm','Admissão','Data de admissão'],'d'),mk('dem','Dem (data de demissão)',['Dem','Demissão','Data de demissão'],'d'),
 mk('depIR','Dep.IR',['Dep IR','Dependentes IR']),mk('deducaoIR','Dedução IR',['Deducao IR'],'m'),mk('depSF','Dep.SF',['Dep SF','Dependentes salário-família']),
 mk('cargo','Cargo',['Função']),mk('chm','C.H.M.',['CHM','Carga horária mensal']),mk('salario','Salário',['Salario base','Salário base'],'m'),mk('cbo','CBO',[]),mk('sind','Sind',['Sindicato']),
 mk('freg','FReg',['Forma de registro']),mk('situacao','Situação',['Situacao']),mk('filial','Filial',[]),mk('cnpj','CNPJ/CPF (documento da empresa)',['CNPJ','CNPJ/CPF','CNPJ CPF']),mk('organograma','Organograma',[]),
 mk('competencia','Competência',['Comp.','Mês/Ano','Mês referência','Referência da folha'],'c'),
 mk('evCod','Evento — código',['Cód. Evento','Código do evento','Evento','Cod Evento']),mk('evNome','Evento — descrição',['Descrição','Descrição do evento','Nome do evento','Rubrica']),
 mk('evNat','Evento — natureza',['Natureza','Tipo do evento','Tipo evento'],'n'),mk('evRef','Evento — referência',['Referência','Ref.','Ref']),mk('evValor','Evento — valor',['Valor','Valor do evento'],'m'),
 mk('totProventos','Total — proventos',['Total proventos','Proventos'],'m'),mk('totVantagens','Total — vantagens',['Total vantagens','Vantagens'],'m'),mk('totDescontos','Total — descontos',['Total descontos','Descontos'],'m'),mk('totLiquido','Total — líquido',['Líquido','Valor líquido','Total líquido'],'m'),
 ...BASES.flatMap(([b,n])=>PER.map(([p,pn])=>mk('bases.'+b+'.'+p,'Base '+n+' — '+pn,['Base '+n+' '+pn,n+' '+pn],'m'))),
 mk('bases.fgts.base','FGTS GFIP — base',['Base FGTS','FGTS base'],'m'),mk('bases.fgts.valor','FGTS GFIP — valor',['Valor FGTS','FGTS valor','FGTS'],'m'),mk('bases.grrf.base','FGTS GRRF — base',['Base GRRF'],'m'),mk('bases.grrf.valor','FGTS GRRF — valor',['Valor GRRF','GRRF'],'m'),
 mk('bases.pis.base','PIS — base',['Base PIS'],'m'),mk('bases.pis.valor','PIS — valor',['Valor PIS','PIS'],'m'),mk('bases.difTeto','Base Dif. Teto VA.',['Dif Teto VA','Base Dif Teto'],'m'),mk('adicionais','Dados adicionais',['Observações','Observação'],'t')];
const RESC=[
 mk('codigo','Código (funcionário)',['Func','Código','Matrícula']),mk('nome','Nome',['Colaborador','Funcionário']),mk('cpf','CPF do colaborador (só para vincular ao cadastro)',['CPF']),mk('cargo','Cargo',[]),mk('empresa','Empresa',[]),mk('causa','Causa da demissão',['Causa','Motivo']),
 mk('adm','Adm (data de admissão)',['Adm','Admissão'],'d'),mk('avisoPrevio','Aviso prévio',['Aviso'],'d'),mk('dem','Dem (data de demissão)',['Dem','Demissão','Data de demissão'],'d'),mk('seq','Seq',['Sequência']),
 mk('salario','Salário',[],'m'),mk('saldoFgts','Saldo FGTS',['Saldo do FGTS'],'m'),mk('fgtsGrrf','FGTS-GRRF',['FGTS GRRF','GRRF'],'m'),
 mk('proventos','Proventos',['Total proventos'],'m'),mk('descontos','Descontos',['Total descontos'],'m'),mk('liquido','Líquido',['Valor líquido','Total líquido'],'m'),mk('competencia','Competência',['Comp.','Mês/Ano'],'c')];
const FER=[
 mk('mes','Mês',['Competência','Mês/Ano'],'c'),mk('codigo','Código',['Func','Cód.','Matrícula']),mk('nome','Colaborador',['Nome','Funcionário']),mk('cpf','CPF do colaborador (só para vincular ao cadastro)',['CPF']),mk('cargo','Cargo',[]),mk('empresa','Empresa',[]),
 mk('limiteSemDobra','Limite s/ dobra',['Limite sem dobra'],'d'),mk('adm','Admissão',['Adm','Data de admissão'],'d'),mk('periodoInicial','Período inicial',['Início do período','Período aquisitivo inicial'],'d'),mk('periodoFinal','Período final',['Fim do período','Período aquisitivo final'],'d'),
 mk('faltas','Faltas',[]),mk('afastamentos','Afastamentos (Afast.)',['Afast.','Afastamentos']),mk('saldo','Saldo',[]),mk('pago','Pago',[]),mk('tipo','Tipo',[]),mk('qtd','Quantidade (Qtd.)',['Qtd.','Qtd','Quantidade'])];
const FIELDS={folha05:FOLHA,folha20:FOLHA,rescisao:RESC,ferias:FER};
const KEYS={folha05:d=>[d.codigo,d.competencia],folha20:d=>[d.codigo,d.competencia],rescisao:d=>[d.codigo,d.dem,d.seq,d.competencia],ferias:d=>[d.codigo,d.periodoInicial,d.periodoFinal]};

/* ---------- Leitura do CSV ---------- */
async function readText(file){const buf=await file.arrayBuffer();let enc='UTF-8',t;try{t=new TextDecoder('utf-8',{fatal:true}).decode(buf)}catch{enc='Windows-1252';t=new TextDecoder('windows-1252').decode(buf)}return {text:t.replace(/^﻿/,''),enc}}
function detectDelim(text){const first=text.split(/\r?\n/).find(l=>l.trim())||'';let best=';',n=-1;for(const d of [';',',','\t','|']){let c=0,q=false;for(const ch of first){if(ch==='"')q=!q;else if(!q&&ch===d)c++}if(c>n){n=c;best=d}}return best}
function parseCSV(text,d){const rows=[];let row=[],cur='',q=false;for(let i=0;i<text.length;i++){const c=text[i];
 if(q){if(c==='"'){if(text[i+1]==='"'){cur+='"';i++}else q=false}else cur+=c}
 else if(c==='"')q=true;else if(c===d){row.push(cur);cur=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cur);cur='';rows.push(row);row=[]}else cur+=c}
 if(cur!==''||row.length){row.push(cur);rows.push(row)}return rows.filter(r=>r.some(x=>String(x).trim()!==''))}
/* valores brasileiros: "R$ 1.234,56", "1234,56", "(220,00)", "220,00-", "—" */
function parseMoney(v){let t=String(v??'').trim();if(t===''||/^[-—–]+$/.test(t))return {v:null};let neg=false;if(/^\(.*\)$/.test(t)){neg=true;t=t.slice(1,-1)}if(/-$/.test(t)){neg=true;t=t.slice(0,-1)}if(/^-/.test(t)){neg=!neg?true:neg;t=t.slice(1)}
 t=t.replace(/R\$|\s/g,'');if(/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(t))t=t.replace(/\./g,'').replace(',','.');else if(/^\d+(,\d+)?$/.test(t))t=t.replace(',','.');else if(!/^\d+(\.\d+)?$/.test(t))return {err:true};
 const n=Number(t);return Number.isFinite(n)?{v:neg?-n:n}:{err:true}}
function parseDate(v){const t=String(v??'').trim();if(!t)return '';const iso=t.match(/^(\d{4})-(\d{2})-(\d{2})/);if(iso)return iso[3]+'/'+iso[2]+'/'+iso[1];return t}
function parseComp(v){const t=String(v??'').trim();if(!t)return {v:''};let m;
 if(m=t.match(/^(\d{1,2})[\/.\-](\d{4})$/))return ok(m[1],m[2]);if(m=t.match(/^(\d{4})[\/.\-](\d{1,2})$/))return ok(m[2],m[1]);if(m=t.match(/^(\d{1,2})[\/.\-](\d{2})$/))return ok(m[1],'20'+m[2]);
 if(m=t.match(/^\d{1,2}[\/.\-](\d{1,2})[\/.\-](\d{4})$/))return ok(m[1],m[2]);return {err:true};
 function ok(mm,yy){const n=Number(mm);return n>=1&&n<=12?{v:String(n).padStart(2,'0')+'/'+yy}:{err:true}}}
function parseNat(v){const t=norm(v);if(!t)return {v:null};if(/^[1-4]$/.test(t))return {v:Number(t)};for(const [i,n] of [[1,'provento'],[2,'vantagem'],[3,'desconto'],[4,'informativo']])if(t.startsWith(n))return {v:i};return {err:true}}
function setPath(o,path,val){const ps=path.split('.');let c=o;for(let i=0;i<ps.length-1;i++)c=c[ps[i]]??(c[ps[i]]={});c[ps[ps.length-1]]=val}
const newBases=()=>({irrf:{},inss:{},inssEmpresa:{},fgts:{},grrf:{},pis:{},difTeto:null});

/* sugestão automática pelo nome da coluna (o usuário confere) */
function suggest(tipo,headers){const used=new Set(),map=headers.map(()=>'');const F=FIELDS[tipo];
 headers.forEach((h,i)=>{const n=norm(h);if(!n)return;const f=F.find(x=>!used.has(x.key)&&x.alias.some(a=>norm(a)===n));if(f){used.add(f.key);map[i]=f.key}});return map}

/* ---------- Normalização: linhas -> registros no modelo das telas ---------- */
function build(tipo,headers,rows,map,opts){const F=Object.fromEntries(FIELDS[tipo].map(f=>[f.key,f])),errors=[],groups=new Map();let dupEv=0,n=0;
 const col=k=>map.indexOf(k);const isFolha=tipo==='folha05'||tipo==='folha20';
 for(const r of rows){n++;const line=n+1,rec={},ev={},tot={};let bad='';
  headers.forEach((h,i)=>{const k=map[i];if(!k)return;const raw=String(r[i]??'').trim(),f=F[k];if(raw==='')return;let val=raw;
   if(f.kind==='m'){const m=parseMoney(raw);if(m.err){bad=bad||'valor inválido em "'+h+'"';return}val=m.v}else if(f.kind==='d')val=parseDate(raw);else if(f.kind==='c'){const c=parseComp(raw);if(c.err){bad=bad||'competência inválida em "'+h+'"';return}val=c.v}else if(f.kind==='n'){const c=parseNat(raw);if(c.err){bad=bad||'natureza do evento desconhecida em "'+h+'"';return}val=c.v}
   if(k.startsWith('ev'))ev[k]=val;else if(k.startsWith('tot'))tot[k]=val;else rec[k]=val});
  if(bad){errors.push({line,msg:bad});continue}
  if(!rec.codigo){errors.push({line,msg:'linha sem código do colaborador'});continue}
  if(!rec.nome){errors.push({line,msg:'linha sem nome do colaborador'});continue}
  const comp=rec.competencia||rec.mes||opts.competencia||'';if(!comp){errors.push({line,msg:'sem competência (mapeie a coluna ou informe a competência do arquivo)'});continue}
  rec.competencia=comp;if(tipo==='ferias'&&!rec.mes)rec.mes=comp;
  const key=KEYS[tipo]({...rec,competencia:rec.competencia||''}).map(x=>String(x??'')).join('|');
  let g=groups.get(key);if(!g){g={rec:{},eventos:[],tot:{},extras:{},first:line,rows:0};groups.set(key,g)}g.rows++;
  for(const [k,v] of Object.entries(rec))if(g.rec[k]==null||g.rec[k]==='')g.rec[k]=v;
  for(const [k,v] of Object.entries(tot))if(g.tot[k]==null)g.tot[k]=v;
  if(isFolha&&(ev.evCod!=null||ev.evNome!=null||ev.evValor!=null)){const e={cod:ev.evCod??'',nome:ev.evNome??'',nat:ev.evNat??null,ref:ev.evRef??'',valor:ev.evValor??null};const sig=JSON.stringify(e);
   if(g.eventos.some(x=>JSON.stringify(x)===sig)&&g.rows>1&&opts.dedup){dupEv++}else g.eventos.push(e)}
  headers.forEach((h,i)=>{if(map[i])return;const raw=String(r[i]??'').trim();if(raw==='')return;const list=(g.extras[h]??(g.extras[h]=[]));if(!list.includes(raw)&&list.length<5)list.push(raw)})}
 const out=[];for(const g of groups.values()){const d={...g.rec};
  if(isFolha){d.bases=newBases();for(const f of FIELDS[tipo])if(f.key.startsWith('bases.')&&d[f.key]!==undefined){setPath(d.bases,f.key.slice(6),d[f.key]);delete d[f.key]}
   for(const f of FIELDS[tipo])if(f.key.startsWith('bases.'))delete d[f.key];
   d.eventos=g.eventos;const hasTot=Object.keys(g.tot).length>0;
   d.totais=hasTot?{proventos:g.tot.totProventos??null,vantagens:g.tot.totVantagens??null,descontos:g.tot.totDescontos??null,liquido:g.tot.totLiquido??null}:{proventos:null,vantagens:null,descontos:null,liquido:null};
   if(!hasTot&&opts.somar&&g.eventos.length){const sum=n=>g.eventos.filter(e=>e.nat===n&&typeof e.valor==='number').reduce((a,e)=>a+e.valor,0);d.totais={proventos:sum(1),vantagens:sum(2),descontos:sum(3),liquido:sum(1)+sum(2)-sum(3)};d.totaisSomados=true}}
  d.extras=Object.fromEntries(Object.entries(g.extras).map(([k,v])=>[k,v.join(' · ')]));out.push(d)}
 return {records:out,errors,dupEv,lines:n}}

/* ---------- Armazenamento SÓ em memória ---------- */
const store={folha05:new Map(),folha20:new Map(),rescisao:new Map(),ferias:new Map()};let seq=0;
const has=t=>store[t]?.size>0;
function link(d){const P=window.CicluzPeople;if(!P||!d.cpf)return {ok:false};const cpf=String(d.cpf).replace(/\D/g,'');if(cpf.length!==11)return {ok:false};try{P.load?.();const hits=P.get().people.filter(p=>String(p.cpf||'').replace(/\D/g,'')===cpf);if(hits.length===1)return {ok:true,por:'CPF',nome:hits[0].name}}catch{}return {ok:false}}
function commit(tipo,records,arquivo){let novos=0,subst=0;const T=window.CicluzFolhas.TIPOS[tipo];void T;
 for(const d of records){const key=KEYS[tipo]({...d,competencia:d.competencia||''}).map(x=>String(x??'')).join('|');const old=store[tipo].get(key);if(old)subst++;else novos++;
  const rec={...d,id:old?.id||'csv-'+tipo+'-'+(++seq),origem:'csv',arquivo,vinculo:link(d)};delete rec.cpf;store[tipo].set(key,rec)}return {novos,subst}}
const source={listar:t=>structuredClone([...store[t].values()]),obter:(t,id)=>{const x=[...store[t].values()].find(y=>y.id===id);return x?structuredClone(x):null}};

/* ---------- Tela de prévia e confirmação ---------- */
function pick(tipo,after){const inp=document.createElement('input');inp.type='file';inp.accept='.csv,.txt,text/csv,text/plain';inp.hidden=true;document.body.append(inp);
 inp.onchange=async()=>{const f=inp.files[0];inp.remove();if(!f)return;if(f.size>20*1024*1024){alert('Arquivo acima de 20 MB.');return}
  let r;try{r=await readText(f)}catch{alert('Não foi possível ler o arquivo.');return}preview(tipo,f.name,r,after)};inp.click()}
function preview(tipo,name,{text,enc},after){const delim=detectDelim(text),all=parseCSV(text,delim);
 const T=window.CicluzFolhas.TIPOS[tipo];
 if(all.length<2){dialog('Importar CSV — '+T.titulo,(f,form)=>{form.append(el('p','profiles-error uniforms-wide','Arquivo inválido ou vazio: é preciso uma linha de cabeçalho e ao menos uma linha de dados. Arquivo: '+name+'.'))});return}
 const headers=all[0].map(h=>String(h).trim()),rows=all.slice(1),map=suggest(tipo,headers);let result=null;
 const d=dialog('Importar CSV — '+T.titulo,(field,form)=>{
  form.append(el('p','profiles-note uniforms-wide','Arquivo: '+name+' · separador "'+(delim==='\t'?'TAB':delim)+'" · codificação '+enc+' · '+rows.length+' linha(s) de dados. Tudo é lido neste navegador; nada é enviado. Os dados ficam só na memória desta página.'));
  const compIn=el('input');compIn.placeholder='MM/AAAA (só se o arquivo não tiver coluna de competência)';compIn.dataset.textoLivre='';compIn.maxLength=7;field('Competência do arquivo (opcional)',compIn);
  const somar=el('input');somar.type='checkbox';const sl=el('label','jornada-check uniforms-wide');sl.append(somar,el('span',null,'Somar os eventos para os totais, se o arquivo não trouxer totais (soma simples dos valores importados, marcada na tela)'));
  const dedup=el('input');dedup.type='checkbox';dedup.checked=true;const dl2=el('label','jornada-check uniforms-wide');dl2.append(dedup,el('span',null,'Ignorar eventos idênticos repetidos no mesmo colaborador e competência'));form.append(sl,dl2);
  form.append(el('h4','uniforms-wide','Correspondência das colunas'),el('p','profiles-note uniforms-wide','O sistema sugeriu pelo nome da coluna. Confira e ajuste; colunas sem campo ficam em "Detalhes adicionais" de cada registro.'));
  const t=el('table','uniforms-table'),th=el('thead'),hr=el('tr');for(const h of ['Coluna do arquivo','Exemplo','Campo da tela'])hr.append(el('th',null,h));th.append(hr);const tb=el('tbody');t.append(th,tb);const w=el('div','uniforms-table-wrap uniforms-wide folhas-map');w.append(t);
  headers.forEach((h,i)=>{const tr=el('tr'),sel=el('select');sel.setAttribute('aria-label','Campo para a coluna '+(h||(i+1)));sel.add(new Option('— não importar como campo —',''));for(const f of FIELDS[tipo])sel.add(new Option(f.label,f.key));sel.value=map[i];
   sel.addEventListener('change',()=>{map[i]=sel.value;compute()});tr.append(el('td',null,h||'(sem nome)'),el('td',null,String(rows[0][i]??'').slice(0,40)),(()=>{const td=el('td');td.append(sel);return td})());tb.append(tr)});form.append(w);
  const sum=el('div','folhas-import-sum uniforms-wide');sum.setAttribute('aria-live','polite');form.append(sum);
  function compute(){const c=parseComp(compIn.value);const r=build(tipo,headers,rows,map,{competencia:c.v||'',somar:somar.checked,dedup:dedup.checked});result=r;sum.replaceChildren();
   sum.append(el('h4',null,'Prévia'));const parts=[r.records.length+' registro(s) a importar',r.errors.length+' linha(s) inválida(s)'];if(r.dupEv)parts.push(r.dupEv+' evento(s) repetido(s) ignorado(s)');
   sum.append(el('p','profiles-note',parts.join(' · ')+'.'));if(compIn.value&&c.err)sum.append(el('p','profiles-error','Competência do arquivo inválida: use MM/AAAA.'));
   if(r.errors.length){const det=el('details'),sm=el('summary',null,'Ver linhas com erro ('+r.errors.length+')');det.append(sm);const ul=el('ul','uniforms-reference-list');for(const e of r.errors.slice(0,50))ul.append(el('li',null,'Linha '+e.line+': '+e.msg));if(r.errors.length>50)ul.append(el('li',null,'… e mais '+(r.errors.length-50)+'.'));det.append(ul);sum.append(det)}
   if(r.records.length){const pt=el('table','uniforms-table'),ph=el('thead'),pr=el('tr');for(const h of ['Colaborador','Competência / período','Eventos','Vínculo'])pr.append(el('th',null,h));ph.append(pr);const pb=el('tbody');for(const x of r.records.slice(0,8)){const k=x.competencia||x.mes||'';pb.append((()=>{const tr=el('tr');tr.append(el('td',null,x.nome),el('td',null,tipo==='ferias'?(x.periodoInicial||'—')+' a '+(x.periodoFinal||'—'):tipo==='rescisao'?'Demissão '+(x.dem||'—'):k),el('td',null,tipo.startsWith('folha')?String(x.eventos.length):'—'),el('td',null,link(x).ok?'vinculado por CPF':'sem vínculo (conferir)'));return tr})())}pt.append(ph,pb);const pw=el('div','uniforms-table-wrap');pw.append(pt);sum.append(pw);if(r.records.length>8)sum.append(el('p','profiles-note','Mostrando 8 de '+r.records.length+'.'))}}
  compIn.addEventListener('input',compute);somar.addEventListener('change',compute);dedup.addEventListener('change',compute);compute();return {}},
  ()=>{if(!result||!result.records.length)return 'Nenhum registro válido para importar. Ajuste a correspondência das colunas.';const r=commit(tipo,result.records,name);after?.(r);return null},'Confirmar importação',()=>{});
 d.classList.add('folhas-import-dialog')}

/* ---------- Barra de ações (botões novos da tela) ---------- */
function toolbar(tipo,after){const box=el('div','people-banner-tools folhas-import-tools');
 box.append(G.roundButton('Importar CSV',IC.up,()=>pick(tipo,()=>after?.())));
 if(has(tipo))box.append(G.roundButton('Limpar importação desta aba',IC.trash,()=>{store[tipo].clear();after?.()}),el('span','profiles-note',store[tipo].size+' registro(s) importado(s) nesta sessão.'));return box}

/* ---------- Demonstrativo (documento) com impressão ---------- */
function buildDoc(D,tipo,d,T){const mkEl=(t,css,txt)=>{const e=D.createElement(t);if(css)e.style.cssText=css;if(txt!=null)e.textContent=txt;return e};
 const root=mkEl('div','font:13px/1.45 Arial,sans-serif;color:#111;background:#fff;padding:18px;max-width:900px');
 root.append(mkEl('div','border:2px solid #b91c1c;color:#b91c1c;padding:6px 10px;font-weight:700;margin-bottom:12px','DEMONSTRATIVO NÃO OFICIAL — gerado neste navegador a partir de arquivo CSV importado. Não é documento emitido pela Conplus, não tem assinatura, autenticação nem protocolo.'));
 root.append(mkEl('h1','font-size:18px;margin:0 0 2px',T.doc.toUpperCase()),mkEl('p','margin:0 0 12px;color:#444',(d.nome||'')+' · '+(T.periodo(d)||'')+(d.empresa?' · '+d.empresa:'')));
 for(const pt of window.CicluzFolhas.parts(tipo,d)){root.append(mkEl('h2','font-size:14px;margin:14px 0 6px;border-bottom:1px solid #999;padding-bottom:2px',pt.title));
  for(const bl of pt.blocks){if(bl.dl){const t=mkEl('table','border-collapse:collapse;width:100%;margin-bottom:6px');for(const [k,v] of bl.dl){const tr=D.createElement('tr');tr.append(mkEl('td','border:1px solid #bbb;padding:3px 6px;font-weight:700;width:38%',k),mkEl('td','border:1px solid #bbb;padding:3px 6px',v==null||v===''?'—':String(v)));t.append(tr)}root.append(t)}
   else if(bl.table){const t=mkEl('table','border-collapse:collapse;width:100%;margin-bottom:6px'),hr=D.createElement('tr');bl.table.heads.forEach((h,i)=>hr.append(mkEl('th','border:1px solid #bbb;padding:3px 6px;background:#eee;text-align:'+(bl.table.num.includes(i)?'right':'left'),h)));t.append(hr);for(const r of bl.table.rows){const tr=D.createElement('tr');r.forEach((c,i)=>tr.append(mkEl('td','border:1px solid #bbb;padding:3px 6px;text-align:'+(bl.table.num.includes(i)?'right':'left'),c==null||c===''?'—':String(c))));t.append(tr)}root.append(t)}
   else if(bl.totais){const t=mkEl('div','display:flex;gap:10px;flex-wrap:wrap');for(const [k,v] of bl.totais){const c=mkEl('div','border:1px solid #bbb;padding:6px 10px;min-width:120px');c.append(mkEl('div','font-size:11px;color:#555',k),mkEl('div','font-weight:700',v));t.append(c)}root.append(t)}
   else root.append(mkEl('p','margin:0 0 6px',bl.p))}}
 if(d.totaisSomados)root.append(mkEl('p','font-size:11px;color:#555','Totais somados pelo sistema a partir dos eventos importados (o arquivo não trouxe totais).'));
 root.append(mkEl('p','font-size:11px;color:#555;margin-top:14px','Origem: arquivo "'+(d.arquivo||'—')+'" importado manualmente. Valores exatamente como no arquivo; nada foi recalculado.'));return root}
function printDoc(tipo,d,T){const f=document.createElement('iframe');f.setAttribute('aria-hidden','true');f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';document.body.append(f);const D=f.contentDocument;D.title=T.doc+' — demonstrativo não oficial';D.body.style.cssText='margin:0';D.body.append(buildDoc(D,tipo,d,T));
 const clean=()=>setTimeout(()=>f.remove(),500);f.contentWindow.addEventListener('afterprint',clean);setTimeout(()=>{try{f.contentWindow.focus();f.contentWindow.print()}catch{}},150);setTimeout(()=>f.remove(),120000)}
function docButton(tipo,d,T){return G.roundButton('Visualizar Documento',IC.doc,()=>{
 const dlg=dialog('Documento — '+T.doc,(f,form)=>{form.append(buildDoc(document,tipo,d,T));const bar=el('div','people-banner-tools');bar.append(G.roundButton('Imprimir ou salvar em PDF',IC.print,()=>printDoc(tipo,d,T)));form.append(bar,el('p','profiles-note','Para gerar PDF, use "Salvar como PDF" na janela de impressão do navegador (não há biblioteca de PDF no sistema).'))});dlg.classList.add('folhas-doc-dialog')})}

window.CicluzFolhasCsv={has,listar:async t=>source.listar(t),obter:async(t,id)=>source.obter(t,id),toolbar,docButton,
 _t:{parseCSV,detectDelim,parseMoney,parseComp,parseDate,build,suggest,commit,store}};
})();
