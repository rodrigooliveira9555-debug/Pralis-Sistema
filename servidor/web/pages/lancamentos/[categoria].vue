<script setup lang="ts">
import { Package, PiggyBank, Plus, Receipt, Repeat } from "lucide-vue-next";
import { CATEGORIAS_LANCAMENTO, diaNegocio, type CategoriaLancamento, type LancamentoResposta } from "@cicluz/shared";
import { CATEGORIAS, formatarData, formatarMoeda } from "~/utils/formato";

const route = useRoute();
const categoria = computed(() => String(route.params["categoria"]) as CategoriaLancamento);
if (!(CATEGORIAS_LANCAMENTO as readonly string[]).includes(categoria.value)) {
  throw createError({ statusCode: 404, statusMessage: "Tela não encontrada" });
}
const info = computed(() => CATEGORIAS[categoria.value]);
const icone = computed(() => ({ despesas: Receipt, mercadorias: Package, retiradas: PiggyBank })[categoria.value]);
const sessao = useSessao();
const administrador = computed(() => sessao.value?.papel === "administrador");
useHead(() => ({ title: `${info.value.titulo} · CICLUZ` }));

// Período padrão: o mês corrente (dia de negócio em São Paulo).
const hoje = diaNegocio(new Date());
const filtro = reactive({
  dataInicio: `${hoje.slice(0, 7)}-01` as string | null,
  dataFim: null as string | null,
  situacao: "todos" as "todos" | "pendentes" | "pagos"
});
const SITUACOES = [
  { title: "Todos", value: "todos" },
  { title: "A pagar", value: "pendentes" },
  { title: "Pagos", value: "pagos" }
];

const lista = ref<LancamentoResposta[]>([]);
const total = ref(0);
const valorTotal = ref("0");
const pagina = ref(1);
const carregando = ref(false);
const erro = ref("");
const aviso = ref("");

async function carregar(adicionar = false) {
  carregando.value = true;
  erro.value = "";
  try {
    const params = new URLSearchParams({ situacao: filtro.situacao, page: String(pagina.value), pageSize: "50" });
    if (filtro.dataInicio) params.set("dataInicio", filtro.dataInicio);
    if (filtro.dataFim) params.set("dataFim", filtro.dataFim);
    const dados = await chamarApi<{ lancamentos: LancamentoResposta[]; total: number; valorTotal: string }>(
      `/lancamentos/${categoria.value}?${params}`
    );
    lista.value = adicionar ? [...lista.value, ...dados.lancamentos] : dados.lancamentos;
    total.value = dados.total;
    valorTotal.value = dados.valorTotal;
  } catch (e) {
    erro.value = e instanceof Error ? e.message : "Não foi possível carregar.";
  } finally {
    carregando.value = false;
  }
}

watch([categoria, () => filtro.dataInicio, () => filtro.dataFim, () => filtro.situacao], () => {
  pagina.value = 1;
  carregar();
}, { immediate: true });

function carregarMais() {
  pagina.value += 1;
  carregar(true);
}

const formularioAberto = ref(false);
const emEdicao = ref<LancamentoResposta | null>(null);

function novo() {
  emEdicao.value = null;
  formularioAberto.value = true;
}

async function abrir(item: LancamentoResposta) {
  try {
    emEdicao.value = await chamarApi<LancamentoResposta>(`/lancamentos/item/${item.id}`);
    formularioAberto.value = true;
  } catch (e) {
    erro.value = e instanceof Error ? e.message : "Não foi possível abrir.";
  }
}

function aoSalvar(mensagem: string) {
  aviso.value = mensagem;
  pagina.value = 1;
  carregar();
}

async function cancelarSerie(item: LancamentoResposta) {
  if (!item.recorrenciaId) return;
  if (!window.confirm("Cancelar a série apaga as ocorrências futuras ainda não pagas. Continuar?")) return;
  try {
    const r = await chamarApi<{ removidas: number }>(`/lancamentos/series/${item.recorrenciaId}/cancelar`, { metodo: "PATCH" });
    aviso.value = `${r.removidas} lançamento(s) futuro(s) da série removido(s).`;
    pagina.value = 1;
    carregar();
  } catch (e) {
    erro.value = e instanceof Error ? e.message : "Não foi possível cancelar a série.";
  }
}
</script>

<template>
  <div class="tela" :style="{ '--cor-origem': info.cor }">
    <header class="tela-topo">
      <component :is="icone" class="icone-tela" aria-hidden="true" />
      <div>
        <h1>{{ info.titulo }}</h1>
        <p>Lançamentos / {{ info.subtitulo }}</p>
      </div>
    </header>

    <section class="tela-conteudo">
      <div class="filtros" role="search" aria-label="Filtrar lançamentos">
        <CampoData v-model="filtro.dataInicio" :rotulo="categoria === 'retiradas' ? 'Lançados de' : 'Vencendo de'" />
        <CampoData v-model="filtro.dataFim" rotulo="até" />
        <v-select v-model="filtro.situacao" :items="SITUACOES" label="Situação" />
      </div>

      <v-alert v-if="aviso" type="success" variant="tonal" closable class="mb-3" @click:close="aviso = ''">{{ aviso }}</v-alert>
      <v-alert v-if="erro" type="error" variant="tonal" class="mb-3">{{ erro }}</v-alert>

      <p v-if="!carregando && !lista.length" class="vazio texto-suave">Nenhum lançamento neste período.</p>

      <ul class="lista" :aria-busy="carregando">
        <li v-for="item in lista" :key="item.id" class="linha">
          <button type="button" class="linha-abrir" @click="abrir(item)">
            <span class="linha-data">{{ formatarData(categoria === 'retiradas' ? item.dataReferencia : item.dataVencimento) }}</span>
            <span class="linha-texto">
              <strong>{{ item.observacao }}</strong>
              <small class="texto-suave">{{ [item.grupoNome, item.contaNome].filter(Boolean).join(" · ") || "Sem grupo e sem conta" }}</small>
            </span>
            <span class="linha-selos">
              <v-chip size="small" :color="item.dataPagamento ? 'success' : 'warning'" variant="tonal">
                {{ item.dataPagamento ? `Pago ${formatarData(item.dataPagamento)}` : "A pagar" }}
              </v-chip>
              <v-chip v-if="item.pendenteDiscriminacao" size="small" variant="outlined">Sem itens</v-chip>
              <v-chip v-if="item.recorrenciaOrdem" size="small" variant="outlined"><Repeat :size="14" class="mr-1" />{{ item.recorrenciaOrdem }}</v-chip>
            </span>
            <span class="linha-valor">{{ formatarMoeda(item.valorTotal) }}</span>
          </button>
          <v-btn
            v-if="administrador && item.recorrenciaId && !item.dataPagamento"
            size="small"
            variant="text"
            color="error"
            class="linha-serie"
            @click="cancelarSerie(item)"
          >
            Cancelar série
          </v-btn>
        </li>
      </ul>
      <v-btn v-if="lista.length < total" variant="outlined" color="primary" :loading="carregando" class="mt-3" @click="carregarMais">
        Carregar mais ({{ total - lista.length }})
      </v-btn>
    </section>

    <footer class="tela-rodape">
      <p class="rodape-total">
        <span class="texto-suave">{{ total }} lançamento(s)</span>
        <strong>{{ formatarMoeda(valorTotal) }}</strong>
      </p>
      <v-btn color="primary" @click="novo"><Plus :size="18" class="mr-1" /> Novo lançamento</v-btn>
    </footer>

    <FormularioLancamento v-model="formularioAberto" :categoria="categoria" :lancamento="emEdicao" @salvo="aoSalvar" />
  </div>
</template>

<style scoped>
.filtros {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0 12px;
}

.lista {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.linha {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  border: 1px solid var(--borda);
  border-radius: 8px;
}

.linha-abrir {
  flex: 1 1 320px;
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 8px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s var(--ease-saida);
}

.linha-abrir:hover,
.linha-abrir:focus-visible {
  background: color-mix(in srgb, var(--cor-origem) 10%, transparent);
}

.linha-abrir:focus-visible {
  outline: 2px solid var(--cor-origem);
  outline-offset: -2px;
}

.linha-data { font-weight: 600; font-size: 13px; }
.linha-texto { display: grid; min-width: 0; }
.linha-texto strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.linha-texto small { font-size: 11px; }
.linha-selos { display: flex; flex-wrap: wrap; gap: 4px; }
.linha-valor { font-weight: 700; text-align: right; white-space: nowrap; }
.linha-serie { margin-right: 8px; }

.vazio { margin: 24px 0; text-align: center; }

.rodape-total {
  display: grid;
  margin: 0;
  line-height: 1.2;
}

.rodape-total strong { font-size: 18px; }

@media (max-width: 700px) {
  .filtros { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .linha-abrir { grid-template-columns: 64px minmax(0, 1fr); }
  .linha-selos { grid-column: 2; }
  .linha-valor { grid-column: 2; text-align: left; }
}
</style>
