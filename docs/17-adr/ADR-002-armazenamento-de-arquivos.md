# ADR-002 — Armazenamento de arquivos fora do banco

**Status:** 🟡 Proposed (aguarda aprovação — decisão S2)
**Data:** 2026-11-21

## Contexto

O sistema guarda XML de notas, fotos de produtos, artes do Studio, PDFs gerados, comprovantes e o certificado digital. O Trino Supply guarda arquivos dentro do banco; o Studio exige armazenamento fora dele; o Trino Ops Performance usa Cloudflare R2.

## Decisão proposta

- Arquivos em **object storage compatível com S3** (Cloudflare R2 em produção; MinIO opcional em desenvolvimento).
- No PostgreSQL ficam apenas metadados: id, tipo, tamanho, hash SHA-256, dono, módulo de origem, data, versão.
- Downloads por **URL assinada de curta duração**; nada público por padrão (exceto imagens da vitrine, servidas por CDN).
- XML fiscal e arquivos publicados são **imutáveis** (nova versão em vez de sobrescrever).
- **Certificado A1** não vai para o object storage comum: cofre de segredos/criptografia própria, com senha separada.
- Backup do bucket com retenção definida; XML fiscal retido pelo prazo legal.

## Consequências

- Banco leve e backups mais rápidos.
- Dependência de um provedor S3 (mitigada pela compatibilidade do protocolo).
