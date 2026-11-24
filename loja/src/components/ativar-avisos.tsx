"use client";
import { useT } from "@/components/idioma";

import { useEffect, useState } from "react";
import { ativarAvisosCliente, ativarAvisosLoja, chavePublicaPush } from "@/app/avisos-acoes";

type Estado = "carregando" | "sem-suporte" | "ios-instalar" | "bloqueado" | "pode" | "ativo" | "ativando" | "erro";

function base64ParaBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const s = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...s].map((c) => c.charCodeAt(0)));
}

const chaveLocal = (alvo: string) => `pg-avisos-${alvo}`;

/**
 * Botão "Receber avisos no celular".
 * Android/computador: pede permissão e inscreve. iPhone: só funciona com o app instalado na Tela de Início (iOS 16.4+).
 */
export function AtivarAvisos({ publico, codigo, tema }: { publico: "CLIENTE" | "LOJA"; codigo?: string; tema: "escuro" | "claro" }) {
  const [estado, setEstado] = useState<Estado>("carregando");
  const t = useT();
  const alvo = publico === "LOJA" ? "loja" : codigo!;

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const instalado = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setEstado(ios && !instalado ? "ios-instalar" : "sem-suporte");
    if (Notification.permission === "denied") return setEstado("bloqueado");
    let ativo = false;
    try {
      ativo = localStorage.getItem(chaveLocal(alvo)) === "1";
    } catch {}
    setEstado(ativo && Notification.permission === "granted" ? "ativo" : "pode");
  }, [alvo]);

  async function ativar() {
    setEstado("ativando");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setEstado(perm === "denied" ? "bloqueado" : "pode");
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const chave = await chavePublicaPush();
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ParaBytes(chave) }));
      const json = sub.toJSON();
      const r = publico === "LOJA" ? await ativarAvisosLoja(json) : await ativarAvisosCliente(codigo!, json);
      if (r.erro) return setEstado("erro");
      try {
        localStorage.setItem(chaveLocal(alvo), "1");
      } catch {}
      setEstado("ativo");
      reg.showNotification(publico === "LOJA" ? "Avisos da loja ativados" : t.avisos.notifTitulo, {
        body: publico === "LOJA" ? "Este aparelho vai avisar novos pedidos, mensagens e pagamentos." : t.avisos.notifCorpo,
        icon: "/icones/icone-192.png",
      });
    } catch (e) {
      console.error(e);
      setEstado("erro");
    }
  }

  if (estado === "carregando" || estado === "sem-suporte") return null;
  const texto: Record<Exclude<Estado, "carregando" | "sem-suporte">, string> = {
    pode: publico === "LOJA" ? "🔔 Ativar avisos neste aparelho" : t.avisos.ativar,
    ativando: t.avisos.ativando,
    ativo: publico === "LOJA" ? "🔔 Avisos ativos neste aparelho" : t.avisos.ativo,
    bloqueado: t.avisos.bloqueado,
    "ios-instalar": t.avisos.iosInstalar,
    erro: t.avisos.erro,
  };
  const clicavel = estado === "pode" || estado === "erro";
  return (
    <div className={`avisos ${tema} ${estado}`}>
      {clicavel ? (
        <button type="button" onClick={ativar}>
          {texto[estado]}
        </button>
      ) : (
        <span>{texto[estado]}</span>
      )}
    </div>
  );
}
