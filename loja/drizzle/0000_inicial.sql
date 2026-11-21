CREATE TABLE "categorias" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"nome" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categorias_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "configuracoes" (
	"id" integer PRIMARY KEY NOT NULL,
	"dados" jsonb NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedido_eventos" (
	"id" serial PRIMARY KEY NOT NULL,
	"pedido_id" integer NOT NULL,
	"status" text NOT NULL,
	"nota" text DEFAULT '' NOT NULL,
	"autor" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedido_itens" (
	"id" serial PRIMARY KEY NOT NULL,
	"pedido_id" integer NOT NULL,
	"produto_id" integer NOT NULL,
	"nome" text NOT NULL,
	"tipo_venda" text NOT NULL,
	"preco_centavos" integer NOT NULL,
	"quantidade" integer NOT NULL,
	"peso_medio_gramas" integer,
	"valor_centavos" integer
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"status" text DEFAULT 'NOVO' NOT NULL,
	"modo" text NOT NULL,
	"cliente_nome" text NOT NULL,
	"cliente_celular" text NOT NULL,
	"cep" text,
	"endereco" text,
	"numero" text,
	"complemento" text,
	"bairro" text,
	"zona_id" integer,
	"frete_centavos" integer DEFAULT 0 NOT NULL,
	"subtotal_estimado_centavos" integer NOT NULL,
	"total_estimado_centavos" integer NOT NULL,
	"tem_item_pesado" boolean NOT NULL,
	"observacao" text DEFAULT '' NOT NULL,
	"consentimento_lgpd" boolean NOT NULL,
	"optin_whatsapp" boolean NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "produtos" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"nome" text NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"categoria_id" integer NOT NULL,
	"tipo_venda" text NOT NULL,
	"preco_centavos" integer NOT NULL,
	"peso_medio_gramas" integer,
	"peso_nominal" text,
	"foto_url" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"disponivel" boolean DEFAULT true NOT NULL,
	"quantidade_disponivel" integer,
	"destaque" boolean DEFAULT false NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zonas_entrega" (
	"id" serial PRIMARY KEY NOT NULL,
	"bairro" text NOT NULL,
	"taxa_centavos" integer NOT NULL,
	"prazo" text DEFAULT '' NOT NULL,
	"pedido_minimo_centavos" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pedido_eventos" ADD CONSTRAINT "pedido_eventos_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_zona_id_zonas_entrega_id_fk" FOREIGN KEY ("zona_id") REFERENCES "public"."zonas_entrega"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pedidos_codigo_uq" ON "pedidos" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX "pedidos_status_idx" ON "pedidos" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "produtos_slug_uq" ON "produtos" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "produtos_categoria_idx" ON "produtos" USING btree ("categoria_id");