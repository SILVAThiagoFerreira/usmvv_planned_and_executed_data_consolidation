# PIPELINE

## Sequencia

1. `index.html` carrega a interface.
2. `main.js` inicia a aplicacao.
3. `src/config.js` carrega `config.json`.
4. O usuario anexa `MVV.xlsx` e `RD.txt`.
5. `src/reader.js` le os arquivos.
6. `src/validator.js` valida estrutura e tipos.
7. `src/processor.js` normaliza, deduplica e consolida.
8. `src/writer.js` monta o workbook final.
9. `src/app.js` dispara o download e mostra o resumo.

## Responsabilidades

- `reader.js`: leitura dos arquivos.
- `validator.js`: validacao das fontes.
- `processor.js`: regras de negocio.
- `writer.js`: geracao do Excel.
- `app.js`: orquestracao e UI.
