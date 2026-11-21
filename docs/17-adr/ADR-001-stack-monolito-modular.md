# ADR-001 — Stack e monólito modular

**Status:** 🟢 Accepted (2026-11-21, decisão do responsável)
**Substitui:** proposta anterior (.NET 9 + Next.js)

## Contexto

As referências divergem (Trino Supply docs × código × Trino Ops Performance). O responsável priorizou colocar a loja online no ar rapidamente, com evolução gradual para o ERP completo.

## Decisão

- **Aplicação:** Next.js (App Router) + TypeScript, uma única aplicação com a vitrine pública e o painel administrativo.
- **Banco:** PostgreSQL (produção: provedor gerenciado, ex.: Supabase ou Neon); desenvolvimento local com **PGlite** (PostgreSQL embarcado, sem Docker).
- **Acesso a dados:** Drizzle ORM, migrations SQL versionadas e aditivas.
- **Hospedagem:** Vercel.
- **Organização:** monólito modular por domínio (`src/modules/<dominio>`), sem acesso direto ao schema de outro módulo; regras de negócio em funções puras testadas.
- Dinheiro em centavos e peso em gramas (ADR-004).

## Consequências

- Primeira versão no ar em dias, não semanas.
- Separar um backend dedicado no futuro continua possível, porque as regras ficam em módulos isolados.
- Arquivos de imagem: Vercel Blob em produção (substitui temporariamente o R2 da ADR-002 para o MVP), pasta local em desenvolvimento.
