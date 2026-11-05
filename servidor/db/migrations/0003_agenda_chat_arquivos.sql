CREATE TABLE "agenda_arquivos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"compromisso_id" text NOT NULL,
	"enviado_por" text NOT NULL,
	"papel" text NOT NULL,
	"nome" text NOT NULL,
	"tipo" text NOT NULL,
	"tamanho" integer NOT NULL,
	"sha256" text NOT NULL,
	"conteudo" "bytea" NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agenda_arquivos_papel_check" CHECK ("agenda_arquivos"."papel" in ('material', 'evidencia')),
	CONSTRAINT "agenda_arquivos_tamanho_check" CHECK ("agenda_arquivos"."tamanho" between 1 and 10485760 and octet_length("agenda_arquivos"."conteudo") = "agenda_arquivos"."tamanho"),
	CONSTRAINT "agenda_arquivos_nome_check" CHECK (char_length("agenda_arquivos"."nome") between 1 and 200)
);
--> statement-breakpoint
CREATE TABLE "agenda_chat_leituras" (
	"empresa_id" uuid NOT NULL,
	"compromisso_id" text NOT NULL,
	"usuario_id" text NOT NULL,
	"lido_ate" timestamp with time zone NOT NULL,
	CONSTRAINT "agenda_chat_leituras_empresa_id_compromisso_id_usuario_id_pk" PRIMARY KEY("empresa_id","compromisso_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE "agenda_mensagens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"compromisso_id" text NOT NULL,
	"autor_id" text NOT NULL,
	"texto" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agenda_mensagens_texto_check" CHECK (char_length("agenda_mensagens"."texto") between 1 and 2000)
);
--> statement-breakpoint
ALTER TABLE "agenda_arquivos" ADD CONSTRAINT "agenda_arquivos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_arquivos" ADD CONSTRAINT "agenda_arquivos_enviado_por_user_id_fk" FOREIGN KEY ("enviado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_chat_leituras" ADD CONSTRAINT "agenda_chat_leituras_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_chat_leituras" ADD CONSTRAINT "agenda_chat_leituras_usuario_id_user_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_mensagens" ADD CONSTRAINT "agenda_mensagens_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_mensagens" ADD CONSTRAINT "agenda_mensagens_autor_id_user_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agenda_arquivos_compromisso_idx" ON "agenda_arquivos" USING btree ("empresa_id","compromisso_id","criado_em");--> statement-breakpoint
CREATE INDEX "agenda_mensagens_compromisso_idx" ON "agenda_mensagens" USING btree ("empresa_id","compromisso_id","criado_em");