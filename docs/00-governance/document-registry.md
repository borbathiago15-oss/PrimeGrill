# GOV-001 — Registro de Documentos

> Índice da fonte oficial de verdade do Prime Grill ERP.
> Nenhum documento é oficial se não estiver registrado aqui.

**Documento:** GOV-001 — Registro de Documentos
**Versão:** 1.0.0
**Status:** 🟢 Approved

---

## 1. Regras de registro

1. Todo documento oficial tem ID único, versão, status e caminho.
2. Status válidos: `Draft`, `In Review`, `Approved`, `Superseded`, `Archived`.
3. Em conflito entre documentos, vence o `Approved` registrado aqui.
4. `In Review` é proposta: pode orientar o desenho, mas **não autoriza implementação**.
5. Mudanças de arquitetura exigem ADR em `docs/17-adr/`.
6. Documentos substituídos vão para `docs/90-archive/superseded/` e nunca voltam a ser referência.

## 2. Governança

| ID | Documento | Versão | Status | Caminho |
|----|-----------|--------|--------|---------|
| GOV-001 | Registro de Documentos (este arquivo) | 1.0.0 | 🟢 Approved | `docs/00-governance/document-registry.md` |
| PG-000 | Documento Mestre do Prime Grill ERP | 1.0.0 | 🟢 Approved | `docs/00-governance/PG-000-documento-mestre.md` |
| DIAG-001 | Diagnóstico Inicial e Matriz de Rastreabilidade | 1.0.0 | 🟡 In Review | `docs/00-governance/DIAG-001-diagnostico-inicial.md` |

## 3. Produto

| ID | Documento | Versão | Status | Caminho |
|----|-----------|--------|--------|---------|
| REF-001 | Referências Open Source e Ideias Incorporáveis | 1.0.0 | 🟡 In Review | `docs/02-product/REF-001-referencias-open-source.md` |

## 4. Negócio

| ID | Documento | Versão | Status | Caminho |
|----|-----------|--------|--------|---------|
| PG-P-001 | Princípio: Toda Entrada Automática Tem Alternativa Manual | 1.0.0 | 🟢 Approved | `docs/03-business/principios/PG-P-001-alternativa-manual.md` |
| CAT-001 | Tipo de Venda (cadastro) | 1.0.0 | 🟢 Approved | `docs/03-business/catalogo/CAT-001-tipo-de-venda.md` |
| REC-001 | Entrada de Notas Fiscais | 1.0.0 | 🟢 Approved | `docs/03-business/recebimento/REC-001-entrada-de-notas.md` |
| EST-001 | Modelo de Estoque | 1.0.0 | 🟢 Approved | `docs/03-business/estoque/EST-001-modelo-de-estoque.md` |
| PES-001 | Central de Pesagem e Balança Conectada | 1.0.0 | 🟢 Approved | `docs/03-business/pesagem/PES-001-central-de-pesagem.md` |
| ECM-001 | Vitrine Pública (cardápio online) | 1.0.0 | 🟡 In Review | `docs/03-business/ecommerce/ECM-001-vitrine-publica.md` |
| STU-001 | Prime Grill Studio | 1.0.0 | 🟡 In Review | `docs/03-business/studio/STU-001-prime-grill-studio.md` |
| STU-002 | Folder Automático (encarte) | 1.0.0 | 🟢 Approved | `docs/03-business/studio/STU-002-folder-automatico.md` |

## 5. Design System

| ID | Documento | Versão | Status | Caminho |
|----|-----------|--------|--------|---------|
| DS-001 | Marca, Cores, Tipografia e Tokens | 1.0.0 | 🟢 Approved | `docs/05-design-system/DS-001-marca-e-tokens.md` |
| DS-002 | Tokens em CSS | 1.0.0 | 🟢 Approved | `docs/05-design-system/tokens.css` |

## 6. ADRs

| ID | Decisão | Status | Caminho |
|----|---------|--------|---------|
| ADR-001 | Stack: Next.js + PostgreSQL na Vercel | 🟢 Accepted | `docs/17-adr/ADR-001-stack-monolito-modular.md` |
| ADR-002 | Armazenamento de arquivos fora do banco | 🟡 Proposed | `docs/17-adr/ADR-002-armazenamento-de-arquivos.md` |
| ADR-003 | Renderização de artes (Studio) | 🟡 Proposed | `docs/17-adr/ADR-003-renderizacao-de-artes.md` |
| ADR-004 | Dinheiro em centavos e peso em gramas inteiras | 🟢 Accepted | `docs/17-adr/ADR-004-dinheiro-e-peso-inteiros.md` |

## 7. Decisões abertas

| # | Tema | Origem | Situação |
|---|------|--------|----------|
| C1 / S1 | Stack global | DIAG-001 | Resolvida — ADR-001 aceita (Next.js + PostgreSQL + Vercel) |
| S2 | Armazenamento de arquivos | STU-001 | Proposta em ADR-002 — aguarda aprovação |
| C6 | Tolerância entre peso estimado e peso real; recusa do cliente | PES-001 | Aberta |
| C7 | Custo usado no CMV (médio do produto) | EST-001 | Aberta — validar com o contador |
| C9 | Validade da reserva por estado do pedido | ECM-001 | Aberta |
| C10 | Multiempresa (vender o ERP a terceiros) | DIAG-001 | Aberta |
| C11 | Provedor de pagamento | DIAG-001 | Aberta |
| C12 | Emissão fiscal de saída: direta ou externa | DIAG-001 | Aberta — depende do contador |
| C13 | Apropriação de despesas de aquisição no custo | EST-001 | Aberta — depende do contador |
| S4 | Arquivo oficial da logo branca (vetor) | DS-001 | Aguardando o arquivo |
| S6 / S8 | Limites e fornecedores de IA no Studio | STU-001 | Aberta |
| — | Dimensões do banner horizontal | STU-001 | Proposta: 1920×640 e 1200×628 |
| — | Janela do "de/por" (preço anterior real) | STU-001 | Proposta: 30 dias |

## 8. Histórico

| Data | Evento |
|------|--------|
| 2026-11-15 | Diagnóstico inicial: repositório vazio; referências Trino Supply (docs + código .NET) e Trino Ops Performance analisadas |
| 2026-11-15 | Vitrine no modelo de cardápio online (referência Goomer) solicitada pelo responsável |
| 2026-11-15 | Modelo de estoque definido pelo responsável: peça inteira (kg + nº de peças, pesada na saída) e pacote (unidades); substitui PG-000 §6 e §10 originais |
| 2026-11-15 | Tipo de venda como cadastro próprio; entrada de notas priorizando download automático pela SEFAZ |
| 2026-11-21 | Princípio de alternativa manual aprovado; folder automático com saída em PDF e imagens; design padronizado pelo encarte publicado |
| 2026-11-21 | Primeira gravação da documentação no repositório (branch `docs/fundacao-documental`) |
| 2026-11-21 | ADR-001 aceita (Next.js + PostgreSQL + Vercel); início do MVP da loja online (ECM-001 §8) |
| 2026-11-21 | Entrega por distância (faixas em km a partir do endereço da loja) substitui zonas por bairro; acompanhamento do pedido para o cliente (ECM-001 §8.1) |
| 2026-11-21 | Implementados EST-001 (estoque por movimentações, custo médio, quebra, ajuste), REC-001 canais XML e digitação (SEFAZ aguarda certificado A1; PDF ainda não) e baixa de estoque na separação/pesagem com estorno no cancelamento |
| 2026-11-21 | Fluxo guiado do pedido com link do cliente e Pix (ECM-001 §8.2–8.3); usuários e papéis (USR-001); pedido do WhatsApp no painel; alteração do pedido pelo cliente |
| 2026-11-21 | STU-002 implementado (folder automático: encarte, feed e story; PDF, JPEG, PNG; versões e desatualização); fontes servidas pelo próprio site |
| 2026-11-21 | Chat do pedido (cliente ↔ atendente), app instalável (PWA) e "Meus pedidos" (ECM-001 §8.4) |
