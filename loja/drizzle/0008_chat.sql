CREATE TABLE "pedido_mensagens" (
	"id" serial PRIMARY KEY NOT NULL,
	"pedido_id" integer NOT NULL,
	"de" text NOT NULL,
	"autor" text,
	"texto" text NOT NULL,
	"lida_pela_loja" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pedido_mensagens" ADD CONSTRAINT "pedido_mensagens_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pedido_mensagens_pedido_idx" ON "pedido_mensagens" USING btree ("pedido_id");