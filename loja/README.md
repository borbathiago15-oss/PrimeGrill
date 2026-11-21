# Prime Grill — Loja online (MVP)

Vitrine pública + pedido enviado ao WhatsApp + painel da loja. Escopo em `docs/03-business/ecommerce/ECM-001-vitrine-publica.md` §8; stack em `docs/17-adr/ADR-001`.

## O que tem

- **Loja (`/`)**: cardápio por categoria, detalhe do produto, carrinho, checkout (entrega por bairro ou retirada), pedido salvo e botão para enviar ao WhatsApp da loja.
- **Peça inteira**: R$/kg + valor aproximado (se houver peso médio); o cliente paga o peso real. **Pacote**: preço fixo.
- **Painel (`/admin`)**: pedidos com status e histórico, **calculadora de pesagem** (peso real → valor final → mensagem ao cliente), produtos e preços com foto, disponibilidade, horários, pausa da loja, WhatsApp e bairros de entrega.
- Regras em `src/modules` com testes (`npm test`): centavos e gramas inteiros, cálculo do pedido, mensagem do WhatsApp, horário da loja.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha ADMIN_EMAIL, ADMIN_PASSWORD (12+) e SESSION_SECRET (32+)
npm run db:seed              # cria o banco local (PGlite em .data/) e o catálogo inicial
npm run dev
```

## Publicar na Vercel

1. Criar um PostgreSQL gerenciado (Supabase, Neon ou Vercel Postgres) e copiar a URL.
2. Na Vercel: importar o repositório com **Root Directory = `loja`**.
3. Variáveis de ambiente: `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET` e `BLOB_READ_WRITE_TOKEN` (criar um Blob Store no projeto).
4. O comando `vercel-build` aplica as migrations antes do build.
5. Catálogo inicial (uma vez): `DATABASE_URL=... npm run db:seed`.

## Antes de abrir ao público

- Revisar **todos os preços** (vieram dos encartes de setembro/2026).
- Cadastrar o **peso médio** das peças inteiras (sem ele, a loja mostra só o R$/kg).
- Configurar **horários reais**, **endereço de retirada** e **bairros de entrega** com taxas.
- Informar a disponibilidade real de cada produto.
