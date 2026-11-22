"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Msg = { id: number; de: "CLIENTE" | "LOJA"; texto: string; quando: string; autor: string | null };

const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

/**
 * Chat do pedido (cliente ↔ loja). Atualiza sozinho a cada poucos segundos enquanto a tela está aberta.
 * `lado` diz quem está usando: as mensagens dele ficam à direita.
 */
export function ChatPedido({
  lado,
  tema,
  titulo,
  vazio,
  ler,
  enviar,
}: {
  lado: "CLIENTE" | "LOJA";
  tema: "escuro" | "claro";
  titulo: string;
  vazio: string;
  ler: (depoisDe: number) => Promise<Msg[]>;
  enviar: (texto: string) => Promise<{ erro?: string }>;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const ultimo = useRef(0);
  const caixa = useRef<HTMLDivElement>(null);

  const buscar = useCallback(async () => {
    try {
      const novas = await ler(ultimo.current);
      if (novas.length) {
        ultimo.current = novas[novas.length - 1].id;
        setMsgs((m) => [...m, ...novas.filter((n) => !m.some((x) => x.id === n.id))]);
      }
    } catch {
      /* sem rede: tenta de novo no próximo ciclo */
    }
  }, [ler]);

  useEffect(() => {
    buscar();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") buscar();
    }, 6000);
    return () => clearInterval(t);
  }, [buscar]);

  useEffect(() => {
    // Rola só a caixa do chat (não a página) até a última mensagem.
    if (caixa.current) caixa.current.scrollTop = caixa.current.scrollHeight;
  }, [msgs.length]);

  async function mandar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    setErro(null);
    const r = await enviar(texto);
    setEnviando(false);
    if (r.erro) return setErro(r.erro);
    setTexto("");
    await buscar();
  }

  return (
    <section className={`chat ${tema}`}>
      <h2>{titulo}</h2>
      <div className="chat-msgs" aria-live="polite" ref={caixa}>
        {msgs.length === 0 && <p className="chat-vazio">{vazio}</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`chat-m ${m.de === lado ? "minha" : "outra"}`}>
            <p>{m.texto}</p>
            <small>
              {m.de === "LOJA" ? (lado === "LOJA" ? (m.autor ?? "loja") : "Prime Grill") : lado === "CLIENTE" ? "você" : "cliente"} · {hora.format(new Date(m.quando))}
            </small>
          </div>
        ))}
      </div>
      <form onSubmit={mandar} className="chat-form">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) mandar(e);
          }}
          rows={2}
          maxLength={500}
          placeholder={lado === "CLIENTE" ? "Escreva sua dúvida…" : "Responder ao cliente…"}
          aria-label="Mensagem"
        />
        <button disabled={!texto.trim() || enviando}>{enviando ? "…" : "Enviar"}</button>
      </form>
      {erro && <p className="chat-erro">{erro}</p>}
    </section>
  );
}
