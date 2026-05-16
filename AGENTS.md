# AGENTS

Regras permanentes para este repositorio.

## Operacao

- Leia `README.md`, `SPEC.md`, `DATA_SCHEMA.md` e `PIPELINE.md` antes de editar.
- Trate `config.json` como a unica fonte de nomes, rotulos, planilhas e parametros.
- Mantenha leitura, validacao, processamento e escrita em modulos separados.
- Preserve determinismo: mesma entrada gera sempre a mesma saida.
- Nao coloque logica de negocio diretamente em `index.html`.
- Nao use backend ou servicos ocultos para processar os arquivos.

## Qualidade

- Toda mudanca de comportamento deve atualizar `SPEC.md` e testes.
- Toda ambiguidade deve ser resolvida em `SPEC.md` antes da implementacao.
- Falhas devem ser explicitas.
- A saida deve ser auditavel e reproduzivel.

## Evolucao

- Adicione novos parametros em `config.json`.
- Mantenha a interface simples para upload de arquivos e download do resultado.
- Nao remova a rastreabilidade de validacao.
