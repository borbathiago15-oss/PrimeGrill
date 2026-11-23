/** Monta a mensagem de uma campanha para um inscrito (WhatsApp). Sempre leva o link de descadastro (LGPD). */
export function mensagemCampanha(p: { nome: string; mensagem: string; site: string; folderId: number | null; token: string }): string {
  const primeiro = p.nome.trim().split(/\s+/)[0] ?? "";
  const corpo = p.mensagem.replace(/\{nome\}/gi, primeiro).trim();
  const linhas = [corpo, ""];
  if (p.folderId) linhas.push(`Veja o folder: ${p.site}/ofertas/${p.folderId}`);
  linhas.push(`Peça pelo site: ${p.site}`, "", `Não quer mais receber? ${p.site}/sair/${p.token}`);
  return linhas.join("\n");
}

export function linkWhatsappPara(celularDigitos: string, texto: string): string {
  return `https://wa.me/55${celularDigitos}?text=${encodeURIComponent(texto)}`;
}
