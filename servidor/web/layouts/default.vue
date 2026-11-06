<script setup lang="ts">
import { LogOut, Moon, Settings, Sun, Users } from "lucide-vue-next";
import { useTheme } from "vuetify";
import { CORES } from "~/utils/cores";
import { MENU_LANCAMENTOS } from "~/utils/menu";
import { aplicarTema, CHAVE_TEMA } from "~/utils/tema";

// Menu lateral no padrão do menu inicial do site: marca, faixa colorida, seções, itens com círculo
// maciço na cor de origem (tom forte, para o branco passar no contraste), Luz/Sombra e o usuário
// fixo no rodapé.
const sessao = useSessao();
const route = useRoute();
const tema = useTheme();
const aberto = ref(true);
const escuro = computed(() => tema.global.current.value.dark);

const iniciais = computed(() =>
  (sessao.value?.nome ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("")
);

// Mesma chave do botão Luz/Sombra do site: trocar aqui troca lá também.
function alternarTema() {
  const nome = escuro.value ? "cicluzLuz" : "cicluzSombra";
  tema.global.name.value = nome;
  aplicarTema(nome);
  try {
    localStorage.setItem(CHAVE_TEMA, nome === "cicluzSombra" ? "sombra" : "luz");
  } catch {
    // Sem armazenamento: vale só nesta visita.
  }
}
</script>

<template>
  <a href="#conteudo" class="pular">Pular para o conteúdo</a>

  <v-navigation-drawer v-model="aberto" width="260" mobile-breakpoint="md" class="menu" aria-label="Menu principal">
    <div class="menu-marca">
      <img src="/marca/logo.png" alt="CICLUZ Gestão de Padaria" width="178" height="64" />
      <span class="menu-faixa" aria-hidden="true" />
    </div>

    <h2 id="secao-lancamentos" class="menu-secao">Lançamentos</h2>
    <ul class="menu-lista" aria-labelledby="secao-lancamentos">
      <li v-for="item in MENU_LANCAMENTOS" :key="item.rota">
        <NuxtLink
          :to="item.rota"
          class="menu-item"
          :class="{ ativo: route.path.startsWith(item.rota) }"
          :style="{ '--cor-item': CORES[item.origem].forte }"
          :aria-current="route.path.startsWith(item.rota) ? 'page' : undefined"
        >
          <span class="menu-icone" aria-hidden="true">$ {{ item.sinal }}</span>
          <span class="menu-texto">
            <strong>{{ item.titulo }}</strong>
            <small>{{ item.subtitulo }}</small>
          </span>
        </NuxtLink>
      </li>
    </ul>

    <h2 id="secao-outros" class="menu-secao">Outros</h2>
    <ul class="menu-lista" aria-labelledby="secao-outros">
      <li>
        <a href="/index.html" class="menu-item" :style="{ '--cor-item': CORES.formularios.forte }">
          <span class="menu-icone" aria-hidden="true"><Settings :size="18" /></span>
          <span class="menu-texto"><strong>Configuração</strong><small>Cadastros / Gerais</small></span>
        </a>
      </li>
      <li>
        <a href="/#acessos:usuarios" class="menu-item" :style="{ '--cor-item': CORES.formularios.forte }">
          <span class="menu-icone" aria-hidden="true"><Users :size="18" /></span>
          <span class="menu-texto"><strong>Usuários</strong><small>Senha e acessos</small></span>
        </a>
      </li>
    </ul>

    <template #append>
      <div class="menu-usuario">
        <span class="menu-avatar" aria-hidden="true">{{ iniciais }}</span>
        <span class="menu-nome">{{ sessao?.nome }}</span>
        <button
          type="button"
          class="menu-controle"
          :aria-label="escuro ? 'Ativar tema claro (Luz)' : 'Ativar tema escuro (Sombra)'"
          :title="escuro ? 'Luz' : 'Sombra'"
          @click="alternarTema"
        >
          <Sun v-if="escuro" :size="18" />
          <Moon v-else :size="18" />
        </button>
        <button type="button" class="menu-controle menu-sair" aria-label="Sair do sistema" title="Sair" @click="sairDoSistema">
          <LogOut :size="18" />
        </button>
      </div>
    </template>
  </v-navigation-drawer>

  <v-main>
    <div id="conteudo" class="area" tabindex="-1">
      <button type="button" class="menu-alternar" :aria-expanded="aberto" aria-label="Mostrar ou esconder o menu" @click="aberto = !aberto">
        <span aria-hidden="true">☰</span>
      </button>
      <slot />
    </div>
  </v-main>
</template>

<style scoped>
.pular {
  position: fixed;
  z-index: 3000;
  top: 8px;
  left: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  transform: translateY(-200%);
}

.pular:focus {
  transform: none;
}

.menu {
  border-right: 1px solid var(--borda) !important;
}

.menu-marca {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 24px 16px 12px;
}

.menu-marca img {
  width: 178px;
  height: auto;
}

.menu-faixa {
  width: 100%;
  height: 3px;
  background: var(--faixa);
}

.menu-secao {
  margin: 16px 18px 6px;
  color: var(--navigation-ink);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.menu-lista {
  margin: 0;
  padding: 0;
  list-style: none;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 2px 10px;
  padding: 8px 10px;
  border-radius: 10px;
  color: inherit;
  text-decoration: none;
  transition: background-color 0.15s var(--ease-saida);
}

/* Realce na cor do próprio item, mistura 12% no claro e 20% no escuro (regra de 03/11). */
.menu-item:hover,
.menu-item.ativo {
  background: color-mix(in srgb, var(--cor-item) 12%, transparent);
}

.v-theme--cicluzSombra .menu-item:hover,
.v-theme--cicluzSombra .menu-item.ativo {
  background: color-mix(in srgb, var(--cor-item) 20%, transparent);
}

.menu-item:focus-visible {
  outline: 2px solid rgb(var(--v-theme-on-surface));
  outline-offset: 2px;
}

.menu-icone {
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--cor-item);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.menu-texto {
  display: grid;
  min-width: 0;
  line-height: 1.25;
}

.menu-texto strong {
  font-size: 13px;
  font-weight: 600;
}

.menu-texto small {
  color: var(--texto-suave);
  font-size: 11px;
}

.menu-usuario {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: var(--rodape);
  padding: 8px 14px;
  border-top: 1px solid var(--borda);
}

.menu-avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--navigation-ink);
  color: rgb(var(--v-theme-surface));
  font-size: 11px;
  font-weight: 700;
}

.menu-nome {
  flex: 1;
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-controle {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  border: 1px solid var(--navigation-ink);
  border-radius: 50%;
  background: transparent;
  color: var(--navigation-ink);
  cursor: pointer;
}

.menu-sair:hover {
  border-color: rgb(var(--v-theme-error));
  color: rgb(var(--v-theme-error));
}

.area {
  display: flex;
  flex-direction: column;
  gap: var(--respiro);
  min-height: 100dvh;
  padding: var(--respiro);
  outline: none;
}

.menu-alternar {
  align-self: flex-start;
  width: 42px;
  height: 42px;
  border: 1px solid var(--borda);
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: inherit;
  cursor: pointer;
}
</style>
