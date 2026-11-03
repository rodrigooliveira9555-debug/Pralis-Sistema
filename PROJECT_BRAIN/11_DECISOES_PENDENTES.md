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
| P-12 | O papel `usuario` pode editar tudo, como o `administrador`? Hoje só a importação inicial é exclusiva do administrador. Precisa de regra por tela? | R | quem pode o quê |
| P-13 | Onde a API roda em produção (Coolify, igual ao principal, ou função no Vercel) e qual domínio. O site no Vercel precisa repassar `/api/*` para ela. | M | sem isso o site publicado não entra |
| P-14 | Por quanto tempo guardar o histórico de documentos (cada gravação guarda uma cópia inteira)? | M | crescimento do banco |
