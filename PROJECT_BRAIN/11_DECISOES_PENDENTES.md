# 11 — Decisões pendentes

Quem decide: **M** = Marco · **R** = Rodrigo (dono das regras operacionais e financeiras).

| #   | Pergunta | Quem | Por que trava |
| --- | -------- | ---- | ------------- |
| P-01 | ~~Qual é o papel deste repositório?~~ **RESPONDIDA (03/11/2026, Marco):** produto próprio, com backend e banco separados do Sistema Pralis, na pasta `servidor/` deste repositório (doc 12). | M | — |
| P-02 | Destinos contábeis dos tipos de venda: Roubo/Furto, Sobra/Perda (MER), Colaboradores (VND/DES), Sócios (VND/RET). O que acontece com o dinheiro em cada um? | R | não pode virar regra de sistema sem explicação |
| P-03 | O que é o **−66,6%** de L-Alimentação? Desconto, taxa, repasse? | R | é fórmula de dinheiro |
| P-04 | "Transferência Automática – Grupo de Contas" da taxa: deve gerar lançamento um dia? Quando? | R | hoje não gera nada |
| P-05 | Cores por origem × modelo de cores do sistema real (`03_MODELO_DE_CORES` e tokens `--cx-*`) — qual vale se unificar? | M | duas linguagens visuais para o mesmo ERP |
| P-06 | ~~Exportar os dados do iPad antes de mudar o armazenamento?~~ **RESPONDIDA (03/11/2026, Marco):** a importação inicial é feita pelo administrador NO iPad, pela tela de entrada; nada do aparelho é apagado sem ir antes para o histórico do servidor. Rodrigo precisa saber disso antes de publicar. | M + R | — |
| P-07 | Taxa por vigência e salário por vigência entram na fila do sistema real? | M | ideias boas que o real pode não ter |
| P-08 | Espaço entre quadros de Taxas: 12 px ou o valor da DS 256? | R | contradição no DS (doc 10) |
| P-09 | Ação não aplicável: escondida ou visível e desabilitada? | R | contradição no DS (doc 10) |
| P-10 | "Diretor de Operação" e "Diretor de Operações" são o mesmo papel? | R | nomes divergentes nos menus |
| P-11 | O **Cadastro completo** (CPF, filiação, dependentes) deve ir para o servidor? Hoje continua só no aparelho. Precisa de regra de LGPD: quem vê, por quanto tempo, onde ficam os anexos. | M + R | dado pessoal |
| P-11a | ~~Fornecedores do Compras (CPF/CNPJ e WhatsApp) vão para o servidor?~~ **RESPONDIDA (04/11/2026, Zé):** sim. É contato comercial, necessário para cotar, e vai no documento `cicluz-compras-v1` (`servidor/shared/src/documentos.ts`). Exceção pontual: o Cadastro completo (P-11) continua fora. | Zé | — |
| P-12 | O papel `usuario` pode editar tudo, como o `administrador`? Hoje só a importação inicial é exclusiva do administrador. Em Lançamentos foi adotado: usuário vê, cria, edita não pago e discrimina; pagar, editar pago, recorrência e cancelar série só o administrador (doc 13). Confirmar. | R | quem pode o quê |
| P-13 | Onde a API roda em produção (Coolify, igual ao principal, ou função no Vercel) e qual domínio. O site no Vercel precisa repassar `/api/*` para ela. | M | sem isso o site publicado não entra |
| P-14 | Por quanto tempo guardar o histórico de documentos (cada gravação guarda uma cópia inteira)? | M | crescimento do banco |
| P-15 | Cadastros de fornecedores e de sócios/gestores: o principal exige fornecedor na Mercadoria e credor na Retirada. Criar esses cadastros no app? | M + R | Lançamentos ficam sem credor |
| P-16 | Fundo das contas (D8 do principal) e porta de saldo insuficiente: adicionar o fundo ao cadastro de contas? | M + R | sem fundo não há saldo |
| P-17 | Agenda: os submenus "Gestão de Pessoas" e "Diretor de Operações" viraram **listas** da Agenda (como no Lembretes). É isso, ou são agendas de papéis diferentes, com acesso separado? | Zé/R | adotado provisoriamente em 05/11/2026 |
| P-19 | ~~Agenda: avaliação, perfil comportamental e permissões~~ **RESPONDIDA (05/11/2026, Zé com o Rodrigo):** **Avaliação** da execução da tarefa, depois de concluída: o gestor avalia cada responsável, cada responsável se autoavalia, o gestor vê a comparação; nota não muda; por enquanto só registro. **Permissões**: gestor = quem criou; responsável (esse nome) pode ser mais de um; quem não participa não vê; o gestor escolhe quem vê, edita, conclui, exclui (não depende de cargo nem de login). **Perfil comportamental**: em espera (os perfis ainda vão ser definidos); faz parte do cadastro da pessoa, e o sistema vai sugerir quem faz cada tipo de tarefa pelo perfil. | Zé/R | perfil: aguardando a lista de perfis |
| P-20 | ~~Produção: 21 perguntas da reunião com o Rodrigo~~ **RESPONDIDA (05/11/2026, Zé):** decisões na seção 9 de `docs/PRODUCAO_ESPECIFICACAO.md` — partes como etiqueta + intermediários; cargo + nível; estoque do Compras (pedido sai do livre, ordem pronta entra, abastecimento sai, sobra volta, ingredientes baixam); reposição como sugestão aprovada; conferência todos/curva A; fórmulas de custo C1–C5 aprovadas (parâmetros preenchidos na tela). Ficam abertos: DUM e nome reduzido; definição de margem por produto para o relatório; limite manhã/tarde do turno (12:00 provisório). | Zé/R | DUM, margem, turno |
| P-18 | ~~Agenda: quem pode ser responsável?~~ **RESPONDIDA (05/11/2026, Zé):** manter a lista provisória (quem está logado + a do Compras) até existir o cadastro de usuários. | Zé | — |
