import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 5 * 1024 * 1024;

/** Confere o tipo real pelos primeiros bytes (não confia na extensão). */
export function tipoImagem(b: Uint8Array): "jpg" | "png" | "webp" | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp";
  return null;
}

/** PDF começa com "%PDF-". */
export function ehPdf(b: Uint8Array) {
  return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d;
}

/** Anexo do chat do pedido: foto (JPG/PNG/WebP) ou PDF, até 5 MB, gravado com nome aleatório. */
export async function salvarAnexo(arquivo: File): Promise<{ ok: true; url: string; tipo: "imagem" | "pdf"; nome: string } | { ok: false; erro: string }> {
  if (arquivo.size === 0) return { ok: false, erro: "Arquivo vazio." };
  if (arquivo.size > MAX_BYTES) return { ok: false, erro: "Arquivo acima de 5 MB." };
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const img = tipoImagem(bytes);
  const pdf = !img && ehPdf(bytes);
  if (!img && !pdf) return { ok: false, erro: "Envie uma foto (JPG, PNG, WebP) ou um PDF." };
  const ext = img ?? "pdf";
  const contentType = img ? `image/${img === "jpg" ? "jpeg" : img}` : "application/pdf";
  const nome = `chat/${randomUUID()}.${ext}`;
  const original = (arquivo.name || `anexo.${ext}`).replace(/[^\w.\- ]+/g, "").slice(0, 80) || `anexo.${ext}`;
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) {
    const { put } = await import("@vercel/blob");
    const r = await put(nome, Buffer.from(bytes), { access: "public", contentType });
    return { ok: true, url: r.url, tipo: img ? "imagem" : "pdf", nome: original };
  }
  if (process.env.NODE_ENV === "production") return { ok: false, erro: "Armazenamento de arquivos não configurado." };
  const destino = path.join(process.cwd(), "public", "uploads", nome);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, bytes);
  return { ok: true, url: `/uploads/${nome}`, tipo: img ? "imagem" : "pdf", nome: original };
}

export async function salvarFoto(arquivo: File, pasta: "produtos" | "pix" = "produtos"): Promise<{ ok: true; url: string } | { ok: false; erro: string }> {
  if (arquivo.size === 0) return { ok: false, erro: "Arquivo vazio." };
  if (arquivo.size > MAX_BYTES) return { ok: false, erro: "Foto acima de 5 MB." };
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const tipo = tipoImagem(bytes);
  if (!tipo) return { ok: false, erro: "Envie uma foto JPG, PNG ou WebP." };
  const nome = `${pasta}/${randomUUID()}.${tipo}`;

  // Na Vercel, o Blob conectado ao projeto expõe BLOB_STORE_ID (autenticação OIDC) ou um token de leitura/escrita.
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) {
    const { put } = await import("@vercel/blob");
    const r = await put(nome, Buffer.from(bytes), { access: "public", contentType: `image/${tipo === "jpg" ? "jpeg" : tipo}` });
    return { ok: true, url: r.url };
  }
  if (process.env.NODE_ENV === "production") return { ok: false, erro: "Armazenamento de fotos não configurado (conecte um Blob ao projeto)." };
  const destino = path.join(process.cwd(), "public", "uploads", nome);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, bytes);
  return { ok: true, url: `/uploads/${nome}` };
}
