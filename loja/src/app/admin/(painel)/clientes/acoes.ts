"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPermissao } from "@/lib/admin";
import { excluirDadosCliente } from "@/lib/clientes";
import { digitosCelular } from "@/modules/clientes/clientes";

export type EstadoExclusao = { erro?: string };

/** Só o dono. Exige digitar o celular de novo e informar o motivo (ex.: "pedido do titular pelo WhatsApp em 23/11"). */
export async function excluirCliente(_: EstadoExclusao, form: FormData): Promise<EstadoExclusao> {
  const autor = await exigirPermissao("clientesExcluir");
  const celular = digitosCelular(String(form.get("celular") ?? ""));
  const confirmacao = digitosCelular(String(form.get("confirmacao") ?? ""));
  const motivo = String(form.get("motivo") ?? "").trim().slice(0, 200);
  if (!celular || confirmacao !== celular) return { erro: "Digite o celular do cliente para confirmar a exclusão." };
  if (motivo.length < 5) return { erro: "Informe o motivo (ex.: pedido do titular pelo WhatsApp em 23/11)." };
  const r = await excluirDadosCliente(celular, autor, motivo);
  if ("erro" in r) return { erro: r.erro };
  revalidatePath("/admin/clientes");
  revalidatePath("/admin");
  redirect(`/admin/clientes?apagado=${r.pedidos}-${r.mensagens}-${r.arquivos}`);
}
