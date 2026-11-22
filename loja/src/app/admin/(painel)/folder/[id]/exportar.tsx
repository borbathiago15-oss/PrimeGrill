"use client";

import { useState } from "react";


type Tipo = "png" | "jpeg";

function baixar(url: string, nome: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function paraBlob(dataUrl: string) {
  return (await fetch(dataUrl)).blob();
}

/**
 * Gera as saídas no próprio navegador (STU-002 §5): PNG e JPEG em 2× (2160 px de largura)
 * e PDF com uma página por folha, com o botão do WhatsApp e os contatos clicáveis.
 */
export function Exportar({ nome, largura, altura }: { nome: string; largura: number; altura: number }) {
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const paginas = () => [...document.querySelectorAll<HTMLElement>("#arte .fo-pagina")];

  async function imagem(el: HTMLElement, tipo: Tipo) {
    const { domToJpeg, domToPng } = await import("modern-screenshot");
    await document.fonts.ready;
    const opc = { scale: 2, width: largura, height: altura, backgroundColor: "#0C0B0A" };
    return tipo === "png" ? domToPng(el, opc) : domToJpeg(el, { ...opc, quality: 0.9 });
  }

  async function rodar(rotulo: string, fn: () => Promise<void>) {
    setErro(null);
    setOcupado(rotulo);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      setErro("Não foi possível gerar o arquivo. Tente de novo; se continuar, recarregue a página.");
    } finally {
      setOcupado(null);
    }
  }

  const imagens = (tipo: Tipo) =>
    rodar(tipo.toUpperCase(), async () => {
      const ps = paginas();
      for (let i = 0; i < ps.length; i++) baixar(await imagem(ps[i], tipo), `${nome}${ps.length > 1 ? `-p${i + 1}` : ""}.${tipo === "png" ? "png" : "jpg"}`);
    });

  const pdf = () =>
    rodar("PDF", async () => {
      const { jsPDF } = await import("jspdf");
      const ps = paginas();
      const doc = new jsPDF({ unit: "px", format: [largura, altura], orientation: largura > altura ? "l" : "p", hotfixes: ["px_scaling"], compress: true });
      for (let i = 0; i < ps.length; i++) {
        if (i > 0) doc.addPage([largura, altura], largura > altura ? "l" : "p");
        doc.addImage(await imagem(ps[i], "jpeg"), "JPEG", 0, 0, largura, altura);
        // Áreas clicáveis: botão do WhatsApp e contatos (STU-002 §5, PDF digital).
        const caixa = ps[i].getBoundingClientRect();
        const k = largura / caixa.width;
        ps[i].querySelectorAll<HTMLElement>("[data-link]").forEach((a) => {
          const r = a.getBoundingClientRect();
          doc.link((r.left - caixa.left) * k, (r.top - caixa.top) * k, r.width * k, r.height * k, { url: a.dataset.link! });
        });
      }
      const url = URL.createObjectURL(doc.output("blob"));
      baixar(url, `${nome}.pdf`);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });

  const compartilhar = () =>
    rodar("Compartilhar", async () => {
      const arquivos = await Promise.all(paginas().map(async (p, i) => new File([await paraBlob(await imagem(p, "jpeg"))], `${nome}-${i + 1}.jpg`, { type: "image/jpeg" })));
      if (navigator.canShare?.({ files: arquivos })) await navigator.share({ files: arquivos, title: "Prime Grill Paiva" });
      else setErro("Este aparelho não compartilha arquivos direto. Baixe o JPEG e envie pelo WhatsApp.");
    });

  return (
    <div className="exportar">
      <button type="button" className="btn btn-pri btn-grande" onClick={pdf} disabled={!!ocupado}>
        {ocupado === "PDF" ? "Gerando PDF…" : "Baixar PDF"}
      </button>
      <button type="button" className="btn btn-grande" onClick={() => imagens("jpeg")} disabled={!!ocupado}>
        {ocupado === "JPEG" ? "Gerando…" : "Baixar JPEG (WhatsApp)"}
      </button>
      <button type="button" className="btn btn-grande" onClick={() => imagens("png")} disabled={!!ocupado}>
        {ocupado === "PNG" ? "Gerando…" : "Baixar PNG"}
      </button>
      <button type="button" className="btn btn-grande" onClick={compartilhar} disabled={!!ocupado}>
        {ocupado === "Compartilhar" ? "Preparando…" : "Compartilhar (celular)"}
      </button>
      {erro && <p className="msg-erro">{erro}</p>}
    </div>
  );
}
