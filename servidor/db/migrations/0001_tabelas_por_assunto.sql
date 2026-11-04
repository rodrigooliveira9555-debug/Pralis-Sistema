-- btree_gist: necessário para o EXCLUDE de vigências sobrepostas (igualdade de texto/uuid + intervalo).
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
CREATE TABLE "usuarios_auditoria" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"ator_id" text NOT NULL,
	"alvo_id" text NOT NULL,
	"acao" text NOT NULL,
	"detalhe" jsonb,
	"em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_auditoria_acao_check" CHECK ("usuarios_auditoria"."acao" in ('criou', 'alterou', 'definiu_senha'))
);
--> statement-breakpoint
CREATE TABLE "cargos" (
	"empresa_id" uuid NOT NULL,
	"chave" text NOT NULL,
	"origem" text NOT NULL,
	"ordem" integer NOT NULL,
	"nome" text NOT NULL,
	"nome_reduzido" text,
	"categoria" text,
	"cbo" text,
	"titulo" text,
	"valor_ficha" text,
	"ano" text,
	"sinonimos" text,
	"descricao" text,
	"icone" text,
	"modo_identidade" text,
	"sigla" text,
	"cor" text,
	CONSTRAINT "cargos_empresa_id_chave_pk" PRIMARY KEY("empresa_id","chave"),
	CONSTRAINT "cargos_origem_check" CHECK ("cargos"."origem" in ('referencia', 'local'))
);
--> statement-breakpoint
CREATE TABLE "contas" (
	"empresa_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"ordem" integer NOT NULL,
	"situacao" text NOT NULL,
	"documento" text,
	"icone" text NOT NULL,
	CONSTRAINT "contas_empresa_id_nome_pk" PRIMARY KEY("empresa_id","nome"),
	CONSTRAINT "contas_situacao_check" CHECK ("contas"."situacao" in ('ATIVA', 'INATIVA')),
	CONSTRAINT "contas_documento_check" CHECK ("contas"."documento" is null or "contas"."documento" in ('DOC/F', 'DOC/NF', 'DOC/F/NF'))
);
--> statement-breakpoint
CREATE TABLE "cores_personalizadas" (
	"empresa_id" uuid NOT NULL,
	"cor" text NOT NULL,
	"ordem" integer NOT NULL,
	CONSTRAINT "cores_personalizadas_empresa_id_cor_pk" PRIMARY KEY("empresa_id","cor"),
	CONSTRAINT "cores_personalizadas_formato_check" CHECK ("cores_personalizadas"."cor" ~ '^#[0-9a-f]{6}$')
);
--> statement-breakpoint
CREATE TABLE "icones_personalizados" (
	"empresa_id" uuid NOT NULL,
	"id" text NOT NULL,
	"rotulo" text,
	"desenho" text NOT NULL,
	"oculto" boolean NOT NULL,
	"excluido" boolean NOT NULL,
	CONSTRAINT "icones_personalizados_empresa_id_id_pk" PRIMARY KEY("empresa_id","id")
);
--> statement-breakpoint
CREATE TABLE "locais" (
	"empresa_id" uuid NOT NULL,
	"id" text NOT NULL,
	"pai_id" text,
	"nivel" integer NOT NULL,
	"ordem" integer NOT NULL,
	"nome" text NOT NULL,
	"icone" text,
	"modo_identidade" text,
	"sigla" text,
	"cor" text,
	CONSTRAINT "locais_empresa_id_id_pk" PRIMARY KEY("empresa_id","id"),
	CONSTRAINT "locais_nivel_check" CHECK ("locais"."nivel" between 1 and 4),
	CONSTRAINT "locais_raiz_check" CHECK (("locais"."nivel" = 1) = ("locais"."pai_id" is null))
);
--> statement-breakpoint
CREATE TABLE "locais_transferencias" (
	"empresa_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"nivel" integer,
	"data" timestamp with time zone,
	"origem_id" text NOT NULL,
	"origem_nome" text NOT NULL,
	"destino_id" text,
	"destino_nome" text,
	"copia_origem" jsonb,
	CONSTRAINT "locais_transferencias_empresa_id_ordem_pk" PRIMARY KEY("empresa_id","ordem")
);
--> statement-breakpoint
CREATE TABLE "organograma_posicoes" (
	"empresa_id" uuid NOT NULL,
	"id" text NOT NULL,
	"pai_id" text,
	"ordem" integer NOT NULL,
	"cargo_chave" text,
	"cargo_nome" text NOT NULL,
	"cbo" text,
	"quantidade" integer NOT NULL,
	"rotulo" text,
	CONSTRAINT "organograma_posicoes_empresa_id_id_pk" PRIMARY KEY("empresa_id","id"),
	CONSTRAINT "organograma_quantidade_check" CHECK ("organograma_posicoes"."quantidade" >= 1)
);
--> statement-breakpoint
CREATE TABLE "organograma_versoes" (
	"empresa_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"data" timestamp with time zone,
	"posicoes" jsonb NOT NULL,
	CONSTRAINT "organograma_versoes_empresa_id_ordem_pk" PRIMARY KEY("empresa_id","ordem")
);
--> statement-breakpoint
CREATE TABLE "perfis_areas" (
	"empresa_id" uuid NOT NULL,
	"id" text NOT NULL,
	"nome" text NOT NULL,
	"ordem" integer NOT NULL,
	CONSTRAINT "perfis_areas_empresa_id_id_pk" PRIMARY KEY("empresa_id","id")
);
--> statement-breakpoint
CREATE TABLE "perfis_cargos" (
	"empresa_id" uuid NOT NULL,
	"id" text NOT NULL,
	"area_id" text NOT NULL,
	"area_nome" text,
	"origem_cargo" text,
	"cargo_nome" text NOT NULL,
	"cbo" text,
	"missao" text,
	"autonomia" text,
	"ordem" integer NOT NULL,
	CONSTRAINT "perfis_cargos_empresa_id_id_pk" PRIMARY KEY("empresa_id","id")
);
--> statement-breakpoint
CREATE TABLE "perfis_cargos_requisitos" (
	"empresa_id" uuid NOT NULL,
	"perfil_cargo_id" text NOT NULL,
	"requisito_id" text NOT NULL,
	CONSTRAINT "perfis_cargos_requisitos_empresa_id_perfil_cargo_id_requisito_id_pk" PRIMARY KEY("empresa_id","perfil_cargo_id","requisito_id")
);
--> statement-breakpoint
CREATE TABLE "perfis_requisitos" (
	"empresa_id" uuid NOT NULL,
	"id" text NOT NULL,
	"area_id" text NOT NULL,
	"grupo" text NOT NULL,
	"texto" text NOT NULL,
	"ordem" integer NOT NULL,
	CONSTRAINT "perfis_requisitos_empresa_id_id_pk" PRIMARY KEY("empresa_id","id"),
	CONSTRAINT "perfis_requisitos_grupo_check" CHECK ("perfis_requisitos"."grupo" in ('education', 'experience', 'certificates', 'technical', 'behavior', 'individual', 'group', 'collective'))
);
--> statement-breakpoint
CREATE TABLE "salarios_valores" (
	"empresa_id" uuid NOT NULL,
	"vigencia_ordem" integer NOT NULL,
	"posicao" integer NOT NULL,
	"cargo_chave" text NOT NULL,
	"cargo_nome" text NOT NULL,
	"valor_reais" numeric(14, 4) NOT NULL,
	CONSTRAINT "salarios_valores_empresa_id_vigencia_ordem_posicao_pk" PRIMARY KEY("empresa_id","vigencia_ordem","posicao"),
	CONSTRAINT "salarios_valores_positivo_check" CHECK ("salarios_valores"."valor_reais" > 0)
);
--> statement-breakpoint
CREATE TABLE "salarios_vigencias" (
	"empresa_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"inicio" date NOT NULL,
	"observacao" text,
	CONSTRAINT "salarios_vigencias_empresa_id_ordem_pk" PRIMARY KEY("empresa_id","ordem")
);
--> statement-breakpoint
CREATE TABLE "fin_bandeiras" (
	"empresa_id" uuid NOT NULL,
	"item_id" text NOT NULL,
	"nome" text NOT NULL,
	"ativo" boolean NOT NULL,
	"ordem" integer NOT NULL,
	"icone" text NOT NULL,
	"modo_identidade" text,
	"sigla" text,
	"cor" text,
	"documento" text,
	"tipo_venda_id" text,
	CONSTRAINT "fin_bandeiras_empresa_id_item_id_pk" PRIMARY KEY("empresa_id","item_id"),
	CONSTRAINT "fin_bandeiras_modo_check" CHECK ("fin_bandeiras"."modo_identidade" is null or "fin_bandeiras"."modo_identidade" in ('icon', 'text')),
	CONSTRAINT "fin_bandeiras_cor_check" CHECK ("fin_bandeiras"."cor" is null or "fin_bandeiras"."cor" ~* '^#[0-9a-f]{6}$'),
	CONSTRAINT "fin_bandeiras_documento_check" CHECK ("fin_bandeiras"."documento" is null or "fin_bandeiras"."documento" in ('DOC/F', 'DOC/NF', 'DOC/F/NF'))
);
--> statement-breakpoint
CREATE TABLE "fin_grupos" (
	"empresa_id" uuid NOT NULL,
	"colecao" text NOT NULL,
	"item_id" text NOT NULL,
	"pai_id" text,
	"nome" text NOT NULL,
	"ativo" boolean NOT NULL,
	"ordem" integer NOT NULL,
	"icone" text NOT NULL,
	"modo_identidade" text,
	"sigla" text,
	"cor" text,
	"documento" text,
	"finalidade" text,
	"lancamento_direto" boolean DEFAULT false NOT NULL,
	CONSTRAINT "fin_grupos_empresa_id_colecao_item_id_pk" PRIMARY KEY("empresa_id","colecao","item_id"),
	CONSTRAINT "fin_grupos_colecao_check" CHECK ("fin_grupos"."colecao" in ('mercadorias', 'despesas', 'vendas', 'retiradas')),
	CONSTRAINT "fin_grupos_finalidade_check" CHECK ("fin_grupos"."finalidade" is null or ("fin_grupos"."colecao" = 'mercadorias' and "fin_grupos"."finalidade" in ('VENDA', 'TRANSFORMAÇÃO'))),
	CONSTRAINT "fin_grupos_lancamento_direto_check" CHECK (not "fin_grupos"."lancamento_direto" or "fin_grupos"."colecao" = 'despesas'),
	CONSTRAINT "fin_grupos_modo_check" CHECK ("fin_grupos"."modo_identidade" is null or "fin_grupos"."modo_identidade" in ('icon', 'text')),
	CONSTRAINT "fin_grupos_cor_check" CHECK ("fin_grupos"."cor" is null or "fin_grupos"."cor" ~* '^#[0-9a-f]{6}$'),
	CONSTRAINT "fin_grupos_documento_check" CHECK ("fin_grupos"."documento" is null or "fin_grupos"."documento" in ('DOC/F', 'DOC/NF', 'DOC/F/NF'))
);
--> statement-breakpoint
CREATE TABLE "fin_operadoras" (
	"empresa_id" uuid NOT NULL,
	"item_id" text NOT NULL,
	"nome" text NOT NULL,
	"ativo" boolean NOT NULL,
	"ordem" integer NOT NULL,
	"icone" text NOT NULL,
	"modo_identidade" text,
	"sigla" text,
	"cor" text,
	"documento" text,
	"custos_fixos" text,
	CONSTRAINT "fin_operadoras_empresa_id_item_id_pk" PRIMARY KEY("empresa_id","item_id"),
	CONSTRAINT "fin_operadoras_modo_check" CHECK ("fin_operadoras"."modo_identidade" is null or "fin_operadoras"."modo_identidade" in ('icon', 'text')),
	CONSTRAINT "fin_operadoras_cor_check" CHECK ("fin_operadoras"."cor" is null or "fin_operadoras"."cor" ~* '^#[0-9a-f]{6}$'),
	CONSTRAINT "fin_operadoras_documento_check" CHECK ("fin_operadoras"."documento" is null or "fin_operadoras"."documento" in ('DOC/F', 'DOC/NF', 'DOC/F/NF'))
);
--> statement-breakpoint
CREATE TABLE "fin_taxas" (
	"empresa_id" uuid NOT NULL,
	"operadora_id" text NOT NULL,
	"bandeira_id" text NOT NULL,
	"ordem" integer NOT NULL,
	"inicio" date NOT NULL,
	"fim" date,
	"modalidade" text NOT NULL,
	"parcela_de" integer,
	"parcela_ate" integer,
	"mdr_percentual" numeric(7, 4),
	"tarifa_reais" numeric(12, 4),
	"antecipacao_modo" text,
	"antecipacao_percentual" numeric(7, 4),
	"antecipacao_periodo" text,
	"prazo_dias" integer,
	"tipo_dia" text,
	"observacoes" text,
	"despesa_id" text NOT NULL,
	"conta_nome" text,
	CONSTRAINT "fin_taxas_empresa_id_operadora_id_bandeira_id_ordem_pk" PRIMARY KEY("empresa_id","operadora_id","bandeira_id","ordem"),
	CONSTRAINT "fin_taxas_vigencia_check" CHECK ("fin_taxas"."fim" is null or "fin_taxas"."fim" >= "fin_taxas"."inicio"),
	CONSTRAINT "fin_taxas_parcelas_check" CHECK (("fin_taxas"."parcela_de" is null and "fin_taxas"."parcela_ate" is null) or ("fin_taxas"."parcela_de" >= 1 and "fin_taxas"."parcela_ate" >= "fin_taxas"."parcela_de")),
	CONSTRAINT "fin_taxas_mdr_check" CHECK ("fin_taxas"."mdr_percentual" is null or "fin_taxas"."mdr_percentual" between 0 and 100),
	CONSTRAINT "fin_taxas_antecipacao_check" CHECK ("fin_taxas"."antecipacao_percentual" is null or "fin_taxas"."antecipacao_percentual" between 0 and 100),
	CONSTRAINT "fin_taxas_tarifa_check" CHECK ("fin_taxas"."tarifa_reais" is null or "fin_taxas"."tarifa_reais" >= 0),
	CONSTRAINT "fin_taxas_prazo_check" CHECK ("fin_taxas"."prazo_dias" is null or "fin_taxas"."prazo_dias" >= 0)
);
--> statement-breakpoint
CREATE TABLE "fin_tipos_venda" (
	"empresa_id" uuid NOT NULL,
	"item_id" text NOT NULL,
	"nome" text NOT NULL,
	"ativo" boolean NOT NULL,
	"ordem" integer NOT NULL,
	"icone" text NOT NULL,
	"modo_identidade" text,
	"sigla" text,
	"cor" text,
	"documento" text,
	CONSTRAINT "fin_tipos_venda_empresa_id_item_id_pk" PRIMARY KEY("empresa_id","item_id"),
	CONSTRAINT "fin_tipos_venda_modo_check" CHECK ("fin_tipos_venda"."modo_identidade" is null or "fin_tipos_venda"."modo_identidade" in ('icon', 'text')),
	CONSTRAINT "fin_tipos_venda_cor_check" CHECK ("fin_tipos_venda"."cor" is null or "fin_tipos_venda"."cor" ~* '^#[0-9a-f]{6}$'),
	CONSTRAINT "fin_tipos_venda_documento_check" CHECK ("fin_tipos_venda"."documento" is null or "fin_tipos_venda"."documento" in ('DOC/F', 'DOC/NF', 'DOC/F/NF'))
);
--> statement-breakpoint
CREATE TABLE "fin_transferencias" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"colecao" text NOT NULL,
	"pai_id" text,
	"data" timestamp with time zone,
	"origem_id" text NOT NULL,
	"origem_nome" text NOT NULL,
	"destino_id" text,
	"destino_nome" text,
	"copia_origem" jsonb
);
--> statement-breakpoint
CREATE TABLE "projecoes" (
	"empresa_id" uuid NOT NULL,
	"assunto" text NOT NULL,
	"situacao" text NOT NULL,
	"versoes" jsonb NOT NULL,
	"versao_regra" integer NOT NULL,
	"mensagem" text,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projecoes_empresa_id_assunto_pk" PRIMARY KEY("empresa_id","assunto"),
	CONSTRAINT "projecoes_situacao_check" CHECK ("projecoes"."situacao" in ('ok', 'falha'))
);
--> statement-breakpoint
ALTER TABLE "usuarios_auditoria" ADD CONSTRAINT "usuarios_auditoria_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_auditoria" ADD CONSTRAINT "usuarios_auditoria_ator_id_user_id_fk" FOREIGN KEY ("ator_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_auditoria" ADD CONSTRAINT "usuarios_auditoria_alvo_id_user_id_fk" FOREIGN KEY ("alvo_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cargos" ADD CONSTRAINT "cargos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contas" ADD CONSTRAINT "contas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cores_personalizadas" ADD CONSTRAINT "cores_personalizadas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "icones_personalizados" ADD CONSTRAINT "icones_personalizados_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locais" ADD CONSTRAINT "locais_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locais" ADD CONSTRAINT "locais_pai_fk" FOREIGN KEY ("empresa_id","pai_id") REFERENCES "public"."locais"("empresa_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locais_transferencias" ADD CONSTRAINT "locais_transferencias_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organograma_posicoes" ADD CONSTRAINT "organograma_posicoes_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organograma_posicoes" ADD CONSTRAINT "organograma_pai_fk" FOREIGN KEY ("empresa_id","pai_id") REFERENCES "public"."organograma_posicoes"("empresa_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organograma_versoes" ADD CONSTRAINT "organograma_versoes_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfis_areas" ADD CONSTRAINT "perfis_areas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfis_cargos" ADD CONSTRAINT "perfis_cargos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfis_cargos_requisitos" ADD CONSTRAINT "perfis_cargos_requisitos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfis_cargos_requisitos" ADD CONSTRAINT "perfis_cargos_requisitos_cargo_fk" FOREIGN KEY ("empresa_id","perfil_cargo_id") REFERENCES "public"."perfis_cargos"("empresa_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfis_cargos_requisitos" ADD CONSTRAINT "perfis_cargos_requisitos_requisito_fk" FOREIGN KEY ("empresa_id","requisito_id") REFERENCES "public"."perfis_requisitos"("empresa_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfis_requisitos" ADD CONSTRAINT "perfis_requisitos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salarios_valores" ADD CONSTRAINT "salarios_valores_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salarios_valores" ADD CONSTRAINT "salarios_valores_vigencia_fk" FOREIGN KEY ("empresa_id","vigencia_ordem") REFERENCES "public"."salarios_vigencias"("empresa_id","ordem") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salarios_vigencias" ADD CONSTRAINT "salarios_vigencias_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_bandeiras" ADD CONSTRAINT "fin_bandeiras_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_bandeiras" ADD CONSTRAINT "fin_bandeiras_tipo_venda_fk" FOREIGN KEY ("empresa_id","tipo_venda_id") REFERENCES "public"."fin_tipos_venda"("empresa_id","item_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_grupos" ADD CONSTRAINT "fin_grupos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_grupos" ADD CONSTRAINT "fin_grupos_pai_fk" FOREIGN KEY ("empresa_id","colecao","pai_id") REFERENCES "public"."fin_grupos"("empresa_id","colecao","item_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_operadoras" ADD CONSTRAINT "fin_operadoras_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_taxas" ADD CONSTRAINT "fin_taxas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_taxas" ADD CONSTRAINT "fin_taxas_operadora_fk" FOREIGN KEY ("empresa_id","operadora_id") REFERENCES "public"."fin_operadoras"("empresa_id","item_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_taxas" ADD CONSTRAINT "fin_taxas_bandeira_fk" FOREIGN KEY ("empresa_id","bandeira_id") REFERENCES "public"."fin_bandeiras"("empresa_id","item_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_tipos_venda" ADD CONSTRAINT "fin_tipos_venda_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_transferencias" ADD CONSTRAINT "fin_transferencias_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projecoes" ADD CONSTRAINT "projecoes_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usuarios_auditoria_empresa_idx" ON "usuarios_auditoria" USING btree ("empresa_id","em");--> statement-breakpoint
CREATE UNIQUE INDEX "contas_nome_sem_caixa_idx" ON "contas" USING btree ("empresa_id",lower("nome"));--> statement-breakpoint
-- Regra da tela (groups.js, readOperatorFees): na mesma operadora, bandeira e modalidade, faixas de
-- parcelas (vazio = 1) e vigências (fim vazio = sem fim) não podem se cruzar.
ALTER TABLE "fin_taxas" ADD CONSTRAINT "fin_taxas_sem_sobreposicao" EXCLUDE USING gist (
	"empresa_id" WITH =,
	"operadora_id" WITH =,
	"bandeira_id" WITH =,
	"modalidade" WITH =,
	int4range(coalesce("parcela_de", 1), coalesce("parcela_ate", 1), '[]') WITH &&,
	daterange("inicio", coalesce("fim", '9999-12-31'::date), '[]') WITH &&
);
