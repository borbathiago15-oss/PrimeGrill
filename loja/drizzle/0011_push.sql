CREATE TABLE "chaves_sistema" (
	"nome" text PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_inscricoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"publico" text NOT NULL,
	"pedido_id" integer,
	"usuario" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "push_inscricoes" ADD CONSTRAINT "push_inscricoes_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "push_endpoint_pedido_uq" ON "push_inscricoes" USING btree ("endpoint","publico","pedido_id");--> statement-breakpoint
CREATE INDEX "push_pedido_idx" ON "push_inscricoes" USING btree ("pedido_id");