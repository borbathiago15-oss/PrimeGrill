"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Mantém o link do pedido em dia sem o cliente recarregar: confere a versão do pedido a cada poucos
 * segundos (só com a tela visível), assim que o cliente volta para a página e quando chega um aviso no celular.
 */
export function AcompanharPedido({ codigo, versao, segundos = 8 }: { codigo: string; versao: string; segundos?: number }) {
  const router = useRouter();
  const atual = useRef(versao);
  atual.current = versao;

  useEffect(() => {
    let parado = false;
    let ocupado = false;
    async function conferir() {
      if (parado || ocupado || document.visibilityState !== "visible") return;
      ocupado = true;
      try {
        const r = await fetch(`/pedido/${codigo}/versao`, { cache: "no-store" });
        const { v } = (await r.json()) as { v: string | null };
        if (v && v !== atual.current) {
          atual.current = v;
          router.refresh();
        }
      } catch {
        /* sem rede: tenta no próximo ciclo */
      } finally {
        ocupado = false;
      }
    }
    const t = setInterval(conferir, segundos * 1000);
    const voltar = () => conferir();
    document.addEventListener("visibilitychange", voltar);
    window.addEventListener("focus", voltar);
    window.addEventListener("online", voltar);
    const doAviso = (e: MessageEvent) => {
      if (e.data?.tipo === "pedido-atualizado") conferir();
    };
    navigator.serviceWorker?.addEventListener("message", doAviso);
    return () => {
      parado = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", voltar);
      window.removeEventListener("focus", voltar);
      window.removeEventListener("online", voltar);
      navigator.serviceWorker?.removeEventListener("message", doAviso);
    };
  }, [codigo, segundos, router]);
  return null;
}
