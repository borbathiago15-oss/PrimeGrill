import { boolean, doublePrecision, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import type { ConfigEntrega } from "@/modules/entrega/frete";

/** Tipo de venda (CAT-001). Hoje apenas peça inteira (R$/kg, pesada na saída) e pacote (preço fixo). */
export const TIPOS_VENDA = ["PECA", "PACOTE"] as const;
export type TipoVenda = (typeof TIPOS_VENDA)[number];

export const STATUS_PEDIDO = ["NOVO", "EM_SEPARACAO", "AGUARDANDO_CLIENTE", "CONFIRMADO", "CONCLUIDO", "CANCELADO"] as const;
export type StatusPedido = (typeof STATUS_PEDIDO)[number];

export const categorias = pgTable("categorias", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nome: text("nome").notNull(),
  ordem: integer("ordem").notNull().default(0),
});

export const produtos = pgTable(
  "produtos",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    nome: text("nome").notNull(),
    descricao: text("descricao").notNull().default(""),
    categoriaId: integer("categoria_id").notNull().references(() => categorias.id),
    tipoVenda: text("tipo_venda").$type<TipoVenda>().notNull(),
    /** PECA: centavos por kg. PACOTE: centavos por unidade (ADR-004). */
    precoCentavos: integer("preco_centavos").notNull(),
    /** Só PECA: peso médio da peça em gramas, usado apenas para o valor aproximado. */
    pesoMedioGramas: integer("peso_medio_gramas"),
    /** Só PACOTE: descrição do peso nominal, ex.: "600 g". Não entra em cálculo. */
    pesoNominal: text("peso_nominal"),
    fotoUrl: text("foto_url"),
    ativo: boolean("ativo").notNull().default(true),
    disponivel: boolean("disponivel").notNull().default(true),
    /** Quantidade disponível (peças ou pacotes). Nulo = não controlado no MVP. */
    quantidadeDisponivel: integer("quantidade_disponivel"),
    destaque: boolean("destaque").notNull().default(false),
    ordem: integer("ordem").notNull().default(0),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("produtos_slug_uq").on(t.slug), index("produtos_categoria_idx").on(t.categoriaId)],
);

export const zonasEntrega = pgTable("zonas_entrega", {
  id: serial("id").primaryKey(),
  bairro: text("bairro").notNull(),
  taxaCentavos: integer("taxa_centavos").notNull(),
  prazo: text("prazo").notNull().default(""),
  pedidoMinimoCentavos: integer("pedido_minimo_centavos").notNull().default(0),
  ativo: boolean("ativo").notNull().default(true),
});

/** Configurações da loja (linha única, id = 1). */
export const configuracoes = pgTable("configuracoes", {
  id: integer("id").primaryKey(),
  dados: jsonb("dados").$type<ConfigLoja>().notNull(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type HorarioDia = { dia: number; abre: string; fecha: string; fechado: boolean };
export type ConfigLoja = {
  horarios: HorarioDia[];
  pausada: boolean;
  mensagemPausa: string;
  whatsapp: string; // somente dígitos, com DDI: 5581998990694
  retiradaAtiva: boolean;
  enderecoRetirada: string;
  entrega: ConfigEntrega;
};

export const pedidos = pgTable(
  "pedidos",
  {
    id: serial("id").primaryKey(),
    codigo: text("codigo").notNull(),
    status: text("status").$type<StatusPedido>().notNull().default("NOVO"),
    modo: text("modo").$type<"ENTREGA" | "RETIRADA">().notNull(),
    clienteNome: text("cliente_nome").notNull(),
    clienteCelular: text("cliente_celular").notNull(),
    cep: text("cep"),
    endereco: text("endereco"),
    numero: text("numero"),
    complemento: text("complemento"),
    bairro: text("bairro"),
    zonaId: integer("zona_id").references(() => zonasEntrega.id),
    freteCentavos: integer("frete_centavos").notNull().default(0),
    /** Distância estimada da loja até o cliente (frete por km). */
    distanciaMetros: integer("distancia_metros"),
    /** CEP não localizado automaticamente: frete confirmado depois pelo WhatsApp (PG-P-001). */
    freteACombinar: boolean("frete_a_combinar").notNull().default(false),
    cidade: text("cidade"),
    subtotalEstimadoCentavos: integer("subtotal_estimado_centavos").notNull(),
    totalEstimadoCentavos: integer("total_estimado_centavos").notNull(),
    temItemPesado: boolean("tem_item_pesado").notNull(),
    observacao: text("observacao").notNull().default(""),
    consentimentoLgpd: boolean("consentimento_lgpd").notNull(),
    optinWhatsapp: boolean("optin_whatsapp").notNull(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("pedidos_codigo_uq").on(t.codigo), index("pedidos_status_idx").on(t.status)],
);

export const pedidoItens = pgTable("pedido_itens", {
  id: serial("id").primaryKey(),
  pedidoId: integer("pedido_id").notNull().references(() => pedidos.id, { onDelete: "cascade" }),
  produtoId: integer("produto_id").notNull().references(() => produtos.id),
  nome: text("nome").notNull(),
  tipoVenda: text("tipo_venda").$type<TipoVenda>().notNull(),
  precoCentavos: integer("preco_centavos").notNull(),
  quantidade: integer("quantidade").notNull(),
  pesoMedioGramas: integer("peso_medio_gramas"),
  /** Estimado (PECA) ou exato (PACOTE). Nulo quando a peça não tem peso médio cadastrado. */
  valorCentavos: integer("valor_centavos"),
});

export const pedidoEventos = pgTable("pedido_eventos", {
  id: serial("id").primaryKey(),
  pedidoId: integer("pedido_id").notNull().references(() => pedidos.id, { onDelete: "cascade" }),
  status: text("status").$type<StatusPedido>().notNull(),
  nota: text("nota").notNull().default(""),
  autor: text("autor").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Cache de localização por CEP (evita consultas repetidas aos serviços de mapa). */
export const geoCache = pgTable("geo_cache", {
  cep: text("cep").primaryKey(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  logradouro: text("logradouro").notNull().default(""),
  bairro: text("bairro").notNull().default(""),
  cidade: text("cidade").notNull().default(""),
  uf: text("uf").notNull().default(""),
  fonte: text("fonte").notNull().default(""),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});
