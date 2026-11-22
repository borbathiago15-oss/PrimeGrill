"use client";

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
        <b>Prime Grill no seu celular</b>
        {ios ? <small>Toque em Compartilhar e depois em “Adicionar à Tela de Início”.</small> : <small>Instale o app: cardápio e pedidos a um toque.</small>}
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
          Instalar
        </button>
      )}
      <button type="button" className="x" onClick={fechar} aria-label="Fechar">
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

/** Atalho "Meus pedidos" no cardápio, com os pedidos feitos neste aparelho. */
export function MeusPedidos() {
  const [lista, setLista] = useState<string[]>([]);
  useEffect(() => setLista(ler<string[]>(CHAVE_PEDIDOS, [])), []);
  if (!lista.length) return null;
  return (
    <nav className="meus-pedidos" aria-label="Meus pedidos">
      <span>Meus pedidos:</span>
      {lista.map((c) => (
        <Link key={c} href={`/pedido/${c}`}>
          {c}
        </Link>
      ))}
    </nav>
  );
}
