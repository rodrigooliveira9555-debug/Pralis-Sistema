/*
 * Configurações → Permissões → Acesso por Tela: o menu do sistema (grupo › seção › tela) usado como EXEMPLO na tela.
 * Foi tirado do menu de 19/11/2026: a chave de cada tela é a data-menu-item-key do próprio cartão do menu. Tipo da seção:
 * l = lançamento (lançar, editar, pagar, ver), r = relatório (ver), c = cadastro (lançar, editar, ver), v = só consulta.
 * Não é lido do menu na hora de propósito: é dado de exemplo, sem backend. A versão de verdade vai ler as chaves do menu.
 */
window.CicluzAcessosTelasDados = [
  {n:"Entradas",c:"#eab308",s:[
    {n:"Lançamentos",t:"l",i:[["vz-lan-vnd-vendas","VND - Vendas"],["caixa:abertura","VND - Abertura de Caixa"],["caixa:turno","VND - Turno do Caixa"],["caixa:fechamento","VND - Fechamento de Caixa"],["caixa:gerencia","VND - Gerência de Caixas"]]},
    {n:"Relatórios",t:"r",i:[["vz-rel-vnd-vendas","VND - Vendas"],["caixa:fechamentos","VND - Fechamentos de Caixa"]]},
    {n:"Cadastros Geral",t:"c",i:[["compras:clientes-vnd","VND - Clientes"],["ti-vendas","VND - Grupos de Vendas"],["ti-tipos-venda","VND - Tipos de Venda"],["ti-bandeiras","VND - Tipos de Bandeiras Cartões"],["ti-operadoras","VND - Tipos de Operadoras Cartões"]]},
    {n:"Pastas Documentos",t:"c",i:[["vz-doc-vnd-imagens-notas-vendas-lanc-adas","VND - Imagens Notas Vendas Lançadas"],["vz-doc-vnd-contratos-clientes","VND - Contratos Clientes"],["vz-doc-vnd-documentos-clientes","VND - Documentos Clientes"]]}
  ]},
  {n:"Transferências",c:"#f97316",s:[
    {n:"Lançamentos",t:"l",i:[["vz-lan-cnt-transfere-ncias","CNT - Transferências"],["caixa:tesouraria","CNT - Tesouraria"]]},
    {n:"Relatórios",t:"r",i:[["vz-rel-cnt-transfere-ncias","CNT - Transferências"]]},
    {n:"Cadastros Geral",t:"c",i:[["ti-contas","CNT - Grupos de Contas"]]},
    {n:"Pastas Documentos",t:"c",i:[["vz-doc-cnt-imagens-notas-transfere-ncias","CNT - Imagens Notas Transferências"]]}
  ]},
  {n:"Saídas · Despesas",c:"#ef4444",s:[
    {n:"Lançamentos",t:"l",i:[["vz-lan-des-despesas","DES - Despesas"]]},
    {n:"Lançamentos Colaboradores",t:"l",i:[["vz-lan-des-despesas-colaboradores","DES - Despesas Colaboradores"],["exams","DES - Exames Ocupacionais"],["uniforms","DES - Uniformes Entrega (-) Recebimento (+)"],["occurrences","DES - Ocorrências"],["trial","DES - Período de Teste"],["ponto","DES - Ponto Eletrônico Importação"],["folha-importacao","DES - Folha de Pagamento Importação Contabilidade"],["vz-lan-des-admissa-o-contratac-a-o","DES - Admissão / Contratação"],["vz-lan-des-demissa-o-desligamento","DES - Demissão / Desligamento"],["vz-lan-des-capacitac-a-o-desenvolvimento","DES - Capacitação / Desenvolvimento"]]},
    {n:"Relatórios",t:"r",i:[["vz-rel-des-despesas","DES - Despesas"],["folha-custos","DES - Folha de Pagamento"],["vz-rel-des-uniformes","DES - Uniformes"],["vz-rel-des-ocorre-ncias","DES - Ocorrências"],["exams-report","DES - Exames Ocupacionais"],["collaborators","DES - Cadastro Colaborador"]]},
    {n:"Cadastros Geral",t:"c",i:[["ti-despesas","DES - Grupos de Despesas"],["compras:fornecedores-des","DES - Fornecedores"]]},
    {n:"Cadastros Geral Colaboradores",t:"c",i:[["simple","DES - Simples Colaborador"],["form","DES - Completo Colaborador C/Dependente"],["config-area","DES - Área / Setor / Local"],["jobs","DES - Cargos C/Salários"],["salary-update","DES - Atualização Salários Dissídio Coletivo"],["job-profiles","DES - Ficha de Cargos"],["config-organograma","DES - Organograma"],["jornada-shifts","DES - Horário / Escala"],["occurrence-catalog","DES - Tipos de Ocorrência"],["uniform-types","DES - Tipos de Uniforme"]]},
    {n:"Estoque",t:"c",i:[["vz-est-des-grupo-despesas","DES - Grupo Despesas"],["uniforms-stock","DES - Uniformes"]]},
    {n:"Pastas Documentos",t:"c",i:[["vz-doc-des-imagens-notas-despesas-lanc-adas","DES - Imagens Notas Despesas Lançadas"],["vz-doc-des-contratos-colaboradores","DES - Contratos Colaboradores"],["vz-doc-des-contratos-fornecedores","DES - Contratos Fornecedores"],["vz-doc-des-documentos-colaboradores","DES - Documentos Colaboradores"],["vz-doc-des-documentos-fornecedores","DES - Documentos Fornecedores"]]}
  ]},
  {n:"Saídas · Mercadorias",c:"#22c55e",s:[
    {n:"Lançamentos",t:"l",i:[["vz-lan-mer-mercadorias","MER - Mercadorias"],["compras:solicitacao","MER - Pedido de Compra"],["compras:cotacao","MER - Cotação por Fornecedor"],["compras:pedidos","MER - Pedidos a Receber"],["compras:conferencias","MER - Contagem de Estoque"]]},
    {n:"Relatórios",t:"r",i:[["vz-rel-mer-mercadorias","MER - Mercadorias"],["vz-rel-mer-pedidos","MER - Pedidos"],["producao:relatorios","MER - Produção"]]},
    {n:"Cadastros Geral",t:"c",i:[["ti-mercadorias","MER - Grupos de Mercadorias"],["compras:fornecedores","MER - Fornecedores"],["compras:produtos","MER - Produtos"],["compras:unidades","Unidades de Medida"],["compras:cadastro","MER - Catálogo e Preço-Base"]]},
    {n:"Cadastros Geral Produção",t:"c",i:[["producao:produtos","MER - Produtos da Produção"],["producao:fichas","MER - Ficha Técnica de Produtos"],["producao:custos","MER - Parâmetros de Custo"],["producao:ingredientes","MER - Ingredientes Ficha Técnica / Tabela TACO"]]},
    {n:"Estoques",t:"c",i:[["compras:estoque","MER - Grupo Mercadorias"]]},
    {n:"Pastas Documentos",t:"c",i:[["vz-doc-mer-imagens-notas-mercadorias-lanc-adas","MER - Imagens Notas Mercadorias Lançadas"],["vz-doc-mer-contratos-fornecedores","MER - Contratos Fornecedores"],["vz-doc-mer-documentos-fornecedores","MER - Documentos Fornecedores"]]}
  ]},
  {n:"Saídas · Retiradas",c:"#2563eb",s:[
    {n:"Lançamentos",t:"l",i:[["vz-lan-ret-retiradas","RET - Retiradas"]]},
    {n:"Relatórios",t:"r",i:[["vz-rel-ret-retiradas","RET - Retiradas"]]},
    {n:"Cadastros Geral",t:"c",i:[["ti-retiradas","RET - Grupos de Retiradas"],["asset","RET - Patrimônios"]]},
    {n:"Estoque",t:"c",i:[["vz-est-ret-grupo-patrimo-nio","RET - Grupo Patrimônio"]]},
    {n:"Pastas Documentos",t:"c",i:[["vz-doc-ret-imagens-notas-retiradas-lanc-adas","RET - Imagens Notas Retiradas Lançadas"],["vz-doc-ret-contratos-so-cios","RET - Contratos Sócios"],["vz-doc-ret-contratos-fornecedores","RET - Contratos Fornecedores"],["vz-doc-ret-documentos-so-cios","RET - Documentos Sócios"],["vz-doc-ret-documentos-fornecedores","RET - Documentos Fornecedores"]]}
  ]},
  {n:"Resultados",c:"#7c3aed",s:[
    {n:"Lançamentos",t:"r",i:[["vz-lan-res-resultado","RES - Resultado"],["vz-lan-car-carto-es-relato-rios","CAR - Cartões Relatórios"],["vz-lan-pdv-pdv-relato-rio","PDV - PDV Relatório"]]},
    {n:"Relatórios",t:"r",i:[["vz-rel-res-resultado","RES - Resultado"],["vz-rel-car-carto-es-relato-rios","CAR - Cartões Relatórios"],["vz-rel-pdv-pdv-relato-rio","PDV - PDV Relatório"]]}
  ]},
  {n:"Configurações",c:"#7c3aed",s:[
    {n:"Empresa",t:"c",i:[["acessos:empresa","Dados da Empresa"],["acessos:empresa-estrutura","Estrutura de Dados da Empresa"]]},
    {n:"Permissões",t:"c",i:[["acessos:cargos","Cargos de Acesso"],["acessos:pessoa","Acessos por Pessoa"]]},
    {n:"Usuários",t:"c",i:[["acessos:usuarios","Pessoas com Acesso"],["acessos:dados","Dados no Servidor"]]},
    {n:"Senhas",t:"c",i:[["acessos:senhas","Minha Senha"],["acessos:senha-outra","Senha de Outra Pessoa"]]},
    {n:"Diversos",t:"c",i:[["acessos:salario-minimo","Salário Mínimo Vigente"]]},
    {n:"Design System",t:"v",i:[["acessos:ds-letras","Letras"],["acessos:ds-tamanhos","Tamanho das Letras"],["acessos:ds-cores","Cores"],["acessos:ds-espacamento","Espaçamento"],["acessos:ds-icones","Ícones"],["acessos:ds-cabecalho","Cabeçalho e Barra de Baixo"],["acessos:ds-botoes","Botões"],["acessos:ds-campos","Campos de Preenchimento"],["acessos:ds-mascaras","Máscaras"],["acessos:ds-quadros","Quadros e Molduras"],["acessos:ds-listas","Listas"],["acessos:ds-menu","Menu e Cartões"],["acessos:ds-janelas","Janelas e Painéis"],["acessos:ds-mensagens","Mensagens e Avisos"],["acessos:ds-conferencia","Conferência Final"]]}
  ]}
];

/*
 * Aba "Ações especiais": as permissões que não são lançar, editar, pagar ou ver (verbos próprios de um fluxo). As chaves e os
 * nomes são os do catálogo de hoje (servidor/shared/src/acessos.ts); a descrição é só um apoio da tela. Valem para a ÁREA
 * inteira, como hoje (não por tela). s = sensível (mexe em dinheiro já registrado, em dado do DP ou no acesso dos outros).
 */
window.CicluzAcessosAcoesDados = [
  {n:"Lançamentos",i:[
    ["lancamentos_discriminar","Discriminar (classificar depois)","Lança agora e classifica depois, em grupo e subgrupo.",0],
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
