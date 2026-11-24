/** Idiomas da loja pública. O painel da equipe continua em português. */
export const IDIOMAS = ["pt", "en", "es"] as const;
export type Idioma = (typeof IDIOMAS)[number];

export const COOKIE_IDIOMA = "pg-idioma";

export const ROTULO_IDIOMA: Record<Idioma, { sigla: string; nome: string; bandeira: string; html: string }> = {
  pt: { sigla: "PT", nome: "Português", bandeira: "🇧🇷", html: "pt-BR" },
  en: { sigla: "EN", nome: "English", bandeira: "🇺🇸", html: "en" },
  es: { sigla: "ES", nome: "Español", bandeira: "🇪🇸", html: "es" },
};

export function idiomaValido(x: unknown): x is Idioma {
  return typeof x === "string" && (IDIOMAS as readonly string[]).includes(x);
}

/**
 * Primeira visita: usa o idioma do celular (cabeçalho Accept-Language).
 * Sem cabeçalho → português. Celular em outro idioma (francês, alemão…) → inglês, que o turista entende melhor.
 */
export function idiomaDoNavegador(acceptLanguage: string | null | undefined): Idioma {
  if (!acceptLanguage) return "pt";
  const prefs = acceptLanguage
    .split(",")
    .map((p) => {
      const [tag, q] = p.trim().split(";q=");
      return { lang: tag.toLowerCase().slice(0, 2), q: q ? Number(q) : 1 };
    })
    .filter((p) => p.lang && !Number.isNaN(p.q))
    .sort((a, b) => b.q - a.q);
  for (const p of prefs) if (idiomaValido(p.lang)) return p.lang;
  return prefs.length ? "en" : "pt";
}
