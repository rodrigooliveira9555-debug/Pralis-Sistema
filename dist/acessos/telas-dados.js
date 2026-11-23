/*
 * Configurações → Permissões → Acesso por Tela: dados de apoio da tela (ESBOÇO, sem backend).
 * A lista de telas NÃO mora aqui: ela é lida do próprio menu do sistema (window.CicluzMenu, em index.html), então todo módulo
 * novo que entrar no menu aparece na tela com os acessos desligados. Aqui ficam só as ações especiais.
 */

/*
 * Ações especiais (abertas pelo "!" de uma tela, na coluna do colaborador, cargo ou área): as permissões que não são lançar, editar, pagar ou ver (verbos próprios de um fluxo). As chaves e os
 * nomes são os do catálogo de hoje (servidor/shared/src/acessos.ts); a descrição é só um apoio da tela. Valem para a ÁREA
 * inteira, como hoje (não por tela). s = sensível (mexe em dinheiro já registrado, em dado do DP ou no acesso dos outros).
 */
window.CicluzAcessosAcoesDados = [
  {n:"Lançamentos",i:[
    ["lancamentos_editar_pago","Editar lançamento já pago","Altera um lançamento depois de pago.",1],
    ["lancamentos_recorrencia","Criar recorrência","Cria um lançamento que se repete (por exemplo, o aluguel mensal).",0],
    ["lancamentos_cancelar_serie","Cancelar série recorrente","Cancela todas as repetições futuras de uma vez.",0],
    ["lancamentos_pagamento_retroativo","Pagamento com data passada","Registra um pagamento com data antiga.",1]
  ]},
  {n:"Caixa",i:[
    ["caixa_sangria","Fazer sangria","Retira dinheiro do caixa durante o turno.",0],
    ["caixa_monitorar","Ver os caixas abertos e mandar mensagem","Acompanha os caixas abertos e fala com o operador.",0],
    ["caixa_conferir_fechamento","Conferir fechamento (fechou certo / teve quebra)","Decide se o caixa fechou certo ou teve quebra.",0]
  ]},
  {n:"Transferências e lacres",i:[
    ["transferencias_confirmar","Confirmar recebimento de lacre","Confirma que o malote chegou.",0],
    ["lacres_gerenciar","Cadastrar e baixar lacres","Cadastra os lacres e dá baixa neles.",0]
  ]},
  {n:"Compras e estoque",i:[
    ["compras_cotar","Fazer cotação","Cota o pedido com os fornecedores.",0],
    ["compras_aprovar","Aprovar pedido de compra","Aprova o pedido antes de comprar.",0],
    ["compras_receber","Receber e conferir mercadoria","Recebe a mercadoria e confere com o pedido.",0]
  ]},
  {n:"Pessoas e DP",i:[
    ["cargos_salarios_editar","Editar cargos e salários do DP","Muda cargos e salários do departamento pessoal.",1]
  ]},
  {n:"Administração",aviso:"Estas três dão poder sobre o acesso dos outros. Ninguém libera para outra pessoa o que ele mesmo não tem; em geral ficam só com o administrador.",i:[
    ["usuarios_visualizar","Ver as pessoas com acesso","Vê quem tem conta no sistema.",1],
    ["usuarios_gerenciar","Criar, editar e desativar usuários","Cria, edita e desativa contas.",1],
    ["permissoes_gerenciar","Montar cargos de acesso e acessos por pessoa","Define o acesso de cargos e pessoas (esta tela).",1]
  ]}
];
