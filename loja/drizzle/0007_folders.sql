CREATE TABLE "folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"grupo" integer,
	"versao" integer DEFAULT 1 NOT NULL,
	"formato" text NOT NULL,
	"titulo" text NOT NULL,
	"destaque" integer DEFAULT 1 NOT NULL,
	"subtitulo" text NOT NULL,
	"secao" text NOT NULL,
	"frase" text NOT NULL,
	"validade_de" text,
	"validade_ate" text,
	"itens" jsonb NOT NULL,
	"criado_por" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
