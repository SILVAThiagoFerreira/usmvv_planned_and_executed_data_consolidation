# SPEC

## Objetivo

Consolidar MVV e RD no navegador, gerar um workbook Excel e permitir que o usuario apenas anexe os arquivos de entrada.

## Decisoes obrigatorias

- O processamento ocorre 100% no navegador.
- Nenhum arquivo e enviado para servidor.
- A interface abre em portugues por padrao.
- O seletor de idioma permite portugues, ingles e chines simplificado.
- A troca de idioma altera apenas a interface da pagina, nao o workbook gerado.
- O titulo exibido e `US Vale Verde PLAN/EXEC Data Console`.
- A marca antiga nao aparece na interface.
- `E-` tem prioridade sobre `L_` na RD.
- Se houver ambos para o mesmo furo, `E-` e mantido na base tratada.
- Se nao houver RD para um furo, os campos finais usam MVV.
- O workbook final e gerado como download.

## Entradas

### MVV

- Arquivo Excel `.xlsx`.
- Aba configurada em `config.json`.
- Colunas obrigatorias na ordem de extracao:
  - `ID`
  - `Type`
  - `Descricao`
  - `Diameter`
  - `X Collar`
  - `Y Collar`
  - `X Toe`
  - `Y Toe`
  - `Z Toe`
  - `Z Collar`
  - `Depth`
  - `Sub Drill`
  - `Azimuth`
  - `Dip`

### RD

- Arquivo texto `.txt`.
- Estrutura por linha:
  - `ID do furo`
  - campo vazio
  - `Y`
  - `X`
  - `Z`

## Regras de processamento

- O identificador de comparacao e o numero do furo sem prefixo.
- `L_157` e `E-157` mapeiam para `157`.
- `E-` sempre substitui `L_` para o mesmo furo.
- Em duplicidade com o mesmo prefixo, o primeiro registro valido e mantido.
- A ordem final segue a MVV.
- `PROFUNDIDADE_FINAL` usa `(Z_RD + Sub Drill) - Z Toe` quando RD existir.
- Sem RD, `PROFUNDIDADE_FINAL` usa `Depth` da MVV.

## Validacao

- MVV deve conter todas as colunas requeridas.
- MVV deve ter as colunas numericas validas para o calculo.
- RD deve ter exatamente 5 campos.
- O segundo campo da RD deve estar vazio.
- IDs da RD devem iniciar com `L_` ou `E-`.
- Coordenadas da RD devem ser numericas.
- Arquivos invalidos bloqueiam o processamento.

## Saidas

- Aba `CONSOLIDADO_FINAL`.
- Aba `RD_TRATADA`.
- Aba `LOG_VALIDACAO`.
