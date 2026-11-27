"use client";
import { useT } from "@/components/idioma";

import Link from "next/link";
import { useEffect, useState } from "react";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const CHAVE_PEDIDOS = "pg-meus-pedidos";
const CHAVE_FECHADO = "pg-instalar-fechado";

function ler<T>(k: string, padrao: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : padrao;
  } catch {
    return padrao;
  }
}

/** Registra o service worker e oferece "Instalar o app" (Android) ou mostra como adicionar (iPhone). */
export function AppInstalavel() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [ios, setIos] = useState(false);
  const [mostrar, setMostrar] = useState(false);
  const t = useT();

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => {});
    const instalado = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    if (instalado || ler(CHAVE_FECHADO, false)) return;
    const pegar = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
      setMostrar(true);
    };
    window.addEventListener("beforeinstallprompt", pegar);
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      setIos(true);
      setMostrar(true);
    }
    return () => window.removeEventListener("beforeinstallprompt", pegar);
  }, []);

  if (!mostrar) return null;
  const fechar = () => {
    setMostrar(false);
    try {
      localStorage.setItem(CHAVE_FECHADO, "true");
    } catch {}
  };

  return (
    <div className="instalar" role="dialog" aria-label="Instalar o app">
      <img src="/icones/icone-192.png" alt="" width={44} height={44} />
      <div>
        <b>{t.app.titulo}</b>
        {ios ? <small>{t.app.ios}</small> : <small>{t.app.android}</small>}
      </div>
      {!ios && evento && (
        <button
          type="button"
          onClick={async () => {
            await evento.prompt();
            await evento.userChoice;
            setMostrar(false);
          }}
        >
          {t.app.instalar}
        </button>
      )}
      <button type="button" className="x" onClick={fechar} aria-label={t.app.fechar}>
        ×
      </button>
    </div>
  );
}

/** Guarda o pedido neste aparelho para o cliente voltar a ele pelo app. */
export function LembrarPedido({ codigo }: { codigo: string }) {
  useEffect(() => {
    try {
      const l = ler<string[]>(CHAVE_PEDIDOS, []).filter((c) => c !== codigo);
      localStorage.setItem(CHAVE_PEDIDOS, JSON.stringify([codigo, ...l].slice(0, 5)));
    } catch {}
  }, [codigo]);
  return null;
}

/** Botão "Ajuda" no cardápio: leva ao chat de cada pedido feito neste aparelho ou ao WhatsApp da loja. */
export function AjudaFlutuante({ whatsapp }: { whatsapp: string }) {
  const [aberto, setAberto] = useState(false);
  const [lista, setLista] = useState<string[]>([]);
  const t = useT();
  useEffect(() => setLista(ler<string[]>(CHAVE_PEDIDOS, [])), []);
  const zap = whatsapp.replace(/\D/g, "");
  return (
    <>
      {aberto && (
        <div className="ajuda-painel" role="dialog" aria-label={t.app.ajudaTitulo}>
          <div className="ajuda-topo">
            <b>{t.app.ajudaTitulo}</b>
            <button type="button" className="x" onClick={() => setAberto(false)} aria-label={t.app.fechar}>
              ×
            </button>
          </div>
          {lista.length > 0 ? (
            <>
              <p>{t.app.ajudaPedido}</p>
              {lista.map((c) => (
                <Link key={c} href={`/pedido/${c}#chat`} className="btn-linha">
                  💬 {t.app.falarPedido(c)}
                </Link>
              ))}
            </>
          ) : (
            <p>{t.app.ajudaSemPedido}</p>
          )}
          {zap && (
            <a className="btn-linha" href={`https://wa.me/${zap.startsWith("55") ? zap : `55${zap}`}`} target="_blank" rel="noopener noreferrer">
              {t.app.ajudaWhats}
            </a>
          )}
        </div>
      )}
      <button type="button" className="ajuda-botao" onClick={() => setAberto((v) => !v)} aria-expanded={aberto}>
        💬 {t.app.ajuda}
      </button>
    </>
  );
}

/** Atalho "Meus pedidos" no cardápio, com os pedidos feitos neste aparelho. */
export function MeusPedidos() {
  const [lista, setLista] = useState<string[]>([]);
  const t = useT();
  useEffect(() => setLista(ler<string[]>(CHAVE_PEDIDOS, [])), []);
  if (!lista.length) return null;
  return (
    <nav className="meus-pedidos" aria-label={t.app.meusPedidos}>
      <span>{t.app.meusPedidos}</span>
      {lista.map((c) => (
        <Link key={c} href={`/pedido/${c}`}>
          {c}
        </Link>
      ))}
    </nav>
  );
}
