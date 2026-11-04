<script setup lang="ts">
import { Plug, TrendingUp } from "lucide-vue-next";

// Entradas: como no Sistema Pralis (R-062), venda não se lança à mão — chega pronta da integração
// do PDV. Enquanto nenhuma fonte de vendas estiver ligada (robô do CREARE ou a API em avaliação),
// esta tela só informa; não existe outro caminho para lançar venda.
useHead({ title: "Entradas · CICLUZ" });
const estilo = useEstiloOrigem("vendas");
</script>

<template>
  <div class="tela" :style="estilo">
    <header class="tela-topo">
      <TrendingUp class="icone-tela" aria-hidden="true" />
      <div>
        <h1>Entradas</h1>
        <p>Lançamentos / Vendas e faturamento</p>
      </div>
    </header>

    <section class="tela-conteudo">
      <div class="aviso-integracao">
        <Plug :size="32" aria-hidden="true" />
        <div>
          <h2>As vendas chegam pela integração do PDV</h2>
          <p class="texto-suave">
            Como no Sistema Pralis, venda não se lança à mão: ela vem pronta do caixa, com forma de pagamento e
            bandeira. Assim que a fonte de vendas for ligada (robô do CREARE ou a API em avaliação), as entradas do
            dia aparecem aqui.
          </p>
        </div>
      </div>
    </section>

    <footer class="tela-rodape">
      <img src="/marca/simbolo.png" alt="" width="32" height="29" />
    </footer>
  </div>
</template>

<style scoped>
.aviso-integracao {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  max-width: 640px;
  padding: 16px;
  border: 1px solid var(--borda);
  border-radius: 8px;
}

.aviso-integracao h2 {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
}

.aviso-integracao p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}
</style>
