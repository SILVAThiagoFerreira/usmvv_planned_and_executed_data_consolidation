# MVV RD no GitHub Pages

Aplicacao web estatica para carregar `MVV.xlsx` e `RD.txt` no navegador, consolidar os dados e baixar `MVV_RD_CONSOLIDADO_FINAL.xlsx`.

## Como usar

1. Abra a pagina publicada no GitHub Pages.
2. Anexe `MVV.xlsx` e `RD.txt`.
3. Clique em `Gerar Excel`.
4. Baixe o workbook gerado.

## Caracteristicas

- Processamento 100% client-side.
- Sem backend e sem envio dos arquivos para servidor.
- Validacao antes do processamento.
- Deduplicacao da RD com prioridade `E-` sobre `L_`.
- Workbook final com `CONSOLIDADO_FINAL`, `RD_TRATADA` e `LOG_VALIDACAO`.

## Execucao local

```bash
npm test
```

Para abrir localmente, use um servidor estatico e navegue ate `index.html`.

## Publicacao no GitHub Pages

1. Faça push dos arquivos para o branch principal do repositorio.
2. Ative GitHub Pages apontando para a raiz do branch.
3. A pagina inicial sera `index.html`.

## Estrutura

```text
index.html
main.js
config.json
styles.css
src/
tests/
input/
output/
logs/
```
