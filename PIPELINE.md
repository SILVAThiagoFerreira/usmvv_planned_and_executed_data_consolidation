# PIPELINE

## Sequencia

1. `index.html` carrega a interface compacta; a ação principal fica visível, as saídas isoladas e o fluxo O-PitDev ficam recolhidos inicialmente e o log tecnico e expansivel.
2. `main.js` inicia a aplicacao.
3. `src/config.js` carrega `config.json`.
4. O usuario anexa `PLANEJADO.xlsx` e `REALIZADO.txt`.
5. `src/reader.js` le os arquivos.
6. `src/reader.js` registra as abas disponíveis; `src/validator.js` identifica perfis legados configurados antes de validar colunas e tipos.
7. Em `Dip`, vazio ou `-` e aceito como `0`; um perfil incompatível, como `REG43` sem o contrato MVV completo, interrompe o fluxo e não permite saída parcial.
8. `src/processor.js` normaliza e deduplica a RD, consolida as linhas da MVV na ordem original e acrescenta ao final os furos únicos da RD sem referência planejada. As linhas acrescentadas mantêm as colunas planejadas vazias e deixam a profundidade final vazia, preservando `Dip = 0` quando a origem veio vazia ou com `-`.
9. `src/writer.js` monta o workbook final somente após a validação.
10. `src/app.js` dispara o download, mostra o resumo somente após uma saída ou erro e controla os estados visuais dos detalhes.

## Sequencia MVV-only

1. O usuario anexa somente `PLANEJADO.xlsx`.
2. `src/reader.js` le a aba configurada da MVV.
3. `src/reader.js` registra o nome das abas e `src/validator.js` compara o workbook com os perfis incompatíveis configurados.
4. Se um perfil legado for reconhecido, `src/validator.js` informa o perfil e as colunas ausentes; `src/processor.js` e `src/writer.js` não são chamados.
5. Para um MVV válido, `src/validator.js` valida as colunas exigidas para `PLANO_MVV`; em `Dip`, vazio ou `-` e aceito como `0`.
6. `src/processor.js` extrai somente as colunas configuradas para o plano e normaliza `Dip` vazio ou `-` para `0`.
7. `src/writer.js` gera `MVV_PLANO_PERFURACAO_ORGANIZADO.xlsx`.
8. `src/app.js` libera o download e mostra o resumo.

## Sequencia RD-only

1. O usuario anexa somente `REALIZADO.txt`.
2. `src/app.js` permite escolher entre exportar com profundidade ou sem profundidade.
3. No modo com profundidade, `src/app.js` solicita a cota do pé e pergunta se haverá subfuração; no modo sem profundidade, esses parâmetros ficam ocultos.
4. `src/reader.js` le a RD.
5. `src/validator.js` valida a estrutura da RD.
6. `src/processor.js` deduplica a RD, mantendo `L-` sobre `E-`, normaliza `ID` para numero e, somente no modo com profundidade, calcula `Z - cota do pé + subfuração`.
7. `src/writer.js` gera `RD_EXECUTADO_ORGANIZADO.xlsx` com uma unica aba e as colunas configuradas para o modo escolhido.
8. `src/app.js` libera o download e mostra o resumo.

Quando há IDs somente no levantamento, `app.js` solicita a cota do pé e a subfuração; `processor.js` calcula a profundidade somente dessas linhas auxiliares e preserva os valores do plano nas linhas correspondentes.

## Responsabilidades

- `reader.js`: leitura dos arquivos.
- `validator.js`: validacao das fontes.
- `processor.js`: regras de negocio.
- `writer.js`: geracao do Excel.
- `app.js`: orquestracao e UI.
- `plan_merge_reader.js`, `plan_merge_validator.js`, `plan_merge_processor.js` e `plan_merge_writer.js`: módulos separados de CSV para leitura, validação, ajuste de `Number` e exportação.
- `plan_merge_pipeline.js`: orquestração do fluxo de junção CSV.

## Sequencia O-PitDev

1. O usuario anexa o `Levantamento de Campo Enaex` (`.csv` ou `.txt`) e o `Plano de Perfuração Planejado` (`.xlsx`).
2. `src/reader.js` le o texto delimitado e a aba configurada do Excel.
3. `src/validator.js` valida quantidades de campos, IDs unicos, colunas do plano e valores numericos; no angulo planejado/Dip, vazio ou `-` e aceito como `0`, enquanto `Z Toe` e obrigatoria e numerica.
4. `src/processor.js` calcula a moda numerica de `Z Toe`, com desempate pela primeira ocorrência válida, normaliza os IDs, cruza os arquivos na ordem do levantamento, traz a `Depth` do plano como `Profundidade` e calcula `90 - angulo planejado`, usando `0` quando o angulo planejado veio vazio ou `-`.
5. `src/writer.js` gera `CONSOLIDACAO_PROJETO_O-PITDEV.xlsx` com a tabela e o log de diferencas.
6. `src/app.js` habilita o download, preenche a cota do pé com a moda de `Z Toe` quando há furos auxiliares, permite a edição pelo usuario, exibe os indicadores e registra o resultado na interface.

## Sequencia O-PitDev somente levantado

1. O usuario anexa somente o `Levantamento de Campo Enaex` (`.csv` ou `.txt`).
2. `src/reader.js` le as posições configuradas `ID`, `Y`, `X` e `Z` e preserva a ordem original.
3. `src/validator.js` valida quantidade de campos, quinta posição vazia, IDs unicos e coordenadas numericas.
4. `src/processor.js` gera somente as colunas `ID`, `Y`, `X` e `Z`, sem plano, ângulos ou profundidade.
5. `src/writer.js` gera `LEVANTAMENTO_O-PITDEV_ORGANIZADO.xlsx` com `LEVANTAMENTO_O-PITDEV` e `LOG_LEVANTAMENTO_O-PITDEV`.
6. `src/app.js` libera o download e exibe o resumo de linhas organizadas.

## Sequência para juntar planos CSV

1. O usuário seleciona dois ou mais CSVs ou arrasta-os para a área de importação. Novos arquivos entram no final da lista.
2. `src/app.js` mostra a ordem e o acréscimo de cada plano; controles de mover e remover atualizam a lista antes do processamento.
3. `src/plan_merge_pipeline.js` orquestra o fluxo, lendo os arquivos em `src/plan_merge_reader.js`.
4. O leitor interpreta aspas, separadores, CRLF e espaços após a vírgula com as opções de `config.json`.
5. `src/plan_merge_validator.js` exige cabeçalhos idênticos, coluna `Number` única, largura consistente, inteiros seguros e IDs finais únicos. Erros interrompem a geração.
6. `src/plan_merge_processor.js` anexa as linhas em ordem, aplicando `(posição do plano - 1) × incremento` somente ao campo `Number`.
7. `src/plan_merge_writer.js` gera o CSV com cabeçalho único, separador, aspas, quebra de linha, codificação e nome configuráveis.
8. `src/app.js` oferece o link de download e exibe a contagem e o log após uma geração válida. O processamento permanece no navegador.
