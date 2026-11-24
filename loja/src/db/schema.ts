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
  pagamento?: ConfigPagamento;
  /** Contatos impressos no folder e no rodapé da loja. */
  whatsapp2?: string;
  instagram?: string;
  /** Identificação da empresa e do encarregado (LGPD), mostrada na política de privacidade. */
  privacidade?: ConfigPrivacidade;
};

export type ConfigPrivacidade = { razaoSocial: string; cnpj: string; encarregado: string; email: string };

export type ConfigPagamento = {
  pixChave: string;
  pixNome: string;
  pixCidade: string;
  aceitaPix: boolean;
  aceitaCartaoLink: boolean;
  aceitaNaEntrega: boolean;
};

export const FORMAS_PAGAMENTO = ["PIX", "CARTAO_LINK", "NA_ENTREGA"] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];
export type PagamentoStatus = "PENDENTE" | "INFORMADO" | "PAGO";

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
    /** Forma escolhida pelo cliente no link do pedido (ou pelo atendente, PG-P-001). */
    formaPagamento: text("forma_pagamento").$type<FormaPagamento>(),
    /** PENDENTE → INFORMADO (cliente diz que pagou) → PAGO (loja conferiu). */
    pagamentoStatus: text("pagamento_status").$type<PagamentoStatus>().notNull().default("PENDENTE"),
    linkCartao: text("link_cartao"),
    /** Pix gerado na maquininha/banco com o valor exato (copia e cola colado pelo atendente). */
    pixCodigo: text("pix_codigo"),
    /** Foto do QR Code do Pix da maquininha, quando não há o copia e cola. */
    pixQrUrl: text("pix_qr_url"),
    /** De onde veio: loja online, ou lançado no painel a partir do WhatsApp/balcão. */
    origem: text("origem").$type<"LOJA_ONLINE" | "WHATSAPP" | "BALCAO">().notNull().default("LOJA_ONLINE"),
    /** O que o cliente mudou depois de ver o valor final (a loja revisa e reenvia). */
    alteracaoCliente: text("alteracao_cliente"),
    pagoEm: timestamp("pago_em", { withTimezone: true }),
    cidade: text("cidade"),
    subtotalEstimadoCentavos: integer("subtotal_estimado_centavos").notNull(),
    totalEstimadoCentavos: integer("total_estimado_centavos").notNull(),
    temItemPesado: boolean("tem_item_pesado").notNull(),
    observacao: text("observacao").notNull().default(""),
    /** Motivo informado pela loja ao recusar/cancelar (aparece para o cliente no link do pedido). */
    motivoCancelamento: text("motivo_cancelamento"),
    /** Idioma do cliente (pt, en, es): avisos e mensagens prontas saem nesse idioma. */
    idioma: text("idioma").notNull().default("pt"),
    /** LGPD: dados pessoais apagados a pedido do titular; valores e itens ficam para a contabilidade. */
    anonimizadoEm: timestamp("anonimizado_em", { withTimezone: true }),
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
  /** Quantas peças/unidades deste item já foram separadas e baixadas do estoque (itens acrescentados depois ficam pendentes). */
  separados: integer("separados").notNull().default(0),
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

/* ---------------- Usuários do painel ---------------- */
export const PAPEIS = ["DONO", "GERENTE", "ATENDENTE"] as const;
export type Papel = (typeof PAPEIS)[number];

export const usuarios = pgTable(
  "usuarios",
  {
    id: serial("id").primaryKey(),
    nome: text("nome").notNull(),
    /** Sempre em minúsculas. */
    email: text("email").notNull(),
    /** bcrypt; a senha em si nunca é guardada. */
    senhaHash: text("senha_hash").notNull(),
    papel: text("papel").$type<Papel>().notNull(),
    ativo: boolean("ativo").notNull().default(true),
    /** Senha provisória definida pelo dono: obriga a criar a própria no primeiro acesso. */
    deveTrocarSenha: boolean("deve_trocar_senha").notNull().default(true),
    /** Sobe a cada troca de senha/papel/desativação: derruba sessões antigas. */
    sessaoVersao: integer("sessao_versao").notNull().default(1),
    ultimoAcesso: timestamp("ultimo_acesso", { withTimezone: true }),
    criadoPor: text("criado_por").notNull(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("usuarios_email_uq").on(t.email)],
);

/* ---------------- Studio: folder automático (STU-002) ---------------- */
export type FormatoFolder = "ENCARTE" | "FEED" | "STORY";
/** Foto do produto no momento da geração: se preço/estoque/foto mudar, o folder fica Desatualizado (STU-002-R2). */
export type ItemFolder = { id: number; nome: string; tipoVenda: "PECA" | "PACOTE"; precoCentavos: number; fotoUrl: string; pesoNominal: string | null };

export const folders = pgTable("folders", {
  id: serial("id").primaryKey(),
  /** Versões do mesmo folder compartilham o grupo (STU-002-R3). */
  grupo: integer("grupo"),
  versao: integer("versao").notNull().default(1),
  formato: text("formato").$type<FormatoFolder>().notNull(),
  /** Título em 3 palavras; a palavra de índice `destaque` sai em dourado. */
  titulo: text("titulo").notNull(),
  destaque: integer("destaque").notNull().default(1),
  subtitulo: text("subtitulo").notNull(),
  secao: text("secao").notNull(),
  frase: text("frase").notNull(),
  validadeDe: text("validade_de"),
  validadeAte: text("validade_ate"),
  itens: jsonb("itens").$type<ItemFolder[]>().notNull(),
  criadoPor: text("criado_por").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------- Chat do pedido ---------------- */
export const pedidoMensagens = pgTable(
  "pedido_mensagens",
  {
    id: serial("id").primaryKey(),
    pedidoId: integer("pedido_id").notNull().references(() => pedidos.id, { onDelete: "cascade" }),
    de: text("de").$type<"CLIENTE" | "LOJA">().notNull(),
    /** Para mensagens da loja: e-mail de quem respondeu (auditoria). */
    autor: text("autor"),
    texto: text("texto").notNull(),
    /** Anexo opcional: foto ou PDF (ex.: folder, foto do corte, comprovante). */
    anexoUrl: text("anexo_url"),
    anexoTipo: text("anexo_tipo").$type<"imagem" | "pdf">(),
    anexoNome: text("anexo_nome"),
    lidaPelaLoja: boolean("lida_pela_loja").notNull().default(false),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pedido_mensagens_pedido_idx").on(t.pedidoId)],
);

/* ---------------- Notificações no celular (Web Push) ---------------- */
export const pushInscricoes = pgTable(
  "push_inscricoes",
  {
    id: serial("id").primaryKey(),
    /** Endereço do serviço de push do navegador (único por aparelho/navegador). */
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    /** CLIENTE: avisos de um pedido. LOJA: avisos para a equipe (novo pedido, mensagem, pagamento). */
    publico: text("publico").$type<"CLIENTE" | "LOJA">().notNull(),
    pedidoId: integer("pedido_id").references(() => pedidos.id, { onDelete: "cascade" }),
    usuario: text("usuario"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("push_endpoint_pedido_uq").on(t.endpoint, t.publico, t.pedidoId), index("push_pedido_idx").on(t.pedidoId)],
);

/** Chaves geradas pelo próprio sistema (ex.: par VAPID do push), quando não vierem das variáveis de ambiente. */
export const chavesSistema = pgTable("chaves_sistema", {
  nome: text("nome").primaryKey(),
  valor: text("valor").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------- LGPD: registro das exclusões feitas a pedido do titular ---------------- */
export const lgpdExclusoes = pgTable("lgpd_exclusoes", {
  id: serial("id").primaryKey(),
  /** Só os 4 últimos dígitos: prova que o pedido foi atendido sem guardar o dado apagado. */
  celularFinal: text("celular_final").notNull(),
  pedidos: integer("pedidos").notNull(),
  mensagens: integer("mensagens").notNull(),
  arquivos: integer("arquivos").notNull(),
  motivo: text("motivo").notNull(),
  autor: text("autor").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------- Promoções: cadastro de quem aceitou receber (consentimento LGPD) ---------------- */
export const inscritosPromocoes = pgTable(
  "inscritos_promocoes",
  {
    id: serial("id").primaryKey(),
    /** Só dígitos, com DDD (ex.: 81999990000). */
    celular: text("celular").notNull(),
    nome: text("nome").notNull(),
    /** Onde aceitou: no pedido (checkout), no cadastro do site ou informado pelo atendente. */
    origem: text("origem").$type<"CHECKOUT" | "SITE" | "PAINEL">().notNull(),
    aceitouEm: timestamp("aceitou_em", { withTimezone: true }).notNull().defaultNow(),
    /** Quem registrou quando o aceite veio pelo balcão/WhatsApp. */
    registradoPor: text("registrado_por"),
    /** Descadastro: a pessoa pediu para não receber mais. */
    revogadoEm: timestamp("revogado_em", { withTimezone: true }),
    /** Chave do link "não quero mais receber" (aleatória, sem dado pessoal). */
    token: text("token").notNull(),
  },
  (t) => [uniqueIndex("inscritos_celular_uq").on(t.celular), uniqueIndex("inscritos_token_uq").on(t.token)],
);

export const campanhas = pgTable("campanhas", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  mensagem: text("mensagem").notNull(),
  /** Folder (STU-002) anexado como link público. */
  folderId: integer("folder_id").references(() => folders.id),
  criadoPor: text("criado_por").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const campanhaEnvios = pgTable(
  "campanha_envios",
  {
    id: serial("id").primaryKey(),
    campanhaId: integer("campanha_id").notNull().references(() => campanhas.id, { onDelete: "cascade" }),
    inscritoId: integer("inscrito_id").notNull().references(() => inscritosPromocoes.id, { onDelete: "cascade" }),
    enviadoEm: timestamp("enviado_em", { withTimezone: true }).notNull().defaultNow(),
    autor: text("autor").notNull(),
  },
  (t) => [uniqueIndex("campanha_envio_uq").on(t.campanhaId, t.inscritoId)],
);
