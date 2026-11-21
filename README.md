# Prime Grill ERP

ERP integrado a e-commerce para a **Prime Grill Paiva** — carnes premium, produtos para churrasco e acessórios.

> Fase atual: **documentação** (nenhum código de produção ainda).
> Toda implementação segue rigorosamente `docs/`. O índice oficial é
> [`docs/00-governance/document-registry.md`](docs/00-governance/document-registry.md).

## Estrutura da documentação

```text
docs/
├── 00-governance        # Registro de documentos, documento mestre, diagnóstico inicial
├── 02-product           # Referências externas e ideias incorporadas
├── 03-business          # Regras de negócio por domínio
│   ├── principios       # Princípios transversais (ex.: alternativa manual)
│   ├── catalogo         # Produtos e tipo de venda
│   ├── recebimento      # Entrada de notas fiscais
│   ├── estoque          # Modelo de estoque (peça inteira / pacote)
│   ├── pesagem          # Central de Pesagem e balança conectada
│   ├── ecommerce        # Vitrine pública
│   └── studio           # Prime Grill Studio e folder automático
├── 05-design-system     # Marca, cores, tipografia e tokens
└── 17-adr               # Architecture Decision Records
```

## Regras

1. Primeiro documentação, depois implementação.
2. Em conflito, o documento com status `Approved` no registro vence.
3. Mudanças de arquitetura exigem ADR.
4. Nenhuma regra de negócio específica da Prime Grill é trocada por um fluxo genérico de ERP sem aprovação.
5. Nenhum segredo (certificado, chaves, senhas) é armazenado no repositório.
