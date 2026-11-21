# Prime Grill — Loja online (MVP)

Vitrine pública + pedido enviado ao WhatsApp + painel da loja. Escopo em `docs/03-business/ecommerce/ECM-001-vitrine-publica.md` §8; stack em `docs/17-adr/ADR-001`.

## O que tem

- **Loja (`/`)**: cardápio por categoria, detalhe do produto, carrinho, checkout (entrega com frete por distância a partir do CEP, ou retirada), pedido salvo e botão para enviar ao WhatsApp da loja.
- **Peça inteira**: R$/kg + valor aproximado (se houver peso médio); o cliente paga o peso real. **Pacote**: preço fixo.
- **Painel (`/admin`)**: pedidos com status e histórico, **calculadora de pesagem** (peso real → valor final → mensagem ao cliente), produtos e preços com foto, disponibilidade, horários, pausa da loja, WhatsApp e bairros de entrega.
- **Estoque (`/admin/estoque`)**: saldo por produto vindo só de movimentações (kg + peças ou unidades), reservado, disponível, custo médio ponderado, histórico, ajuste manual com motivo e fechamento de quebra.
- **Notas de entrada (`/admin/notas`)**: importação do XML da NF-e (chave validada e única, XML guardado) ou digitação com motivo; conferência item a item com divergência; confirmação pede peso e nº de peças (peça inteira) ou pacotes; vínculo item do fornecedor → produto memorizado.
- **Separação e pesagem** no pedido: peso real de cada peça, valor final, baixa no estoque; cancelamento devolve ao estoque (estorno).
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
3. Em Storage, conectar um banco **Neon** (cria `DATABASE_URL`) e um **Blob** (cria `BLOB_STORE_ID`) ao projeto.
4. Variáveis de ambiente: `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12+) e `SESSION_SECRET` (32+).
5. O comando `vercel-build` aplica as migrations e, só se o banco estiver vazio, cadastra o catálogo inicial antes do build.

## Antes de abrir ao público

- Revisar **todos os preços** (vieram dos encartes de setembro/2026).
- Cadastrar o **peso médio** das peças inteiras (sem ele, a loja mostra só o R$/kg).
- Em **Loja e entregas**: endereço da loja (conferir o ponto no mapa), **faixas de frete por km**, horários reais e endereço de retirada.
- Informar a disponibilidade real de cada produto.
