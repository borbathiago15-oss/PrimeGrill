# DIAG-001 — Diagnóstico Inicial e Matriz de Rastreabilidade

**Versão:** 1.0.0
**Status:** 🟡 In Review
**Data:** 2026-11-15

---

## 1. Estado inicial

- Repositório `borbathiago15-oss/PrimeGrill` sem nenhum commit.
- Nenhum documento de especificação do ERP além do prompt mestre (consolidado em PG-000).
- Material de marca existente: Centro de Conhecimento Prime Grill Paiva (identidade visual, logo, dados oficiais, direção de arte, produtos e fotografias, modelos de campanha, checklist) e bibliotecas de prompts de criação.
- Projeto de encartes de setembro/2026 (templates HTML, fotos de produtos, planilha de preços, saídas em PDF, PNG e PPTX).

## 2. Referências analisadas

| Referência | Forma encontrada | Achados |
|---|---|---|
| Trino Supply (docs) | Somente documentação | Registro de documentos, Foundation com 10 domínios, ADRs 009–012, segurança (ASVS, JWT 15 min + refresh rotativo, auditoria com cadeia de hash, LGPD) |
| Trino Supply (código) | .NET 9 | Um único projeto API, front de arquivo único, sem Redis/RabbitMQ/MinIO — **diverge** da própria documentação |
| Trino Ops Performance | Flask + SQLAlchemy | PostgreSQL (Supabase), Cloudflare Containers, R2, backup no Google Drive |
| Trino Facilities, FinOpenPOS, ERPNext | Não localizados localmente | FinOpenPOS e ERPNext avaliados pela web (REF-001) |

## 3. Padrões herdados do Trino Supply

1. Registro de documentos como índice oficial; `Approved` vence em conflito; superseded arquivado.
2. Banco é projeção do domínio (domínio → dados).
3. Eventos de domínio com nome de fato de negócio; outbox; idempotência.
4. Foundation antes das APIs de negócio; nenhum módulo reimplementa autenticação, auditoria, anexos, workflow ou notificações.
5. Saldo de estoque derivado de movimentações; recebimento com conferência e divergência documentada.
6. Envelope `{ data, correlationId }`, códigos de erro imutáveis, migrations aditivas, segredos em variáveis de ambiente.

## 4. Conflitos e lacunas

| # | Ponto | Situação |
|---|---|---|
| C1 | Stack: docs do Trino × código do Trino × Ops Performance | Proposta em ADR-001 |
| C2 | Hash de senha (PBKDF2 no código × Argon2id no SEC-001) | Proposta: Argon2id |
| C3 | 20 artefatos (Trino) × 13 (Prime Grill) | Adotados os 13 do PG-000 §18 |
| C4 | Peça individual desde a entrada | **Resolvido** por EST-001 |
| C5 | Recebimento por nota fiscal com chave de acesso | **Resolvido** por REC-001 |
| C6 | Tolerância peso estimado × real | Aberta |
| C7 | Custo no CMV | Aberta |
| C8 | Unidades e arredondamento | **Resolvido** por ADR-004 |
| C9 | Validade da reserva | Aberta |
| C10 | Multiempresa | Aberta |
| C11 | Provedor de pagamento | Aberta |
| C12 | Emissão fiscal de saída | Aberta |
| C13 | Apropriação de despesas de aquisição | Aberta |
| C14 | IA em fotos de produto à venda | Regra em STU-001 (somente ajustes neutros) |
| C15 | LGPD e superfície pública | Exige modelo de ameaças próprio |
| C16 | Licenças (GPL/AGPL) | ERPNext, LivreOS, Stoq: somente referência funcional |

## 5. Matriz de rastreabilidade

| PG-000 | Requisito | Documento | Status | Fase |
|---|---|---|---|---|
| §3 | Foundation | (a especificar) | Pendente | 1 |
| §4 | Catálogo e tipo de venda | CAT-001 | Approved | 2 |
| §5 | Entrada de notas e conferência | REC-001 | Approved | 3 |
| §6 | Estoque | EST-001 | Approved | 4 |
| §7 | Reservas | EST-001, ECM-001 | Parcial (C9) | 4–5 |
| §8 | Custo médio | EST-001 | Approved (C7, C13 abertas) | 4 |
| §9 | Precificação | (a especificar) | Pendente | 5 |
| §10 | Vitrine | ECM-001 | In Review | 5 |
| §11 | Pedidos e pesagem | PES-001 | Approved (C6 aberta) | 6 |
| §12 | Financeiro | FIN-001 | Fase 1 implementada | 7 |
| §13 | Fiscal | REC-001 (entrada) | Parcial (C12) | 8 |
| §14 | Logística | ECM-001 (zonas) | Parcial | 8 |
| §15 | WhatsApp | (a especificar) | Pendente | 9 |
| §16 | Studio | STU-001, STU-002 | In Review / Approved | 10 |
| §17 | Dashboard | (a especificar) | Pendente | 11 |
| §18 | Governança | GOV-001, PG-P-001 | Approved | 0 |

## 6. Riscos

1. Concorrência na reserva (dois clientes, último item): trava transacional e teste específico.
2. CMV e resultado incorretos se C7 não for decidida antes da Fase 4.
3. Fiscal e pagamento dependem de terceiros (contador, certificado A1, provedores): caminho crítico para vender.
4. WhatsApp oficial exige verificação do negócio na Meta: prazo externo.
5. Divergência entre documentação e código (ocorrida no Trino Supply): mitigada pelo registro e por revisão por artefato.
6. Escopo amplo: recomendado MVP vendável até a Fase 7, com fiscal de saída via emissor externo.
