CREATE TABLE "estoque_saldos" (
	"produto_id" integer PRIMARY KEY NOT NULL,
	"gramas" integer DEFAULT 0 NOT NULL,
	"pecas" integer DEFAULT 0 NOT NULL,
	"unidades" integer DEFAULT 0 NOT NULL,
	"valor_centavos" integer DEFAULT 0 NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fornecedores" (
	"id" serial PRIMARY KEY NOT NULL,
	"cnpj" text NOT NULL,
	"nome" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fornecedores_cnpj_unique" UNIQUE("cnpj")
);
--> statement-breakpoint
CREATE TABLE "estoque_movimentacoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"produto_id" integer NOT NULL,
	"tipo" text NOT NULL,
	"gramas" integer DEFAULT 0 NOT NULL,
	"pecas" integer DEFAULT 0 NOT NULL,
	"unidades" integer DEFAULT 0 NOT NULL,
	"valor_centavos" integer DEFAULT 0 NOT NULL,
	"origem" text NOT NULL,
	"origem_id" integer,
	"motivo" text DEFAULT '' NOT NULL,
	"manual" boolean DEFAULT false NOT NULL,
	"autor" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nota_itens" (
	"id" serial PRIMARY KEY NOT NULL,
	"nota_id" integer NOT NULL,
	"codigo_fornecedor" text DEFAULT '' NOT NULL,
	"descricao" text NOT NULL,
	"unidade" text DEFAULT '' NOT NULL,
	"ean" text DEFAULT '' NOT NULL,
	"quantidade_mil" integer NOT NULL,
	"valor_total_centavos" integer NOT NULL,
	"produto_id" integer,
	"aceito_mil" integer,
	"gramas" integer,
	"pecas" integer,
	"unidades" integer,
	"divergencia" text,
	"divergencia_nota" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notas_entrada" (
	"id" serial PRIMARY KEY NOT NULL,
	"chave" text,
	"numero" text NOT NULL,
	"serie" text DEFAULT '' NOT NULL,
	"fornecedor_id" integer NOT NULL,
	"emissao" text NOT NULL,
	"valor_total_centavos" integer NOT NULL,
	"origem" text NOT NULL,
	"motivo_manual" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'PENDENTE' NOT NULL,
	"xml" text,
	"criado_por" text NOT NULL,
	"confirmado_por" text,
	"confirmado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notas_entrada_chave_unique" UNIQUE("chave")
);
--> statement-breakpoint
CREATE TABLE "pedido_pesagens" (
	"id" serial PRIMARY KEY NOT NULL,
	"pedido_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"peca" integer NOT NULL,
	"gramas" integer NOT NULL,
	"valor_centavos" integer NOT NULL,
	"manual" boolean DEFAULT true NOT NULL,
	"autor" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vinculos_fornecedor" (
	"id" serial PRIMARY KEY NOT NULL,
	"fornecedor_id" integer NOT NULL,
	"codigo_fornecedor" text NOT NULL,
	"produto_id" integer NOT NULL,
	"unidades_por_caixa" integer
);
--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "baixa_estoque" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "total_final_centavos" integer;--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN "controla_estoque" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN "ean" text;--> statement-breakpoint
ALTER TABLE "estoque_saldos" ADD CONSTRAINT "estoque_saldos_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estoque_movimentacoes" ADD CONSTRAINT "estoque_movimentacoes_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nota_itens" ADD CONSTRAINT "nota_itens_nota_id_notas_entrada_id_fk" FOREIGN KEY ("nota_id") REFERENCES "public"."notas_entrada"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nota_itens" ADD CONSTRAINT "nota_itens_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas_entrada" ADD CONSTRAINT "notas_entrada_fornecedor_id_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_pesagens" ADD CONSTRAINT "pedido_pesagens_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_pesagens" ADD CONSTRAINT "pedido_pesagens_item_id_pedido_itens_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."pedido_itens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vinculos_fornecedor" ADD CONSTRAINT "vinculos_fornecedor_fornecedor_id_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vinculos_fornecedor" ADD CONSTRAINT "vinculos_fornecedor_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mov_produto_idx" ON "estoque_movimentacoes" USING btree ("produto_id","criado_em");--> statement-breakpoint
CREATE UNIQUE INDEX "vinculo_uq" ON "vinculos_fornecedor" USING btree ("fornecedor_id","codigo_fornecedor");