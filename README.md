# US Vale Verde PLAN/EXEC Data Console

Aplicacao web estatica com idioma padrao em portugues e alternancia para portugues, ingles e chines simplificado para carregar `MVV.xlsx` e `RD.txt` no navegador, consolidar os dados e baixar `MVV_RD_CONSOLIDADO_FINAL.xlsx`.

## Como usar

1. Abra a pagina publicada no GitHub Pages.
2. Use o seletor de idioma no topo se quiser alternar a interface.
3. Anexe `MVV.xlsx` e `RD.txt`.
4. Clique em `Gerar planilha`.
5. Baixe a planilha gerada.

## Caracteristicas

- Processamento 100% client-side.
- Sem backend e sem envio dos arquivos para servidor.
- Validacao antes do processamento.
- Deduplicacao da RD com prioridade `E-` sobre `L_`.
- Seletor de idioma para portugues, ingles e chines simplificado.
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
