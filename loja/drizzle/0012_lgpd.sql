CREATE TABLE "lgpd_exclusoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"celular_final" text NOT NULL,
	"pedidos" integer NOT NULL,
	"mensagens" integer NOT NULL,
	"arquivos" integer NOT NULL,
	"motivo" text NOT NULL,
	"autor" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "anonimizado_em" timestamp with time zone;