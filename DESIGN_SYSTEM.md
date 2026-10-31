# CICLUZ — referência de interface

Esta é a fonte de regras para alterações de interface. Os estilos compartilhados ficam em `dist/design-system.css`, carregados depois dos estilos legados. Reutilizar componentes e variáveis existentes antes de criar novos estilos.

## Cor por origem

- Vendas: amarelo #eab308; transferências e contas: laranja #f97316; despesas: vermelho #ef4444; mercadorias: verde #22c55e; retiradas: azul #2563eb; resultado, configurações e formulários: roxo #7c3aed.
- A cor do menu específico prevalece sobre a cor do ancestral. Grupo de contas dentro de TI usa laranja.
- Editar, salvar, voltar, seleção e destaques herdam a cor da tela via `--menu-accent` / `--panel-color`. Nunca fixar roxo porque um componente veio de Cargos.
- Excluir é a exceção semântica: vermelho, com confirmação depois da ação de excluir.
- Marcas bancárias preservam as próprias cores: fundo branco, círculo laranja, imagem contida e sem extravasar.

## Ícones e navegação

- Transferências e Grupo de contas usam o mesmo símbolo $ +/−. Conta nova herda esse símbolo; substituição individual é opcional.
- Cabeçalho da próxima tela repete o ícone da opção que a abriu. Sem ícone próprio, herdar da origem imediatamente anterior.
- Submenus laterais textuais não ganham ícones extras sem solicitação.
- Toda escolha de ícone tem prévia imediata com nome. Opções circulares, seleção simples e Mais ícones para biblioteca ampliada.
- Botões Voltar e Fechar circulares e discretos. Voltar retorna à etapa anterior real.

## Componentes e comportamento

- Referência visual: Cadastro do cargo. Montserrat, títulos 16px, campos/nomes 12px, informações auxiliares 11px; campos 42px, raio 8px, fichas raio 10px.
- Cabeçalho no tom claro da origem, conteúdo branco; tema escuro com contraste equivalente.
- Editar/Excluir: painel lateral deslizante, lápis e lixeira SVG, botões 38px e raio 9px. Fecha ao clicar fora ou no nome novamente.
- Enter em campo de uma linha avança ao próximo campo disponível; textarea preserva quebra de linha; não salva automaticamente.
- Contas ativas antes das inativas, depois ordem alfabética ou manual salva. Inativas ficam mais apagadas. Alça de movimento à esquerda.
- Máscaras e capitalização centralizadas; preservar siglas e identificadores.
- Preservar desenho original da marca e trajeto aprovado da animação. Não redesenhar livremente.

## Verificação antes de concluir

Conferir origem da cor e do ícone, estados ativo/inativo/selecionado, navegação de volta, tema claro/escuro e menu aberto/recolhido quando relevante. Não declarar validação visual sem executá-la.

## Grupos financeiros

- Títulos centralizados em `dist/groups.js`: CNT - Grupo Contas (laranja), VND - Grupo Vendas (amarelo), RET - Grupo Retiradas (azul), MER - Grupo Mercadorias (verde), DES - Grupo Despesas (vermelho).
- Grupos expansíveis com subgrupos, ações laterais, ícone com prévia e situação ativo/inativo. Itens sem subgrupo permanecem no nível principal. Não combinar registros similares sem decisão do usuário.
- Documento: DOC/F, DOC/NF ou DOC/F/NF. Apenas MER - Grupo Mercadorias inclui o campo Finalidade: VENDA ou TRANSFORMAÇÃO, sem inferência automática.
- Dados iniciais recebidos em 31/10/2026: mercadorias, despesas e vendas. Retiradas recebidas: 4 grupos e 12 subgrupos; preservar cada item informado.

## Revisão de 31/10/2026

- Somente CNT, VND, RET, MER e DES permanecem maiúsculos no início dos nomes financeiros; restante em minúsculas, sem abreviar nem cortar nomes recebidos.
- Títulos: sigla, espaço, traço, espaço, grupo e nome (sem “de”).
- Expandir/recolher: ícones circulares no cabeçalho. Grupos com filhos têm seta própria separada da seta de ações.
- Lista completa opcional mantém cada linha recebida: 79 MER, 98 DES e 10 VND. DES despesas bancárias também existe como item próprio, além dos subgrupos.
- Listas e formulários usam as classes de Contas; ações usam uma função compartilhada, inclusive SVG, dimensões e animação.

- Atualização: iniciais das palavras maiúsculas (Grupo Contas, Investimento - Hidráulico), com CNT, VND, RET, MER e DES sempre em maiúsculas no início. Essa decisão substitui o padrão anterior de nomes inteiramente minúsculos.

- Todos os menus laterais internos e cartões de navegação têm alça à esquerda, ordem manual persistida por menu e suporte a arrastar ou teclas de seta. Grupos e subgrupos financeiros preservam a hierarquia.
- Exceções de capitalização confirmadas: PDV e códigos 1M, 1T, 2M, 2T, 3M, 3T, 4M e 4T.

- Ordenação: retirar seletores Manual/A–Z. Arrastar a alça já aplica e salva a ordem manual. Botão compacto A–Z reorganiza os nomes, mantendo ativos antes de inativos nos cadastros financeiros e preservando os vínculos de grupos/subgrupos. Padrão aplicado também às opções laterais e aos cartões de navegação.

- Cargos incluído explicitamente: alça à esquerda na lista, botão A–Z no cabeçalho, ordem manual preservada ao reabrir. Pesquisa e filtro de categoria continuam disponíveis.

- Destaque ao arrastar: borda herda a cor do menu/registro de origem; nunca reutilizar laranja fixo de Contas em outros módulos.

- Controle de organização exibe “A/Z” (com barra). Nos cadastros e telas internas fica no cabeçalho, no mesmo grupo de botões circulares Voltar/Fechar/Expandir. Nos menus laterais fica no cabeçalho do respectivo menu. Tamanho e alinhamento compartilhados; cor da origem.

- Ordem fixa dos controles do cabeçalho: Voltar primeiro, Fechar segundo. A/Z e todos os demais ícones vêm depois, sem deslocar os dois primeiros. Aplicar a regra central `normalizeHeaderActions`.

- Exceção confirmada: o menu lateral principal e seus cabeçalhos não exibem A/Z. Preservar as alças de arraste; A/Z permanece nos cabeçalhos das telas internas e cadastros.

- Arraste contínuo: permitir mover do topo ao fim em um único gesto, com rolagem automática nas bordas. Usar o controlador compartilhado `enableContinuousReorder`, mantendo rastreamento mesmo ao mudar o elemento de posição. Salvar ao soltar; cancelar restaura a ordem. Preservar hierarquia e ativos antes de inativos.
