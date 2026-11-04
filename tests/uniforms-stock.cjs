const assert=require('node:assert/strict');
const {uniforms,categories,types,demoCollaborators}=require('../dist/uniforms-data.js');
const stock=require('../dist/uniforms-stock.js');
let checks=0;const ok=(...a)=>{assert.ok(...a);checks++};const eq=(...a)=>{assert.equal(...a);checks++};const deq=(...a)=>{assert.deepEqual(...a);checks++};

// Catalog: all 56 received names, unique ids, known categories.
eq(uniforms.length,56);
eq(new Set(uniforms.map(u=>u.id)).size,56);
eq(new Set(uniforms.map(u=>u.name)).size,56);
eq(uniforms[0].name,'LOJA/ATENDIMENTO - BONÉ UC');
eq(uniforms[30].name,'PRODUÇÃO/QUA + SÁB - CAMISA PP');
eq(uniforms[55].name,'GERAL - CALÇADO 42');
ok(uniforms.every(u=>categories.includes(u.category)),'every uniform has a listed category');
deq(categories.map(c=>uniforms.filter(u=>u.category===c).length),[30,15,2,1,8]);
deq(types.map(t=>t.id),['VENDIDO','ENTREGUE','DEVOLVIDO','DESCARTADO']);
ok(demoCollaborators.some(c=>!c.active),'demo list includes an inactive collaborator');

const ids=uniforms.map(u=>u.id),SHIRT='uni-05',CAP='uni-01',PANTS='uni-10';
const mk=(id,type,items,extra={})=>({id,date:'2026-11-04',collaboratorId:'demo-colab-01',type,status:'ATIVO',items,...extra});
let state=stock.emptyState();

// Unset initial stock is reported as not configured and counts as zero.
let t=stock.totals(state,ids);eq(t[SHIRT].configured,false);eq(t[SHIRT].balance,0);
ok(stock.validateMovement(mk('a','ENTREGUE',[{uniformId:SHIRT,quantity:1}]),state,uniforms).some(e=>/Saldo insuficiente/.test(e.message)),'no outflow without stock');

state.stock[SHIRT]={initial:10,price:null};state.stock[CAP]={initial:3,price:2500};state.stock[PANTS]={initial:4,price:null};

// Field validation.
const fieldErrors=stock.validateMovement({id:'x',date:'2026-02-30',collaboratorId:'',type:'X',items:[]},state,uniforms).map(e=>e.field);
deq(fieldErrors,['date','collaborator','type','items']);
for(const q of [0,-1,1.5,NaN])ok(stock.validateMovement(mk('q','ENTREGUE',[{uniformId:SHIRT,quantity:q}]),state,uniforms).some(e=>e.field==='quantity'),'reject quantity '+q);
ok(stock.validateMovement(mk('d','ENTREGUE',[{uniformId:SHIRT,quantity:1},{uniformId:SHIRT,quantity:1}]),state,uniforms).some(e=>/mais de uma vez/.test(e.message)),'reject duplicate uniform');

// Scenario from the request: deliver 2 shirts M.
const delivery=mk('m1','ENTREGUE',[{uniformId:SHIRT,quantity:2},{uniformId:CAP,quantity:1},{uniformId:PANTS,quantity:2}]);
deq(stock.validateMovement(delivery,state,uniforms),[]);state.movements.push(delivery);
t=stock.totals(state,ids);eq(t[SHIRT].balance,8);eq(t[SHIRT].ENTREGUE,2);eq(t[CAP].balance,2);eq(t[PANTS].balance,2);

// Outflow above balance is blocked, exactly the balance is accepted.
ok(stock.validateMovement(mk('m2','DESCARTADO',[{uniformId:PANTS,quantity:3}]),state,uniforms).some(e=>/disponível 2/.test(e.message)));
deq(stock.validateMovement(mk('m2','DESCARTADO',[{uniformId:PANTS,quantity:2}]),state,uniforms),[]);

// Sale requires unit price and totals quantity x price.
ok(stock.validateMovement(mk('s1','VENDIDO',[{uniformId:CAP,quantity:2}]),state,uniforms).some(e=>e.field==='price'));
const sale=mk('s1','VENDIDO',[{uniformId:CAP,quantity:2,unitPrice:2500}],{collaboratorId:'demo-colab-02'});
deq(stock.validateMovement(sale,state,uniforms),[]);state.movements.push(sale);eq(stock.saleTotal(sale),5000);
t=stock.totals(state,ids);eq(t[CAP].balance,0);eq(t[CAP].VENDIDO,2);

// Returns: linked to origin, limited to what was withdrawn there.
deq(stock.returnOrigins(state.movements,'demo-colab-01').map(m=>m.id),['m1']);
eq(stock.returnable(state.movements,'m1',SHIRT),2);
ok(stock.validateMovement(mk('r1','DEVOLVIDO',[{uniformId:SHIRT,quantity:3,returnOf:'m1'}],{returnOf:'m1'}),state,uniforms).some(e=>/máximo 2/.test(e.message)));
ok(stock.validateMovement(mk('r1','DEVOLVIDO',[{uniformId:'uni-06',quantity:1,returnOf:'m1'}],{returnOf:'m1'}),state,uniforms).some(e=>/Não há retirada/.test(e.message)),'uniform absent from origin');
const ret=mk('r1','DEVOLVIDO',[{uniformId:SHIRT,quantity:1,returnOf:'m1'}],{returnOf:'m1'});
deq(stock.validateMovement(ret,state,uniforms),[]);state.movements.push(ret);
t=stock.totals(state,ids);eq(t[SHIRT].balance,9);eq(t[SHIRT].DEVOLVIDO,1);eq(stock.returnable(state.movements,'m1',SHIRT),1);
// Unlinked return limited to what the collaborator still holds.
eq(stock.held(state.movements,'demo-colab-01',SHIRT),1);
ok(stock.validateMovement(mk('r2','DEVOLVIDO',[{uniformId:SHIRT,quantity:2}]),state,uniforms).some(e=>/máximo 1/.test(e.message)));
ok(stock.validateMovement(mk('r2','DEVOLVIDO',[{uniformId:SHIRT,quantity:1}],{collaboratorId:'demo-colab-03'}),state,uniforms).some(e=>/Não há retirada/.test(e.message)),'collaborator without withdrawal');

// Editing: the movement's own quantity is available again; editing origin below returned is blocked.
const editUp={...delivery,items:[{uniformId:SHIRT,quantity:9},{uniformId:CAP,quantity:1},{uniformId:PANTS,quantity:2}]};
deq(stock.validateMovement(editUp,state,uniforms),[],'balance 9 + own 2 allows 9... and integrity keeps >=0');
const editTooHigh={...delivery,items:[{uniformId:SHIRT,quantity:12}]};
ok(stock.validateMovement(editTooHigh,state,uniforms).some(e=>/disponível 11/.test(e.message)));
const editBelowReturn={...delivery,items:[{uniformId:CAP,quantity:1},{uniformId:PANTS,quantity:2}]};
ok(stock.validateMovement(editBelowReturn,state,uniforms).length>0,'removing shirt from origin breaks linked return');

// Deleting or cancelling: integrity check over the resulting state.
const without=id=>({...state,movements:state.movements.filter(m=>m.id!==id)});
ok(stock.integrity(without('m1'),uniforms).length>0,'deleting origin with linked return is blocked');
deq(stock.integrity(without('r1'),uniforms),[]);
const cancelled={...state,movements:state.movements.map(m=>m.id==='s1'?{...m,status:'CANCELADO'}:m)};
deq(stock.integrity(cancelled,uniforms),[]);eq(stock.totals(cancelled,ids)[CAP].balance,2,'cancelled sale returns stock');
// Lowering initial stock below what left is blocked.
ok(stock.integrity({...state,stock:{...state.stock,[CAP]:{initial:1,price:2500}}},uniforms).some(e=>/negativo/.test(e.message)));
// Deleting a return that fed a later outflow would leave a negative balance.
const s2={...state,stock:{...state.stock,[SHIRT]:{initial:2}}};
ok(stock.integrity(s2,uniforms).length===0,'2 - 2 + 1 = 1 is fine');
const s3={...s2,movements:[...s2.movements,mk('o2','ENTREGUE',[{uniformId:SHIRT,quantity:1}])]};
deq(stock.integrity(s3,uniforms),[]);
ok(stock.integrity({...s3,movements:s3.movements.filter(m=>m.id!=='r1')},uniforms).some(e=>/negativo/.test(e.message)),'removing return would go negative');

console.log(checks+' uniform catalog and stock rule checks passed');
