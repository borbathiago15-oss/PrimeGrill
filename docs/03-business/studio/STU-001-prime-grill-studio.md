# STU-001 — Prime Grill Studio

**Versão:** 1.0.0
**Status:** 🟡 In Review
**Fonte de marca:** Centro de Conhecimento Prime Grill Paiva + DS-001

## 1. Objetivo

Estúdio de marketing integrado ao ERP para criar, aprovar e exportar materiais **a partir de templates oficiais**. Não é editor livre: o usuário preenche campos declarados; layout e identidade são travados. A IA assiste, nunca cria layout.

## 2. Elementos fixos de todo template

- Logo oficial do Brand Kit, aplicada como camada própria; variante (branca/preta) definida pelo administrador por fundo.
- Rodapé obrigatório: **(81) 99899 0694 · (81) 98206 1289 · @primegrill_paiva**, fonte mínima de 30 px em arte de 1080 px de largura e contraste ≥ 4,5:1.
- Hierarquia comercial: produto → oferta → logo → informações complementares → contatos.

## 3. Templates iniciais

| Template | Campos editáveis | Regras |
|---|---|---|
| Oferta da Semana | Produto, foto, chamada (45), preço 🔒, preço "de" 🔒 opcional, validade, CTA (lista fechada) | Validade obrigatória; "de/por" só com preço anterior real |
| Produto em Destaque | Produto, foto, mensagem (60), até 3 características (30), preço 🔒 opcional, CTA | — |
| Encarte Promocional | Ver **STU-002** (folder automático) | — |
| Kit Churrasco | Kit, foto, itens 🔒, "serve X pessoas", preço do kit 🔒, validade | Preço aprovado como kit |
| Datas Especiais | Ocasião (lista), mensagem (60), produto e preço opcionais | Selo temático fixo; marca predominante |

🔒 = vem do ERP; o usuário não digita.

## 4. Formatos

| Formato | Dimensões | Área de segurança | Saída |
|---|---|---|---|
| Feed quadrado | 1080×1080 | 64 px | PNG, JPEG |
| Feed 4:5 | 1080×1350 | 64 px | PNG, JPEG |
| Stories / Status | 1080×1920 | 250 px topo e base | PNG, JPEG |
| Banner horizontal (proposta) | 1920×640 e 1200×628 | 48 px | PNG, JPEG |
| Encarte | 1080×1620 e A4 300 dpi com sangria de 3 mm | 10 mm (A4) | PDF + PNG/JPEG |

## 5. Regras

| ID | Regra |
|---|---|
| STU-BR-001 | Logo sempre do Brand Kit; nunca gerada, recriada, invertida por filtro ou com efeitos. |
| STU-BR-002 | Contatos obrigatórios presentes e não editáveis pelo usuário. |
| STU-BR-003 | Usuário altera só campos declarados; posição, tamanho, cor e fonte travados. |
| STU-BR-004 | Preço vem apenas do preço **aprovado**; não há digitação de preço. |
| STU-BR-005 | Preço copiado na versão com ID da aprovação e data; reconferido ao submeter, aprovar, exportar e publicar. |
| STU-BR-006 | Validade da oferta ≤ validade da promoção aprovada. |
| STU-BR-007 | "De/por" só se o preço "de" foi praticado nos últimos 30 dias (proposta). |
| STU-BR-008 | Produto indisponível não entra; se ficar indisponível depois, o material vira **Desatualizado**. |
| STU-BR-009 | Peça inteira anunciada em R$/kg; pacote em preço fixo com "· PACOTE" (CAT-001). |
| STU-BR-010 | Foto do produto preservada: a IA não troca corte, embalagem, marca ou etiqueta. |
| STU-BR-011 | IA só por clique do usuário; sugestão aplicada só após aceite; tudo registrado. |
| STU-BR-012 | Template publicado é imutável; editar gera nova versão; materiais ficam na versão em que nasceram. |
| STU-BR-013 | Desativar template impede novos materiais, sem afetar os existentes. |
| STU-BR-014 | Quem cria não aprova (exceção registrada se houver um único administrador). |
| STU-BR-015 | Arte final só de material Aprovado ou Publicado; rascunho exporta com marca d'água. |
| STU-BR-016 | Checklist automático (Centro de Conhecimento §07) bloqueia submissão e exportação. |
| STU-BR-017 | Alterar o Brand Kit gera nova versão; materiais antigos preservados. |
| STU-BR-018 | Nada é excluído; arquivar mantém histórico e arquivos. |
| STU-BR-019 | Upload: JPEG, PNG ou WebP, até 10 MB e 8000 px, tipo real conferido, EXIF removido, hash contra duplicidade. |
| STU-BR-020 | Publicar registra o destino; envio real por WhatsApp só com credenciais. Status do WhatsApp é postado manualmente. |
| STU-BR-021 | IA em foto de produto **exibido para venda** na vitrine: somente ajustes neutros (luz, contraste, recorte). Cenários gerados só em campanhas. |

## 6. Estados do material

`Rascunho` → `Em revisão` → `Aprovado` → `Publicado` → `Arquivado`; `Reprovado` volta a Rascunho; `Desatualizado` quando preço, estoque ou validade mudam (reabre como nova versão).

Template: `Rascunho` → `Em aprovação` → `Ativo` ⇄ `Inativo` → `Arquivado`.

## 7. Modelo de domínio (schema `studio`)

| Agregado | Conteúdo |
|---|---|
| BrandKit / BrandAsset | Logo branca e preta, contatos, cores, fontes, fundos; versão vigente única |
| MarketingTemplate | Formatos, layout, `fields_schema`, elementos fixos, versão, status, responsável |
| MediaAsset (+ MediaUsage) | Arquivo no armazenamento (ADR-002), categoria, formato, resolução, hash, produto |
| Campaign | Agrupador com período e status |
| Material / MaterialVersion | Template e versão, valores dos campos, cópia do preço, arquivos gerados |
| CampaignProduct | Origem do preço e data da cópia |
| Approval | Decisão, responsável, data, motivo |
| AiRequest | Pedido de IA, provedor, entrada, saída, aceito ou não |

## 8. Permissões

| Permissão | Administrador | Usuário |
|---|:-:|:-:|
| `studio.brandkit.manage` | ✅ | ❌ |
| `studio.template.view` | ✅ | ✅ |
| `studio.template.manage` / `approve` | ✅ | ❌ |
| `studio.media.upload` | ✅ | ✅ |
| `studio.media.manage` | ✅ | ❌ |
| `studio.material.create` / `submit` | ✅ | ✅ |
| `studio.material.approve` / `publish` | ✅ | ❌ |
| `studio.material.export.final` | ✅ | configurável |
| `studio.ai.use` | ✅ | ✅ |

## 9. Eventos

Publicados: `TemplatePublicado`, `BrandKitAtualizado`, `MaterialSubmetido`, `MaterialAprovado`, `MaterialReprovado`, `MaterialPublicado`, `MaterialDesatualizado`, `SugestaoIAAceita`.
Consumidos: `PrecoAprovado`, `PrecoAlterado`, `PromocaoEncerrada`, `DisponibilidadeAlterada`, `ProdutoInativado`.

## 10. Erros

`STU-ERR-001` campo inválido · `010` preço não aprovado/vencido · `011` validade além da promoção · `012` "de/por" sem preço real · `020` produto indisponível · `030` segregação de funções · `031` transição inválida · `040` checklist de marca reprovado · `050` upload inválido · `060` IA indisponível · `070` integração ausente. Códigos imutáveis.

## 11. Pendências

S6/S8 (fornecedores e limites de IA), dimensões do banner, janela do "de/por", arquivo vetorial da logo branca (S4).
