"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext } from "react";
import { COOKIE_IDIOMA, IDIOMAS, ROTULO_IDIOMA, type Idioma } from "@/modules/i18n/idiomas";
import { textos, type Textos } from "@/modules/i18n/textos";

const Ctx = createContext<Idioma>("pt");

/** Envolve a loja pública: componentes do navegador leem o idioma daqui. */
export function IdiomaProvider({ idioma, children }: { idioma: Idioma; children: React.ReactNode }) {
  return <Ctx.Provider value={idioma}>{children}</Ctx.Provider>;
}

export function useIdioma(): Idioma {
  return useContext(Ctx);
}

export function useT(): Textos {
  return textos(useContext(Ctx));
}

/** Seletor PT / EN / ES. Guarda a escolha por 1 ano e recarrega os textos da página. */
export function SeletorIdioma() {
  const atual = useIdioma();
  const router = useRouter();
  return (
    <div className="seletor-idioma" role="group" aria-label={textos(atual).idioma}>
      {IDIOMAS.map((l) => (
        <button
          key={l}
          type="button"
          lang={ROTULO_IDIOMA[l].html}
          aria-pressed={l === atual}
          title={ROTULO_IDIOMA[l].nome}
          onClick={() => {
            document.cookie = `${COOKIE_IDIOMA}=${l}; path=/; max-age=31536000; samesite=lax`;
            router.refresh();
          }}
        >
          <span aria-hidden="true">{ROTULO_IDIOMA[l].bandeira}</span> {ROTULO_IDIOMA[l].sigla}
        </button>
      ))}
    </div>
  );
}
