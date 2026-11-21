export const ROTULO_NOTA: Record<string, { t: string; c: string }> = {
  PENDENTE: { t: "Pendente · conferir", c: "ouro" },
  RECEBIDA: { t: "Recebida", c: "ok" },
  RECEBIDA_DIVERGENCIA: { t: "Recebida com divergência", c: "at" },
  RECUSADA: { t: "Recusada", c: "er" },
};

export const dataBr = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split("-").reverse().join("/") : iso);
