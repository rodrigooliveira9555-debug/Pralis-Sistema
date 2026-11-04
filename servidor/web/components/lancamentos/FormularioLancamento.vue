<script setup lang="ts">
import { X } from "lucide-vue-next";
import type { CategoriaLancamento, LancamentoResposta } from "@cicluz/shared";
import { corpoParaApi, formDeLancamento, formVazio, usePreviaLancamento } from "~/composables/useFormularioLancamento";
import { CATEGORIAS, formatarCentavos } from "~/utils/formato";

const props = defineProps<{ categoria: CategoriaLancamento; lancamento: LancamentoResposta | null }>();
const aberto = defineModel<boolean>({ required: true });
const emit = defineEmits<{ salvo: [mensagem: string] }>();

const sessao = useSessao();
const administrador = computed(() => sessao.value?.papel === "administrador");
const categoria = computed(() => props.categoria);
const info = computed(() => CATEGORIAS[props.categoria]);
const { grupos, contas, erro: erroCadastros } = useCadastrosFinanceiros(categoria);

const form = ref(formVazio());
const previa = usePreviaLancamento(form, categoria);
const salvando = ref(false);
const erro = ref("");
const linhaComErro = ref<number | null>(null);
const pago = computed(() => Boolean(props.lancamento?.dataPagamento));
// Lançamento pago: só o administrador altera (permissão editar_pago no servidor).
const somenteLeitura = computed(() => pago.value && !administrador.value);

watch(aberto, (agora) => {
  if (!agora) return;
  form.value = props.lancamento ? formDeLancamento(props.lancamento) : formVazio();
  erro.value = "";
  linhaComErro.value = null;
});

const TIPOS = [
  { title: "R$", value: "valor" },
  { title: "%", value: "percentual" }
];

async function salvar() {
  salvando.value = true;
  erro.value = "";
  linhaComErro.value = null;
  try {
    const criando = !props.lancamento;
    const corpo = corpoParaApi(form.value, props.categoria, criando);
    if (criando) {
      const r = await chamarApi<{ serie?: number; serieLimitada?: boolean }>(`/lancamentos/${props.categoria}`, { metodo: "POST", corpo });
      emit(
        "salvo",
        r.serie
          ? `Série criada com ${r.serie} lançamentos${r.serieLimitada ? " (limitada a 12 meses)" : ""}.`
          : "Lançamento salvo."
      );
    } else {
      await chamarApi(`/lancamentos/item/${props.lancamento?.id}`, { metodo: "PUT", corpo });
      emit("salvo", "Lançamento atualizado.");
    }
    aberto.value = false;
  } catch (e) {
    if (e instanceof ErroApi && e.codigo === "DISCRIMINACAO_DIVERGENTE") {
      linhaComErro.value = (e.detalhes as { linhaProvavel?: number } | undefined)?.linhaProvavel ?? null;
    }
    if (e instanceof ErroApi && Array.isArray(e.detalhes) && e.codigo === "VALIDATION_ERROR") {
      erro.value = (e.detalhes as Array<{ caminho: string; mensagem: string }>).map((d) => d.mensagem).join(" · ");
    } else {
      erro.value = e instanceof Error ? e.message : "Não foi possível salvar.";
    }
  } finally {
    salvando.value = false;
  }
}
</script>

<template>
  <v-dialog v-model="aberto" max-width="860" scrollable :aria-label="`${lancamento ? 'Editar' : 'Novo'} lançamento de ${info.titulo}`">
    <v-card class="janela" :style="{ '--cor-origem': info.cor }">
      <header class="tela-topo janela-topo">
        <div class="janela-titulo">
          <h2>{{ lancamento ? "Editar lançamento" : "Novo lançamento" }}</h2>
          <p>{{ info.titulo }}{{ lancamento?.recorrenciaOrdem ? ` · ocorrência ${lancamento.recorrenciaOrdem} da série` : "" }}</p>
        </div>
        <button type="button" class="janela-fechar" aria-label="Fechar" @click="aberto = false"><X :size="20" /></button>
      </header>

      <v-card-text>
        <v-alert v-if="somenteLeitura" type="info" variant="tonal" class="mb-4">Lançamento pago: só o administrador altera.</v-alert>
        <v-alert v-if="erroCadastros" type="warning" variant="tonal" class="mb-4">{{ erroCadastros }}</v-alert>

        <fieldset :disabled="somenteLeitura" class="grade">
          <CampoData v-model="form.dataReferencia" rotulo="Data do lançamento" obrigatorio />
          <CampoData v-model="form.dataVencimento" rotulo="Vencimento" obrigatorio />
          <CampoData v-model="form.dataPagamento" rotulo="Pago em (vazio = não pago)" :desabilitado="!administrador" />
          <v-text-field v-model="form.valorOriginal" label="Valor (R$)" inputmode="decimal" placeholder="0,00" />
          <v-textarea v-model="form.observacao" label="Observação" rows="2" auto-grow counter="500" class="largo" />
          <v-autocomplete v-model="form.grupoId" :items="grupos" label="Grupo" clearable />
          <v-autocomplete v-model="form.contaNome" :items="contas" label="Conta" clearable />
          <div class="par">
            <v-select v-model="form.jurosTipo" :items="TIPOS" label="Juros" clearable />
            <v-text-field v-model="form.jurosValorInformado" label="Juros" inputmode="decimal" :disabled="!form.jurosTipo" />
          </div>
          <v-text-field v-model="form.numeroDocumentoFiscal" label="Nº do documento fiscal" />
          <CampoData v-model="form.dataDocumentoFiscal" rotulo="Data do documento fiscal" />
        </fieldset>

        <template v-if="categoria !== 'retiradas'">
          <v-switch v-model="form.discriminar" :disabled="somenteLeitura" color="primary" label="Discriminar itens" hide-details class="mb-2" />
          <template v-if="form.discriminar">
            <ItensDiscriminacao v-model="form.itens" :grupos="grupos" :totais-centavos="previa.totaisItens" :linha-com-erro="linhaComErro" />
            <div class="par mt-4">
              <v-select v-model="form.descontoGeralTipo" :items="TIPOS" label="Desconto geral" clearable />
              <v-text-field v-model="form.descontoGeralValor" label="Desconto geral" inputmode="decimal" :disabled="!form.descontoGeralTipo" />
            </div>
            <p v-if="form.itens.length && previa.diferencaItensCentavos !== 0" class="aviso-soma" role="status">
              A soma dos itens {{ previa.diferencaItensCentavos > 0 ? "excede" : "não alcança" }} o valor em
              {{ formatarCentavos(Math.abs(previa.diferencaItensCentavos)) }}. O salvar fica bloqueado até bater.
            </p>
          </template>
        </template>

        <template v-if="!lancamento && administrador">
          <v-switch v-model="form.recorrente" color="primary" label="Repetir este lançamento" hide-details class="my-2" />
          <RecorrenciaCampos v-if="form.recorrente" v-model="form.recorrencia" />
        </template>

        <dl class="resumo" aria-label="Resumo do valor">
          <div><dt>Juros</dt><dd>{{ formatarCentavos(previa.jurosCentavos) }}</dd></div>
          <div v-if="previa.descontoCentavos"><dt>Desconto</dt><dd>− {{ formatarCentavos(previa.descontoCentavos) }}</dd></div>
          <div class="resumo-total"><dt>Valor total</dt><dd>{{ formatarCentavos(previa.totalCentavos) }}</dd></div>
        </dl>
        <p v-if="erro" class="erro" role="alert">{{ erro }}</p>
      </v-card-text>

      <footer class="tela-rodape janela-rodape">
        <img src="/marca/simbolo.png" alt="" width="32" height="29" />
        <div class="acoes">
          <v-btn variant="outlined" color="primary" @click="aberto = false">Cancelar</v-btn>
          <v-btn v-if="!somenteLeitura" color="primary" :loading="salvando" @click="salvar">Salvar</v-btn>
        </div>
      </footer>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.janela { border-radius: var(--canto) !important; }
.janela-topo { border-radius: 0; }
.janela-titulo { flex: 1; }
.janela-titulo h2 { margin: 0; font-size: 16px; font-weight: 600; }
.janela-titulo p { margin: 0; font-size: 11px; }

.janela-fechar {
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

.janela-fechar:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

.grade {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
  margin: 0;
  padding: 0;
  border: 0;
}

.largo { grid-column: 1 / -1; }
.par { display: grid; grid-template-columns: 96px 1fr; gap: 8px; }

.aviso-soma,
.erro {
  margin: 8px 0 0;
  color: rgb(var(--v-theme-error));
  font-size: 13px;
}

.resumo {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px 24px;
  margin: 16px 0 0;
}

.resumo div { display: grid; text-align: right; }
.resumo dt { color: var(--texto-suave); font-size: 11px; }
.resumo dd { margin: 0; font-weight: 600; }
.resumo-total dd { font-size: 18px; }

.janela-rodape { position: static; border-radius: 0; border-top: 1px solid var(--borda); }
.acoes { display: flex; gap: 8px; min-width: 0; overflow-x: auto; }

@media (max-width: 600px) {
  .grade { grid-template-columns: minmax(0, 1fr); }
}
</style>
