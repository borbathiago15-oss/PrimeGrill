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

export type SituacaoLoja = { aberta: boolean; texto: string };

export function situacaoLoja(config: ConfigLoja, agora: Date): SituacaoLoja {
  if (config.pausada) return { aberta: false, texto: config.mensagemPausa || "Pausada no momento" };
  const { dia, minutos } = agoraNaLoja(agora);
  const hoje = config.horarios.find((h) => h.dia === dia);
  if (hoje && !hoje.fechado) {
    const abre = paraMinutos(hoje.abre);
    const fecha = paraMinutos(hoje.fecha);
    if (minutos >= abre && minutos < fecha) return { aberta: true, texto: `Aberta até ${hoje.fecha}` };
    if (minutos < abre) return { aberta: false, texto: `Abre hoje às ${hoje.abre}` };
  }
  const prox = proximaAbertura(config.horarios, dia);
  return { aberta: false, texto: prox ? `Fechada · abre ${prox}` : "Fechada" };
}

function proximaAbertura(horarios: HorarioDia[], hoje: number): string | null {
  for (let i = 1; i <= 7; i++) {
    const d = (hoje + i) % 7;
    const h = horarios.find((x) => x.dia === d);
    if (h && !h.fechado) return `${i === 1 ? "amanhã" : DIAS[d].toLowerCase()} às ${h.abre}`;
  }
  return null;
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
