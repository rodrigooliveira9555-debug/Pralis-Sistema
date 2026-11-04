/* Stock rules for uniform movements. Pure functions over {movements, stock, references}; no DOM, no storage. */
(function(root){
'use strict';
const OUT=new Set(['VENDIDO','ENTREGUE','DESCARTADO']),WITHDRAWN=new Set(['VENDIDO','ENTREGUE']),TYPES=new Set([...OUT,'DEVOLVIDO']);
const isoPattern=/^(\d{4})-(\d{2})-(\d{2})$/;
function validDate(v){const m=isoPattern.exec(v||'');if(!m||+m[1]<1)return false;const y=+m[1],mo=+m[2],d=+m[3],leap=y%4===0&&(y%100!==0||y%400===0);return mo>=1&&mo<=12&&d>=1&&d<=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][mo-1]}
const positiveInt=n=>Number.isInteger(n)&&n>=1;
const counted=movements=>movements.filter(m=>m.status!=='CANCELADO');
function emptyState(){return {version:1,movements:[],purchases:[],stock:{},references:{}}}
function initialOf(stock,id){const v=stock[id]?.initial;return Number.isInteger(v)&&v>=0?v:null}

/* SALDO = ESTOQUE INICIAL + COMPRAS + DEVOLUÇÕES - VENDAS - ENTREGAS - DESCARTES; unset initial counts as zero. */
function totals(state,uniformIds){const out={};for(const id of uniformIds){const initial=initialOf(state.stock,id);out[id]={initial,configured:initial!==null,COMPRADO:0,VENDIDO:0,ENTREGUE:0,DEVOLVIDO:0,DESCARTADO:0,balance:initial||0}}
 for(const p of counted(state.purchases||[]))for(const item of p.items){const t=out[item.uniformId];if(!t)continue;t.COMPRADO+=item.quantity;t.balance+=item.quantity}
 for(const m of counted(state.movements))for(const item of m.items){const t=out[item.uniformId];if(!t)continue;t[m.type]+=item.quantity;t.balance+=m.type==='DEVOLVIDO'?item.quantity:-item.quantity}
 return out}

function returnedAgainst(movements,originId,uniformId,skipId){let n=0;for(const m of counted(movements))if(m.id!==skipId&&m.type==='DEVOLVIDO')for(const item of m.items)if(item.returnOf===originId&&item.uniformId===uniformId)n+=item.quantity;return n}
/* Quantity a collaborator still holds of one uniform: delivered + sold - returned. */
function held(movements,collaboratorId,uniformId,skipId){let n=0;for(const m of counted(movements))if(m.id!==skipId&&m.collaboratorId===collaboratorId)for(const item of m.items)if(item.uniformId===uniformId){if(WITHDRAWN.has(m.type))n+=item.quantity;else if(m.type==='DEVOLVIDO')n-=item.quantity}return n}
function returnable(movements,originId,uniformId,skipId){const origin=counted(movements).find(m=>m.id===originId);const item=origin?.items.find(i=>i.uniformId===uniformId);return item?item.quantity-returnedAgainst(movements,originId,uniformId,skipId):0}
/* Previous withdrawals of a collaborator that still have something to return. */
function returnOrigins(movements,collaboratorId,skipId){return counted(movements).filter(m=>m.id!==skipId&&m.collaboratorId===collaboratorId&&WITHDRAWN.has(m.type)&&m.items.some(i=>returnable(movements,m.id,i.uniformId,skipId)>0))}

/* Whole-state integrity: no negative balance and no return above what was withdrawn. Order-independent, so it holds after any edit or deletion. */
function integrity(state,uniforms){const errors=[],name=id=>uniforms.find(u=>u.id===id)?.name||id,ids=uniforms.map(u=>u.id),t=totals(state,ids);
 for(const id of ids)if(t[id].balance<0)errors.push({uniformId:id,message:'Saldo de '+name(id)+' ficaria negativo ('+t[id].balance+').'});
 const live=counted(state.movements);
 for(const m of live)if(m.type==='DEVOLVIDO')for(const item of m.items){
  if(item.returnOf){const origin=live.find(o=>o.id===item.returnOf);const original=origin?.items.find(i=>i.uniformId===item.uniformId);
   if(!origin||!original||origin.collaboratorId!==m.collaboratorId||!WITHDRAWN.has(origin.type))errors.push({uniformId:item.uniformId,movementId:m.id,message:'A devolução de '+name(item.uniformId)+' perderia a movimentação de origem.'});
   else if(returnedAgainst(state.movements,origin.id,item.uniformId)>original.quantity)errors.push({uniformId:item.uniformId,movementId:m.id,message:'Devoluções de '+name(item.uniformId)+' superariam a quantidade retirada na movimentação de origem ('+original.quantity+').'})}}
 const pairs=new Set();for(const m of live)if(m.type==='DEVOLVIDO')for(const i of m.items)pairs.add(m.collaboratorId+'\u0000'+i.uniformId);
 for(const key of pairs){const [collaboratorId,uniformId]=key.split('\u0000');if(held(state.movements,collaboratorId,uniformId)<0)errors.push({uniformId,message:'Devoluções de '+name(uniformId)+' superariam o total retirado pelo colaborador.'})}
 return errors}

/* Field rules for one movement, then the integrity of the state it would produce. */
function validateMovement(movement,state,uniforms){const errors=[],name=id=>uniforms.find(u=>u.id===id)?.name||id;
 if(!validDate(movement.date))errors.push({field:'date',message:'Informe uma data válida.'});
 if(!movement.collaboratorId)errors.push({field:'collaborator',message:'Selecione o colaborador.'});
 if(!TYPES.has(movement.type))errors.push({field:'type',message:'Selecione o tipo de movimentação.'});
 const items=Array.isArray(movement.items)?movement.items:[];
 if(!items.length)errors.push({field:'items',message:'Selecione ao menos um uniforme.'});
 const seen=new Set();
 for(const item of items){if(!uniforms.some(u=>u.id===item.uniformId)){errors.push({field:'items',message:'Uniforme desconhecido.'});continue}
  if(seen.has(item.uniformId))errors.push({field:'items',uniformId:item.uniformId,message:name(item.uniformId)+' foi selecionado mais de uma vez.'});seen.add(item.uniformId);
  if(!positiveInt(item.quantity))errors.push({field:'quantity',uniformId:item.uniformId,message:'Quantidade de '+name(item.uniformId)+' deve ser um número inteiro a partir de 1.'});
  if(movement.type==='VENDIDO'&&!(Number.isInteger(item.unitPrice)&&item.unitPrice>0))errors.push({field:'price',uniformId:item.uniformId,message:'Informe o valor unitário de '+name(item.uniformId)+'.'});
  if(movement.type==='DEVOLVIDO'&&item.returnOf&&item.returnOf!==movement.returnOf)errors.push({field:'items',uniformId:item.uniformId,message:'Itens de uma devolução devem usar a mesma origem.'})}
 if(errors.length)return errors;
 const next={...state,movements:[...state.movements.filter(m=>m.id!==movement.id),movement]};
 const t=totals(state,uniforms.map(u=>u.id)),own=state.movements.find(m=>m.id===movement.id);
 /* Report outflows against the balance available to this movement, which is clearer than the integrity message. */
 if(OUT.has(movement.type))for(const item of items){const back=own&&own.status!=='CANCELADO'?own.items.filter(i=>i.uniformId===item.uniformId).reduce((n,i)=>n+(own.type==='DEVOLVIDO'?-i.quantity:i.quantity),0):0;const available=t[item.uniformId].balance+back;if(item.quantity>available)errors.push({field:'quantity',uniformId:item.uniformId,message:'Saldo insuficiente de '+name(item.uniformId)+': disponível '+Math.max(available,0)+'.'})}
 if(movement.type==='DEVOLVIDO')for(const item of items){const limit=movement.returnOf?returnable(state.movements,movement.returnOf,item.uniformId,movement.id):held(state.movements,movement.collaboratorId,item.uniformId,movement.id);if(item.quantity>limit)errors.push({field:'quantity',uniformId:item.uniformId,message:limit>0?'Devolução de '+name(item.uniformId)+' acima do retirado: máximo '+limit+'.':'Não há retirada de '+name(item.uniformId)+' para devolver'+(movement.returnOf?' nesta movimentação.':' por este colaborador.')})}
 if(errors.length)return errors;
 return integrity(next,uniforms)}

function saleTotal(movement){return movement.type==='VENDIDO'?movement.items.reduce((n,i)=>n+(Number.isInteger(i.unitPrice)?i.unitPrice*i.quantity:0),0):0}

const api={OUT,WITHDRAWN,emptyState,validDate,totals,held,returnable,returnOrigins,integrity,validateMovement,saleTotal};
if(typeof module!=='undefined')module.exports=api;
root.CicluzUniformStock=api;
})(typeof window!=='undefined'?window:globalThis);
