# PG-000 — Documento Mestre do Prime Grill ERP

**Documento:** PG-000
**Versão:** 1.0.0
**Status:** 🟢 Approved
**Origem:** Prompt Mestre de Contexto, Arquitetura e Requisitos de Negócio, entregue pelo responsável do projeto, com as decisões posteriores aplicadas (ver §20).

---

## 1. Diretriz

O Prime Grill ERP preserva e implementa as decisões de negócio já definidas. Regras não são simplificadas sem autorização, processos específicos da Prime Grill não são trocados por fluxos genéricos de ERP, e divergências entre documentos são levadas para aprovação.

## 2. Referências arquiteturais

| Referência | Papel | Observação |
|---|---|---|
| Trino Supply | Governança, DDD, Foundation, IAM, auditoria, permissões, organização modular | Documentação e código analisados (DIAG-001) |
| Trino Facilities | Segurança, evidências, histórico, controle de acesso | Não localizado no ambiente analisado |
| Trino Ops Performance | Infraestrutura, armazenamento, backups, deploy, monitoramento | Flask + Supabase + Cloudflare R2 |
| FinOpenPOS | Vendas, estoque, fiscal brasileiro | MIT — auditar antes de reaproveitar |
| ERPNext | Referência funcional de compras, recebimento e estoque | GPL-3.0 — **somente referência funcional, nunca código** |

## 3. Domínios

**Foundation:** autenticação, usuários, organizações, permissões, auditoria, notificações, documentos, configurações, workflow e serviços compartilhados.

**Negócio:** 1. Produtos e Catálogo · 2. Compras e Fornecedores · 3. Recebimento e Conferência · 4. Estoque · 5. Custos e Precificação · 6. E-commerce · 7. Pedidos e Central de Pesagem · 8. Financeiro · 9. Gestão Fiscal · 10. Logística e Entregas · 11. WhatsApp Business · 12. Prime Grill Studio · 13. Analytics e Dashboard Gerencial.

Cada domínio tem responsabilidades próprias, regras, contratos de integração, testes e documentação.

## 4. Produtos e Catálogo

Categorias: Bovinos, Suínos, Aves, Carvão e Acessórios, Temperos e Acompanhamentos, Cordeiro e Kits para Churrasco.

Produto tem identificação, descrição, categoria, fornecedor, classificação, unidade, imagens, parâmetros comerciais e **tipo de venda** (CAT-001). Classificações diferentes (ex.: Cara Preta, Picanha Angus) têm cadastro e custo independentes.

## 5. Compras e Recebimento

Detalhado em **REC-001**. Resumo: a nota entra como documento **pendente de recebimento**; o estoque só muda após conferência e confirmação, e apenas com a quantidade aceita. A chave de acesso impede duplicidade. O XML original é armazenado. A obrigação financeira é registrada na confirmação.

## 6. Estoque

> **Substituído pela decisão de 2026-11-15** — ver **EST-001**.

O texto original previa estoque individual de cada peça com peso, foto e custo próprios desde a entrada. O modelo aprovado é:

- **Peça inteira:** estoque em kg + nº de peças por produto; a peça é pesada **na saída**.
- **Pacote:** estoque em unidades, sem pesagem.

Permanecem válidos: gramas inteiras para carne; quantidade unitária para pacote; **nenhum saldo muda sem movimentação registrada**; identificação por código de barras ou etiqueta.

## 7. Reservas e disponibilidade

Disponível = físico − reservas − estoque de segurança. O pedido reserva a **quantidade** escolhida (peças ou pacotes). Cancelamento libera a reserva. O ciclo de vida da reserva impede duplicidade e inconsistência. Validade da reserva: decisão aberta C9.

## 8. Custo médio ponderado

Por produto. Exemplo de referência (vira teste automatizado):

| Entrada | Peso | Custo total |
|---|---|---|
| 1ª compra | 20 kg | R$ 1.300,00 |
| 2ª compra | 20 kg | R$ 1.400,00 |
| **Saldo** | **40 kg** | **R$ 2.700,00 → R$ 67,50/kg** |

Considera saldo anterior e novas entradas; sinaliza variação expressiva entre compras; visão gerencial por fornecedor e consolidada. Apropriação de despesas de aquisição e valorização contábil definitiva dependem do contador (C13).

## 9. Precificação

Considera custo médio, impostos, despesas operacionais, custos logísticos, margem desejada, margem de contribuição e reserva financeira (quando aplicável). Trabalha com markup divisor e margem de contribuição, parametrizada por produto. O sistema sugere preço; o administrador aprova ou altera. Despesas operacionais projetadas por percentual do faturamento, com ajuste manual autorizado e auditado. Reserva financeira não é despesa nem imposto.

## 10. E-commerce

> **Ajustado pela decisão de 2026-11-15** — ver **ECM-001**.

A vitrine segue o modelo de cardápio online (referência Goomer). O cliente escolhe **produto e quantidade** (não uma peça específica). Peça inteira mostra R$/kg e **valor aproximado**; pacote mostra preço fixo. Só aparecem produtos disponíveis, em tempo real, respeitando reservas.

## 11. Pedidos e Central de Pesagem

1. Cliente escolhe produto e quantidade. 2. Pedido provisório. 3. Reserva. 4. Separação. 5. Central de Pesagem (PES-001). 6. Peso real registrado pela balança. 7. Valor definitivo calculado. 8. Cliente recebe o detalhamento. 9. Cliente confirma. 10. Pagamento disponibilizado. 11. Pagamento confirmado. 12. Expedição liberada. 13. Documento fiscal conforme política aprovada. 14. Entrega.

**O valor estimado nunca é cobrado como definitivo.** O cliente recebe peso, preço por kg, valor de cada item e frete. Estados, histórico, cancelamentos e divergências são tratados.

## 12. Financeiro

Contas a pagar e a receber, fluxo de caixa, receitas, despesas, conciliação, CMV, margem de contribuição, resultado operacional e resultado por pedido, produto e período. Toda venda registra itens, pesos, preços, descontos, frete, custo, resultado, pagamento e documento fiscal. Faturamento, recebimento, custo, despesa e resultado ficam separados.

## 13. Gestão Fiscal

Entrada por XML (REC-001) e tratamento dos documentos de saída. A emissão depende de regime tributário, cadastro fiscal, certificado digital, integração com a SEFAZ e provedor escolhido. **Documentos fiscais nunca são simulados.** Emissão direta ou externa: decisão C12.

## 14. Logística e Entregas

Entrega terceirizada, despacho manual pelo painel, intermediação e pagamento dos entregadores pela plataforma. Frete calculado antes do checkout; CEP e área de cobertura; regiões não atendidas; frete cobrado × custo previsto × custo real; status, entregador, ocorrências, confirmação e conciliação. Receita de frete separada da despesa de entrega. **Retirada no local** é opção do checkout (ECM-001).

## 15. WhatsApp Business

Plataforma oficial. Atendimento, histórico, associação a clientes e pedidos, notificações, confirmação de pesagem, valores definitivos, links de pagamento, atualização de entrega e atendimento humano. Webhooks, idempotência, opt-in, templates oficiais, janela de atendimento e tratamento de falhas. A API oficial **não publica Status do WhatsApp**: artes de Status são exportadas para postagem manual.

## 16. Prime Grill Studio

Detalhado em **STU-001** e **STU-002**. Templates oficiais aprovados, identidade visual protegida, IA como assistente (nunca designer livre), preços validados no ERP antes da divulgação, histórico de versões, responsáveis e aprovações.

## 17. Dashboard Gerencial

Faturamento diário e mensal, vendas por categoria e produto, ticket médio, CMV, margem de contribuição, resultado operacional, despesas, estoque físico, disponível e reservado, baixo estoque, rupturas, custos médios, entregas, desempenho de campanhas e **quebra por produto e fornecedor** (EST-001). Indicadores sempre calculados a partir dos dados reais.

## 18. Engenharia e governança

Todo módulo tem: contexto de negócio, regras, modelo de domínio, máquina de estados, eventos e integrações, casos de uso, histórias de usuário, modelo de banco, contratos de API, permissões, protótipos e UX, critérios de aceite e testes automatizados. Mudanças arquiteturais por ADR. Regras financeiras e de estoque com testes específicos. Toda movimentação com histórico e rastreabilidade. Toda entrada automática tem alternativa manual (PG-P-001).

## 19. Estratégia de implementação

| Fase | Escopo |
|---|---|
| 0 | Decisões abertas, ADRs e documentação base |
| 1 | Foundation e infraestrutura |
| 2 | Produtos, catálogo, tipo de venda e fornecedores |
| 3 | Compras, recebimento e conferência |
| 4 | Estoque e custos |
| 5 | Precificação e e-commerce |
| 6 | Pedidos e Central de Pesagem |
| 7 | Pagamentos e financeiro |
| 8 | Fiscal e logística |
| 9 | WhatsApp Business |
| 10 | Prime Grill Studio |
| 11 | Analytics e Dashboard Gerencial |

A ordem pode ser refinada por dependência técnica, sem descartar regras de negócio.

## 20. Decisões aplicadas a este documento

| Data | Decisão | Documento |
|---|---|---|
| 2026-11-15 | Vitrine no modelo de cardápio online | ECM-001 |
| 2026-11-15 | Estoque por peça inteira (kg + peças, pesada na saída) e pacote (unidades) | EST-001 |
| 2026-11-15 | Tipo de venda como cadastro próprio; hoje apenas peça inteira e pacote | CAT-001 |
| 2026-11-15 | Notas: SEFAZ automático → XML → PDF (contingência) | REC-001 |
| 2026-11-21 | Toda entrada automática tem alternativa manual auditada | PG-P-001 |
| 2026-11-21 | Folder automático com saída em PDF e imagens | STU-002 |
| 2026-11-21 | Design padronizado pelo encarte publicado | DS-001 |
