# PROMPT

Use este repositorio como uma aplicacao web estatica de processamento de arquivos.

## Regras

- Mantenha o fluxo em modulos pequenos.
- Nao mova logica de negocio para o HTML.
- Nao introduza backend sem necessidade explicita.
- Se houver ambiguidade, escreva a decisao em `SPEC.md`.
- Se um parametro mudar, atualize `config.json` e os testes.

## Ao evoluir

- Atualize `PIPELINE.md` para refletir cada etapa.
- Atualize `DATA_SCHEMA.md` quando o schema mudar.
- Preserve o download client-side.
