import { TEXTOS, type Situacao } from "@/modules/i18n/textos";
import type { ConfigLoja, ConfigPagamento, HorarioDia } from "@/db/schema";
import { ENTREGA_PADRAO } from "../entrega/frete";

export const FUSO = "America/Recife";
export const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** Dia da semana (0 = domingo) e minutos desde 00:00 no fuso da loja. */
export function agoraNaLoja(agora: Date): { dia: number; minutos: number } {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(agora);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { dia, minutos: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function paraMinutos(hhmm: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

export type SituacaoLoja = { aberta: boolean; texto: string; situacao: Situacao };

/** Situação da loja agora. `texto` é em português (painel); `situacao` permite traduzir na loja pública. */
export function situacaoLoja(config: ConfigLoja, agora: Date): SituacaoLoja {
  const s = calcularSituacao(config, agora);
  return { aberta: s.tipo === "aberta", texto: TEXTOS.pt.loja.situacao(s), situacao: s };
}

function calcularSituacao(config: ConfigLoja, agora: Date): Situacao {
  if (config.pausada) return { tipo: "pausada", mensagem: config.mensagemPausa };
  const { dia, minutos } = agoraNaLoja(agora);
  const hoje = config.horarios.find((h) => h.dia === dia);
  if (hoje && !hoje.fechado) {
    const abre = paraMinutos(hoje.abre);
    const fecha = paraMinutos(hoje.fecha);
    if (minutos >= abre && minutos < fecha) return { tipo: "aberta", ate: hoje.fecha };
    if (minutos < abre) return { tipo: "abre_hoje", hora: hoje.abre };
  }
  return proximaAbertura(config.horarios, dia);
}

function proximaAbertura(horarios: HorarioDia[], hoje: number): Situacao {
  for (let i = 1; i <= 7; i++) {
    const d = (hoje + i) % 7;
    const h = horarios.find((x) => x.dia === d);
    if (h && !h.fechado) return { tipo: "abre", dia: d, amanha: i === 1, hora: h.abre };
  }
  return { tipo: "fechada" };
}

export const PAGAMENTO_PADRAO: ConfigPagamento = {
  pixChave: "",
  pixNome: "Prime Grill Paiva",
  pixCidade: "Recife",
  aceitaPix: true,
  aceitaCartaoLink: true,
  aceitaNaEntrega: true,
};

export const CONFIG_PADRAO: ConfigLoja = {
  horarios: DIAS.map((_, dia) => ({ dia, abre: "09:00", fecha: "18:00", fechado: false })),
  pausada: false,
  mensagemPausa: "Voltamos em instantes",
  whatsapp: "5581998990694",
  retiradaAtiva: true,
  enderecoRetirada: "",
  entrega: ENTREGA_PADRAO,
  pagamento: PAGAMENTO_PADRAO,
  whatsapp2: "5581982061289",
  privacidade: { razaoSocial: "", cnpj: "", encarregado: "", email: "" },
  instagram: "primegrill_paiva",
};
