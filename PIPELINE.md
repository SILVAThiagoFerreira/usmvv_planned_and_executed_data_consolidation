# PIPELINE

## Sequencia

1. `index.html` carrega a interface.
2. `main.js` inicia a aplicacao.
3. `src/config.js` carrega `config.json`.
4. O usuario anexa `PLANEJADO.xlsx` e `REALIZADO.txt`.
5. `src/reader.js` le os arquivos.
6. `src/validator.js` valida estrutura e tipos.
7. `src/processor.js` normaliza, deduplica e consolida.
8. `src/writer.js` monta o workbook final.
9. `src/app.js` dispara o download e mostra o resumo.

## Sequencia MVV-only

1. O usuario anexa somente `PLANEJADO.xlsx`.
2. `src/reader.js` le a aba configurada da MVV.
3. `src/validator.js` valida as colunas exigidas para `PLANO_MVV`.
4. `src/processor.js` extrai somente as colunas configuradas para o plano.
5. `src/writer.js` gera `MVV_PLANO_PERFURACAO_ORGANIZADO.xlsx`.
6. `src/app.js` libera o download e mostra o resumo.

## Sequencia RD-only

1. O usuario anexa somente `REALIZADO.txt`.
2. `src/app.js` solicita a cota do pé e pergunta se haverá subfuração.
3. `src/reader.js` le a RD.
4. `src/validator.js` valida a estrutura da RD.
5. `src/processor.js` deduplica a RD, normaliza `ID` para numero e calcula `Z - cota do pé + subfuração` em cada linha.
6. `src/writer.js` gera `RD_EXECUTADO_ORGANIZADO.xlsx` com uma unica aba.
7. `src/app.js` libera o download e mostra o resumo.

## Responsabilidades

- `reader.js`: leitura dos arquivos.
- `validator.js`: validacao das fontes.
- `processor.js`: regras de negocio.
- `writer.js`: geracao do Excel.
- `app.js`: orquestracao e UI.
