/* Uniform catalog and demonstration collaborators, kept apart from the screen so a database can replace them. */
(function(root){
'use strict';
const names=[
 'LOJA/ATENDIMENTO - BONÉ UC','LOJA/ATENDIMENTO - TOUCA UC',
 'LOJA/ATENDIMENTO - CAMISA PP','LOJA/ATENDIMENTO - CAMISA P','LOJA/ATENDIMENTO - CAMISA M','LOJA/ATENDIMENTO - CAMISA G','LOJA/ATENDIMENTO - CAMISA GG',
 'LOJA/ATENDIMENTO - CALÇA TACTEL PP','LOJA/ATENDIMENTO - CALÇA TACTEL P','LOJA/ATENDIMENTO - CALÇA TACTEL M','LOJA/ATENDIMENTO - CALÇA TACTEL G','LOJA/ATENDIMENTO - CALÇA TACTEL GG',
 'LOJA/ATENDIMENTO - AVENTAL',
 'MISTA/GERÊNCIA - CAMISA PP','MISTA/GERÊNCIA - CAMISA P','MISTA/GERÊNCIA - CAMISA M','MISTA/GERÊNCIA - CAMISA G','MISTA/GERÊNCIA - CAMISA GG',
 'MISTA/SUPERVISÃO - CAMISA PP','MISTA/SUPERVISÃO - CAMISA P','MISTA/SUPERVISÃO - CAMISA M','MISTA/SUPERVISÃO - CAMISA G','MISTA/SUPERVISÃO - CAMISA GG',
 'MISTA/ADM - CALÇA SOCIAL PP','MISTA/ADM - CALÇA SOCIAL P','MISTA/ADM - CALÇA SOCIAL M','MISTA/ADM - CALÇA SOCIAL G','MISTA/ADM - CALÇA SOCIAL GG',
 'PRODUÇÃO/SEG + QUI - CAMISA PP','PRODUÇÃO/TER + SEX - CAMISA PP','PRODUÇÃO/QUA + SÁB - CAMISA PP',
 'PRODUÇÃO/SEG + QUI - CAMISA P','PRODUÇÃO/TER + SEX - CAMISA P','PRODUÇÃO/QUA + SÁB - CAMISA P',
 'PRODUÇÃO/SEG + QUI - CAMISA M','PRODUÇÃO/TER + SEX - CAMISA M','PRODUÇÃO/QUA + SÁB - CAMISA M',
 'PRODUÇÃO/SEG + QUI - CAMISA G','PRODUÇÃO/TER + SEX - CAMISA G','PRODUÇÃO/QUA + SÁB - CAMISA G',
 'PRODUÇÃO/SEG + QUI - CAMISA GG','PRODUÇÃO/TER + SEX - CAMISA GG','PRODUÇÃO/QUA + SÁB - CAMISA GG',
 'PRODUÇÃO - CALÇA XADREZ PP','PRODUÇÃO - CALÇA XADREZ P','PRODUÇÃO - CALÇA XADREZ M','PRODUÇÃO - CALÇA XADREZ G','PRODUÇÃO - CALÇA XADREZ GG',
 'GERAL - CALÇADO 35','GERAL - CALÇADO 36','GERAL - CALÇADO 37','GERAL - CALÇADO 38','GERAL - CALÇADO 39','GERAL - CALÇADO 40','GERAL - CALÇADO 41','GERAL - CALÇADO 42'
];
function category(name){const piece=name.split(' - ').pop();if(piece.startsWith('CAMISA'))return 'Camisa';if(piece.startsWith('CALÇADO'))return 'Calçado';if(piece.startsWith('CALÇA'))return 'Calça';if(piece.startsWith('BONÉ')||piece.startsWith('TOUCA'))return 'Boné ou Touca';if(piece.startsWith('AVENTAL'))return 'Avental';return 'Outro'}
function family(name){const prefix=name.split(' - ')[0];if(prefix.startsWith('PRODUÇÃO'))return category(name)==='Camisa'?'PRODUÇÃO — CAMISAS':'PRODUÇÃO — CALÇAS';if(prefix==='GERAL')return 'GERAL — CALÇADOS';return prefix}
/* Codes follow the received order; never renumber existing entries. */
const uniforms=names.map((name,i)=>({id:'uni-'+String(i+1).padStart(2,'0'),name,category:category(name),family:family(name)}));
const categories=['Camisa','Calça','Boné ou Touca','Avental','Calçado'];
const types=[
 {id:'VENDIDO',label:'Vendido',effect:-1,priced:true},
 {id:'ENTREGUE',label:'Entregue',effect:-1},
 {id:'DEVOLVIDO',label:'Devolvido',effect:1},
 {id:'DESCARTADO',label:'Descartado',effect:-1}
];
/* Demonstration only: the platform has no collaborator registry in the browser yet. Cargo names match the Cargos catalog. */
const demoCollaborators=[
 {id:'demo-colab-01',name:'João Pedro',jobName:'BALCONISTA',active:true},
 {id:'demo-colab-02',name:'Camila Nunes',jobName:'PADEIRO',active:true},
 {id:'demo-colab-03',name:'Larissa Souza',jobName:'AUXILIAR DE ESCRITÓRIO',active:true},
 {id:'demo-colab-04',name:'Renata Alves',jobName:'GERENTE DE LOJA N-1',active:true},
 {id:'demo-colab-05',name:'Marcos Lima',jobName:'OPERADOR DE CAIXA',active:false}
];
const api={uniforms,categories,types,demoCollaborators};
if(typeof module!=='undefined')module.exports=api;
root.CicluzUniformData=api;
})(typeof window!=='undefined'?window:globalThis);
