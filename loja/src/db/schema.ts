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
    /** Passa a true na primeira entrada de nota: a disponibilidade vem do estoque real. */
    controlaEstoque: boolean("controla_estoque").notNull().default(false),
    /** Código de barras do produto (EAN), quando houver. */
    ean: text("ean"),
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
    /** A pesagem/separação já deu baixa no estoque (evita baixa dupla; estorno no cancelamento). */
    baixaEstoque: boolean("baixa_estoque").notNull().default(false),
    totalFinalCentavos: integer("total_final_centavos"),
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

/* ======================= Estoque e entrada de notas (EST-001, REC-001) ======================= */

export const TIPOS_MOVIMENTO = ["ENTRADA_NOTA", "SAIDA_PEDIDO", "ESTORNO_PEDIDO", "AJUSTE_ENTRADA", "AJUSTE_SAIDA", "QUEBRA"] as const;
export type TipoMovimento = (typeof TIPOS_MOVIMENTO)[number];

/** Saldo atual por produto: projeção atualizada na mesma transação de cada movimentação. */
export const estoqueSaldos = pgTable("estoque_saldos", {
  produtoId: integer("produto_id").primaryKey().references(() => produtos.id),
  gramas: integer("gramas").notNull().default(0),
  pecas: integer("pecas").notNull().default(0),
  unidades: integer("unidades").notNull().default(0),
  valorCentavos: integer("valor_centavos").notNull().default(0),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const movimentacoes = pgTable(
  "estoque_movimentacoes",
  {
    id: serial("id").primaryKey(),
    produtoId: integer("produto_id").notNull().references(() => produtos.id),
    tipo: text("tipo").$type<TipoMovimento>().notNull(),
    /** Sinal: positivo entra, negativo sai. */
    gramas: integer("gramas").notNull().default(0),
    pecas: integer("pecas").notNull().default(0),
    unidades: integer("unidades").notNull().default(0),
    valorCentavos: integer("valor_centavos").notNull().default(0),
    origem: text("origem").notNull(), // NOTA, PEDIDO, AJUSTE
    origemId: integer("origem_id"),
    motivo: text("motivo").notNull().default(""),
    manual: boolean("manual").notNull().default(false),
    autor: text("autor").notNull(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("mov_produto_idx").on(t.produtoId, t.criadoEm)],
);

export const fornecedores = pgTable("fornecedores", {
  id: serial("id").primaryKey(),
  cnpj: text("cnpj").notNull().unique(),
  nome: text("nome").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const STATUS_NOTA = ["PENDENTE", "RECEBIDA", "RECEBIDA_DIVERGENCIA", "RECUSADA"] as const;
export type StatusNota = (typeof STATUS_NOTA)[number];

export const notasEntrada = pgTable("notas_entrada", {
  id: serial("id").primaryKey(),
  /** Chave de acesso (44 dígitos). Única: a mesma nota não entra duas vezes. Nula só em nota digitada sem chave. */
  chave: text("chave").unique(),
  numero: text("numero").notNull(),
  serie: text("serie").notNull().default(""),
  fornecedorId: integer("fornecedor_id").notNull().references(() => fornecedores.id),
  emissao: text("emissao").notNull(),
  valorTotalCentavos: integer("valor_total_centavos").notNull(),
  origem: text("origem").$type<"XML" | "MANUAL" | "SEFAZ" | "PDF">().notNull(),
  motivoManual: text("motivo_manual").notNull().default(""),
  status: text("status").$type<StatusNota>().notNull().default("PENDENTE"),
  /** XML original guardado sem alteração (REC-001-R3). */
  xml: text("xml"),
  criadoPor: text("criado_por").notNull(),
  confirmadoPor: text("confirmado_por"),
  confirmadoEm: timestamp("confirmado_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const DIVERGENCIAS = ["FALTA", "AVARIA", "SOBRA", "RECUSA"] as const;

export const notaItens = pgTable("nota_itens", {
  id: serial("id").primaryKey(),
  notaId: integer("nota_id").notNull().references(() => notasEntrada.id, { onDelete: "cascade" }),
  codigoFornecedor: text("codigo_fornecedor").notNull().default(""),
  descricao: text("descricao").notNull(),
  unidade: text("unidade").notNull().default(""),
  ean: text("ean").notNull().default(""),
  /** Quantidade da nota em milésimos (20 kg = 20000; 2 caixas = 2000). */
  quantidadeMil: integer("quantidade_mil").notNull(),
  valorTotalCentavos: integer("valor_total_centavos").notNull(),
  produtoId: integer("produto_id").references(() => produtos.id),
  /** Conferência: quantidade aceita em milésimos da mesma unidade da nota. */
  aceitoMil: integer("aceito_mil"),
  /** Confirmação: PECA → gramas aceitos e nº de peças; PACOTE → unidades. */
  gramas: integer("gramas"),
  pecas: integer("pecas"),
  unidades: integer("unidades"),
  divergencia: text("divergencia"),
  divergenciaNota: text("divergencia_nota").notNull().default(""),
});

/** Vínculo memorizado: item do fornecedor → produto (+ unidades por caixa), reaplicado nas próximas notas. */
export const vinculosFornecedor = pgTable(
  "vinculos_fornecedor",
  {
    id: serial("id").primaryKey(),
    fornecedorId: integer("fornecedor_id").notNull().references(() => fornecedores.id),
    codigoFornecedor: text("codigo_fornecedor").notNull(),
    produtoId: integer("produto_id").notNull().references(() => produtos.id),
    unidadesPorCaixa: integer("unidades_por_caixa"),
  },
  (t) => [uniqueIndex("vinculo_uq").on(t.fornecedorId, t.codigoFornecedor)],
);

/** Peso real de cada peça registrado na pesagem (PES-001). */
export const pedidoPesagens = pgTable("pedido_pesagens", {
  id: serial("id").primaryKey(),
  pedidoId: integer("pedido_id").notNull().references(() => pedidos.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => pedidoItens.id, { onDelete: "cascade" }),
  peca: integer("peca").notNull(),
  gramas: integer("gramas").notNull(),
  valorCentavos: integer("valor_centavos").notNull(),
  manual: boolean("manual").notNull().default(true),
  autor: text("autor").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});
