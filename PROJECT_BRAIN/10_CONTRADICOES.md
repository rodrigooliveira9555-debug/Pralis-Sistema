# 10 — Contradições e regras superadas

Siglas: **DS** `DESIGN_SYSTEM.md` · **UCP** `UI_CHANGE_PROCESS.md` · **SWP** `UI_SWEEP_2026-11-01.md` ·
**DOS** `docs/DOSSIE_INTERFACE.md` · **VAL** `docs/VALIDACAO_INTERFACE.md`.

Regra: **vale a mais recente do DS**. Os trechos antigos devem ser marcados como superados.

| Tema | Evolução | Vigente | Trecho ainda desatualizado |
| ---- | -------- | ------- | -------------------------- |
| Texto do cabeçalho | branco (DS 306) → cinza (02/11) → cor da superfície (03/11) | cor da superfície | VAL 308 e DS 308 dizem "branco" |
| Identificador do cabeçalho | círculo branco → placa cinza → sem placa, 30 px | sem placa, 30 px | DOS §3, DS 254 |
| Controles do rodapé | cinza c/ símbolo branco → vazados → maciços cinza → cor do cabeçalho | cor do cabeçalho | DOS §5–6 ("superfície branca") |
| Geometria | sobreposição 12 px + curvas 20 px → retângulos separados por 6 px | 6 px, sem côncavas | DOS §3/§5, DS 307 |
| Título/subtítulo | 14 / 9 px → 16 / 11 px | 16 / 11 | DOS |
| Datas | `type=date` → DD/MM/AA com calendário → sem ícone | sem ícone | — |
| Ícone de Taxas | 38 px → 30 px (mesmo dia) | 30 px | DS "Complemento vigente" cita 38 |
| Espaço entre quadros de Taxas | 12 px → outro (DS 256) → 12 px (SWP/DS 01/11) | **ambíguo — decidir** | DS 256 |
| Quadros de classificação de taxas | interior branco → fundo claro → preenchido → "moldura" | moldura (SWP) | DS 258 |
| Cor da biblioteca de ícones | cinza → cor da aba → cinza → cor do cabeçalho | cor do cabeçalho | DS 236/242 |
| Excluir | vermelho → cor da aba → vermelho | vermelho | DS 235 |
| Peso do rótulo | 500 → 400 | 400 | UCP "Referências por função" |
| Cabeçalho | 14% acento + branco → cor intensa | intensa | UCP |
| Ações não aplicáveis | "não exibidas" → "visíveis e desabilitadas" (catálogo de 13) | **ambíguo — decidir** | DOS §16, DS 305 |
| Recolher cabeçalho | por aba na sessão → não preservar | não preservar | DS 264 |
| Personalização | preserva compacto/expandido → sempre compacto | sempre compacto | DS 294 |
| Tema escuro | interiores claros (SWP) → tema em tudo (DS 308) | tema em tudo | SWP |
| Cancelar | branco com X → transparente | transparente | SWP, DS 01/11 |
| Menu principal | excluído da padronização × recebeu ajustes autorizados | fora do padrão, ajustes pontuais autorizados | DS 234/305 |
| Controles do menu principal | 3 círculos → 2 + seta → 3 + seta à direita do nome | 3 + seta | DS "Menu inicial" |
| Barra de rolagem | fina 6 px → removida | removida | — |

**Duas decisões em aberto** (espaço entre quadros de Taxas e ações não aplicáveis) estão no doc 11.

### Texto do cabeçalho superior no tema escuro — 03/11/2026
A regra de 03/11 manda texto e símbolo do cabeçalho na superfície do tema (escuro #222128 no Sombra). Sobre o roxo #7c3aed isso dá 2,8:1, abaixo do mínimo de 4,5:1 do WCAG AA (medido pelo accessibility-director). A tela de entrada usa branco nos dois temas (DESIGN_SYSTEM, regra de 03/11 da tela de entrada). Falta o Rodrigo decidir se as abas internas seguem o mesmo caminho.
