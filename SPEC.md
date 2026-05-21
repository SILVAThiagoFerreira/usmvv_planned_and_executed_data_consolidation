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
- A interface usa fundo branco, estilo minimalista e logo Enaex pequeno no topo esquerdo.
- O badge `Somente local` nao aparece na interface.
- O botao principal em portugues exibe `Gerar Dado Consolidado Planejado vs Realizado`.
- O botao MVV-only em portugues exibe `Organize Somente o Dado Planejado`.
- O subtitulo `Validacao local. Saida Excel controlada.` nao aparece na interface em portugues.
- O fluxo em portugues exibe `Anexar Planejado` e `Anexar Realizado`.
- Os uploads em portugues exibem `PLANEJADO.xlsx`, `REALIZADO.txt`, `Plano de Perfuração` e `Arquivo de Coordenadas da Topografia`.
- O status inicial em portugues exibe `Anexe PLANEJADO.xlsx para organizar PLANEJADO ou anexe tambem REALIZADO.txt para consolidar.`
- Os titulos em portugues usam `ARQUIVOS DE ORIGEM`, `Resumo:` e `LOG`.
- `E-` tem prioridade sobre `L_` na RD.
- Se houver ambos para o mesmo furo, `E-` e mantido na base tratada.
- Se nao houver RD para um furo, os campos finais usam MVV.
- O workbook final e gerado como download.
- A interface tambem permite anexar somente o arquivo planejado e gerar um plano planejado organizado, sem exigir realizado.

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

### Plano MVV organizado

- Entrada: somente o arquivo planejado `.xlsx`.
- Saida: workbook `MVV_PLANO_PERFURACAO_ORGANIZADO.xlsx`.
- Aba: `PLANO_MVV`.
- A ordem e as linhas seguem a MVV.
- Somente `ID` e obrigatorio por linha; demais colunas podem sair em branco quando estiverem vazias na MVV.
- Campos numericos preenchidos devem ser numericos.
- Todas as colunas fora da lista abaixo sao removidas:
  - `ID`
  - `Type`
  - `Explosivo`
  - `Diameter`
  - `X Collar`
  - `Y Collar`
  - `Z Collar`
  - `Depth`
  - `Sub Drill`
  - `Azimuth`
  - `Dip`
  - `Tampao`
  - `Carga`

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
- Para o plano MVV organizado, a MVV deve conter todas as colunas da saida `PLANO_MVV`.
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
