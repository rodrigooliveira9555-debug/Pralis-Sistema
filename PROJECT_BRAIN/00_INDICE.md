# PROJECT BRAIN — CICLUZ · Gestão de Padaria (Pralis-Sistema do Rodrigo)

> Fonte de verdade de **produto e decisão** deste repositório
> (`rodrigooliveira9555-debug/Pralis-Sistema`). Lido em **03/11/2026**, último commit `ccb1bf9`.
> Se o código e este brain discordarem, o código do HEAD vence — e o brain é corrigido no mesmo commit.

## Como ler

Entrando agora: **01 → 02 → 03 → 11**. Antes de mexer em tela: **05 + 06**. Antes de pensar em
backend: **08 + 12**.

| #  | Documento                                                        | Responde                                                   |
| -- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| 01 | [Visão e natureza](01_VISAO_E_NATUREZA.md)                       | o que é este projeto e o que ele **não** é                 |
| 02 | [Mapa de telas](02_MAPA_DE_TELAS.md)                             | todos os menus, telas e o status real de cada uma          |
| 03 | [Domínio financeiro](03_DOMINIO_FINANCEIRO.md)                   | VND, CNT, DES, MER, RET, bandeiras, operadoras, taxas      |
| 04 | [Dados e código](04_DADOS_E_CODIGO.md)                           | onde os dados moram, módulos JS, chaves do localStorage    |
| 05 | [Regras de design vigentes](05_REGRAS_DE_DESIGN_VIGENTES.md)     | cor por origem, tipografia, layout, campos, datas          |
| 06 | [Processo de mudança](06_PROCESSO_DE_MUDANCA.md)                 | como mudar uma tela sem quebrar as outras                  |
| 07 | [Linha do tempo](07_LINHA_DO_TEMPO.md)                           | 343 commits em 6 dias, fase por fase                       |
| 08 | [Ponte com o sistema real](08_PONTE_COM_O_SISTEMA_REAL.md)       | o que já existe no Sistema Pralis em produção              |
| 09 | [Dívidas técnicas](09_DIVIDAS_TECNICAS.md)                       | o que pesa no código hoje                                  |
| 10 | [Contradições e regras superadas](10_CONTRADICOES.md)            | onde os documentos se contradizem                          |
| 11 | [Decisões pendentes](11_DECISOES_PENDENTES.md)                   | o que precisa de Marco/Rodrigo antes de seguir             |
| 12 | [Plano de backend](12_PLANO_DE_BACKEND.md)                       | como dar backend copiando a estrutura do sistema principal |

`cerebro-visual.html` é a mesma informação em uma página navegável (abrir no navegador).

## Regras de manutenção deste brain

1. Toda decisão nova de negócio ou de design é registrada **aqui** (negócio) ou no `DESIGN_SYSTEM.md`
   (visual) — nunca só no chat.
2. Regra nova que substitui outra: marque a antiga como **SUPERADA (data, por quê)**, não apague o
   histórico, e atualize o doc 10.
3. Número, contagem ou nome de arquivo citado aqui precisa ser conferível no código.
- `13_LANCAMENTOS.md` — app novo (Nuxt) e Lançamentos com as regras do principal (03/11/2026).
- `14_CASCA_CAIXA.md` — casca do Caixa no site (Entradas → Caixas, padrão Compras), sem backend; Abertura pronta, continua com o Washington.
- `15_ACESSOS.md` — Configurações: usuários, postos do caixa, cargos de acesso e permissões (06/11/2026), com o que já bloqueia e o que falta.
