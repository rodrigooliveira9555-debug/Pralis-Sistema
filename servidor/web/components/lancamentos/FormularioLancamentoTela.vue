<script setup lang="ts">
import { ArrowLeft, Package, PiggyBank, Receipt } from "lucide-vue-next";
import { diaNegocio, type CategoriaLancamento, type ChavePermissao, type LancamentoResposta } from "@cicluz/shared";
import { corpoParaApi, errosDosNumeros, formDeLancamento, formVazio, usePreviaLancamento } from "~/composables/useFormularioLancamento";
import { CATEGORIAS, formatarCentavos } from "~/utils/formato";

// Formulário de Despesa, Mercadoria ou Retirada em TELA PRÓPRIA (sem janela). Uma tela para cada
// categoria, com os campos do "+ NOVO → Saídas" do principal (PROJECT_BRAIN/16): a Retirada é a
// versão enxuta (sem documento fiscal, pagamento, vencimento nem discriminação) e o Grupo só
// aparece nela; em Despesa e Mercadoria o grupo é do item da discriminação.
const props = defineProps<{ categoria: CategoriaLancamento; lancamento: LancamentoResposta | null }>();

const sessao = useSessao();
// Mesmas permissões que a API cobra (cargos de acesso, Configurações › Permissões).
const pode = (chave: ChavePermissao) => sessao.value?.permissoes.includes(chave) ?? false;
const categoria = computed(() => props.categoria);
const info = computed(() => CATEGORIAS[props.categoria]);
const estilo = useEstiloOrigem(() => info.value.origem);
const icone = computed(() => ({ despesas: Receipt, mercadorias: Package, retiradas: PiggyBank })[props.categoria]);
const retirada = computed(() => props.categoria === "retiradas");
const { grupos, contas, erro: erroCadastros } = useCadastrosFinanceiros(categoria);
const aviso = useState<string>("lancamento-aviso", () => "");

const form = ref(props.lancamento ? formDeLancamento(props.lancamento) : formVazio());
const previa = usePreviaLancamento(form, categoria);
const errosNumeros = computed(() => errosDosNumeros(form.value));
const salvando = ref(false);
const erro = ref("");
const linhaComErro = ref<number | null>(null);
const hoje = () => diaNegocio(new Date());
const criando = computed(() => !props.lancamento);
const jaPago = computed(() => Boolean(props.lancamento?.dataPagamento));
// Lançamento pago: só quem tem "Editar lançamento já pago" altera.
const somenteLeitura = computed(() => jaPago.value && !pode("lancamentos_editar_pago"));
const discriminando = computed(() => !retirada.value && form.value.discriminar && form.value.itens.length > 0);
// D5: o Salvar fica bloqueado enquanto a soma dos itens não bate (o servidor também recusa).
const somaDivergente = computed(() => discriminando.value && previa.value.diferencaItensCentavos !== 0);
const avisoSoma = computed(() =>
  somaDivergente.value
    ? `A soma dos itens ${previa.value.diferencaItensCentavos > 0 ? "excede" : "não alcança"} o valor em ${formatarCentavos(
        Math.abs(previa.value.diferencaItensCentavos)
      )}. O Salvar fica bloqueado até bater.`
    : ""
);
const podeSalvar = computed(() => !salvando.value && !somaDivergente.value && Object.keys(errosNumeros.value).length === 0);

// Pagamento Sim/Não: Sim já põe a data de hoje; Não limpa a data.
const pago = computed({
  get: () => Boolean(form.value.dataPagamento),
  set: (sim: boolean) => {
    form.value.dataPagamento = sim ? form.value.dataPagamento || hoje() : null;
  }
});

const TIPOS = [
  { title: "R$", value: "valor" },
  { title: "%", value: "percentual" }
];

function voltar() {
  return navigateTo(`/lancamentos/${props.categoria}`);
}

async function salvar(criarNova = false) {
  if (!podeSalvar.value) return;
  salvando.value = true;
  erro.value = "";
  linhaComErro.value = null;
  try {
    const corpo = corpoParaApi(form.value, props.categoria, criando.value);
    let mensagem = "Lançamento atualizado.";
    if (criando.value) {
      const r = await chamarApi<{ serie?: number; serieLimitada?: boolean }>(`/lancamentos/${props.categoria}`, { metodo: "POST", corpo });
      mensagem = r.serie ? `Série criada com ${r.serie} lançamentos${r.serieLimitada ? " (limitada a 12 meses)" : ""}.` : "Lançamento salvo.";
    } else {
      await chamarApi(`/lancamentos/item/${props.lancamento?.id}`, { metodo: "PUT", corpo });
    }
    aviso.value = mensagem;
    if (criarNova && criando.value) {
      // Salvar e criar nova: fica na tela, com o formulário em branco.
      form.value = formVazio();
      window.scrollTo({ top: 0 });
      return;
    }
    await voltar();
  } catch (e) {
    if (e instanceof ErroApi && e.codigo === "DISCRIMINACAO_DIVERGENTE") {
      linhaComErro.value = (e.detalhes as { linhaProvavel?: number } | undefined)?.linhaProvavel ?? null;
    }
    erro.value =
      e instanceof ErroApi && e.codigo === "VALIDATION_ERROR" && Array.isArray(e.detalhes)
        ? (e.detalhes as Array<{ mensagem: string }>).map((d) => d.mensagem).join(" · ")
        : e instanceof Error
          ? e.message
          : "Não foi possível salvar.";
  } finally {
    salvando.value = false;
  }
}
</script>

<template>
  <div class="tela" :style="estilo">
    <header class="tela-topo">
      <button type="button" class="topo-voltar" aria-label="Voltar para a lista" @click="voltar"><ArrowLeft :size="20" /></button>
      <component :is="icone" class="icone-tela" aria-hidden="true" />
      <div>
        <h1>{{ criando ? "Nova" : "Editar" }} {{ info.singular }}</h1>
        <p>Lançamentos / {{ info.subtitulo }}{{ lancamento?.recorrenciaOrdem ? ` · ocorrência ${lancamento.recorrenciaOrdem} da série` : "" }}</p>
      </div>
    </header>

    <section class="tela-conteudo">
      <v-alert v-if="aviso && criando" type="success" variant="tonal" closable class="mb-3" @click:close="aviso = ''">{{ aviso }}</v-alert>
      <v-alert v-if="somenteLeitura" type="info" variant="tonal" class="mb-3">Lançamento pago: você não tem permissão para alterar.</v-alert>
      <v-alert v-if="erroCadastros" type="warning" variant="tonal" class="mb-3">{{ erroCadastros }}</v-alert>

      <form novalidate @submit.prevent="salvar(false)">
        <fieldset class="quadro" :disabled="somenteLeitura">
          <legend>Valor</legend>
          <div class="quadro-grade">
            <v-text-field
              v-model="form.valorOriginal"
              label="Valor (R$)"
              inputmode="decimal"
              placeholder="0,00"
              class="largo campo-valor"
              :error-messages="form.valorOriginal ? errosNumeros['valorOriginal'] : ''"
            />
            <div class="par">
              <v-select v-model="form.jurosTipo" :items="TIPOS" label="Juros" clearable />
              <v-text-field
                v-model="form.jurosValorInformado"
                :label="form.jurosTipo === 'percentual' ? 'Juros (%)' : 'Juros (R$)'"
                inputmode="decimal"
                placeholder="0,00"
                :disabled="!form.jurosTipo"
                :error-messages="errosNumeros['juros']"
              />
            </div>
            <v-text-field
              :model-value="formatarCentavos(previa.totalCentavos)"
              label="Valor Total"
              readonly
              :hint="previa.descontoCentavos ? `Já com o desconto geral de − ${formatarCentavos(previa.descontoCentavos)}` : 'Valor + juros'"
              persistent-hint
            />
          </div>
        </fieldset>

        <fieldset class="quadro" :disabled="somenteLeitura">
          <legend>Datas</legend>
          <div class="quadro-grade">
            <div class="data-hoje">
              <CampoData v-model="form.dataReferencia" rotulo="Data do lançamento" obrigatorio />
              <v-btn variant="tonal" color="primary" size="small" class="botao-hoje" @click="form.dataReferencia = hoje()">Hoje</v-btn>
            </div>
            <template v-if="!retirada">
              <CampoData v-model="form.dataDocumentoFiscal" rotulo="Data do documento fiscal" />
              <v-text-field v-model="form.numeroDocumentoFiscal" label="Nº do documento fiscal" placeholder="000000" />
            </template>
          </div>
        </fieldset>

        <fieldset class="quadro" :disabled="somenteLeitura">
          <legend>Classificação</legend>
          <div class="quadro-grade">
            <v-autocomplete v-if="retirada" v-model="form.grupoId" :items="grupos" label="Grupo" clearable />
            <v-autocomplete v-model="form.contaNome" :items="contas" label="Conta" clearable />
            <v-textarea v-model="form.observacao" label="Observação" placeholder="Ex.: Insumos — farinha e fermento" rows="2" auto-grow counter="500" class="largo" />
          </div>
        </fieldset>

        <fieldset v-if="!retirada" class="quadro" :disabled="somenteLeitura">
          <legend>Pagamento</legend>
          <div class="quadro-grade">
            <v-switch v-model="pago" :disabled="!pode('lancamentos_pagar')" color="primary" :label="pago ? 'Pagamento: Sim' : 'Pagamento: Não'" hide-details class="mb-3" />
            <CampoData v-model="form.dataPagamento" rotulo="Data do pagamento" :desabilitado="!pago || !pode('lancamentos_pagar')" />
            <CampoData v-model="form.dataVencimento" rotulo="Vencimento" obrigatorio />
          </div>
        </fieldset>

        <fieldset v-if="!retirada" class="quadro" :disabled="somenteLeitura">
          <legend>Discriminar itens</legend>
          <v-switch v-model="form.discriminar" color="primary" label="Discriminar itens" hide-details class="mb-2" />
          <template v-if="form.discriminar">
            <ItensDiscriminacao
              v-model="form.itens"
              :grupos="grupos"
              :totais-centavos="previa.totaisItens"
              :linha-com-erro="linhaComErro"
              :erros="errosNumeros"
            />
            <div class="par mt-4">
              <v-select v-model="form.descontoGeralTipo" :items="TIPOS" label="Vale presente / desconto" clearable />
              <v-text-field
                v-model="form.descontoGeralValor"
                label="Desconto geral (valor)"
                inputmode="decimal"
                :disabled="!form.descontoGeralTipo"
                :error-messages="errosNumeros['descontoGeral']"
              />
            </div>
          </template>
          <!-- Sempre montado: o leitor de tela anuncia quando o texto muda. -->
          <p class="aviso-soma" role="status">{{ avisoSoma }}</p>
        </fieldset>

        <fieldset v-if="criando && pode('lancamentos_recorrencia')" class="quadro">
          <legend>Recorrência</legend>
          <v-switch v-model="form.recorrente" color="primary" label="Repetir este lançamento" hide-details class="my-2" />
          <RecorrenciaCampos v-if="form.recorrente" v-model="form.recorrencia" />
        </fieldset>

        <p class="erro" role="alert">{{ erro }}</p>
      </form>
    </section>

    <footer class="tela-rodape">
      <img src="/marca/simbolo.png" alt="" width="32" height="29" />
      <div class="acoes">
        <v-btn variant="outlined" color="primary" @click="voltar">Cancelar</v-btn>
        <v-btn v-if="criando" variant="outlined" color="primary" :disabled="!podeSalvar" @click="salvar(true)">Salvar e criar nova</v-btn>
        <v-btn v-if="!somenteLeitura" color="primary" :loading="salvando" :disabled="!podeSalvar" @click="salvar(false)">Salvar</v-btn>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.topo-voltar {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.par { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 8px; }

.data-hoje { display: flex; align-items: flex-start; gap: 8px; }
.data-hoje > :first-child { flex: 1 1 auto; min-width: 0; }
.botao-hoje { margin-top: 10px; }

.campo-valor :deep(input) { font-size: 22px; font-weight: 600; text-align: right; }

.aviso-soma,
.erro {
  margin: 8px 0 0;
  color: rgb(var(--v-theme-error));
  font-size: 13px;
}

.aviso-soma:empty,
.erro:empty { margin: 0; }

@media (max-width: 600px) {
  .par { grid-template-columns: 96px minmax(0, 1fr); }
}
</style>
