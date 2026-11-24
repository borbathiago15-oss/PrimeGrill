import "server-only";
import { cookies, headers } from "next/headers";
import { COOKIE_IDIOMA, idiomaDoNavegador, idiomaValido, type Idioma } from "@/modules/i18n/idiomas";
import { textos } from "@/modules/i18n/textos";

/** Idioma de quem está acessando: escolha salva (cookie) ou, na primeira visita, o idioma do celular. */
export async function idiomaAtual(): Promise<Idioma> {
  const c = (await cookies()).get(COOKIE_IDIOMA)?.value;
  if (idiomaValido(c)) return c;
  return idiomaDoNavegador((await headers()).get("accept-language"));
}

export async function textosAtuais() {
  const idioma = await idiomaAtual();
  return { idioma, t: textos(idioma) };
}
