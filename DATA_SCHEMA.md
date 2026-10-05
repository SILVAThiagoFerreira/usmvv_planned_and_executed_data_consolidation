# DATA_SCHEMA

## MVV source

| Coluna | Tipo | Obrigatorio | Significado |
| --- | --- | --- | --- |
| ID | numero/texto | sim | Identificador do furo |
| Type | texto | sim | Tipo do furo |
| Descricao | texto | sim | Descricao |
| Diameter | numero | sim | Diametro |
| X Collar | numero | sim | Coordenada X do collar |
| Y Collar | numero | sim | Coordenada Y do collar |
| X Toe | numero | sim | Coordenada X do toe |
| Y Toe | numero | sim | Coordenada Y do toe |
| Z Toe | numero | sim | Coordenada Z do toe |
| Z Collar | numero | sim | Coordenada Z do collar |
| Depth | numero | sim | Profundidade planejada |
| Sub Drill | numero | sim | Sub drill |
| Azimuth | numero | sim | Azimute |
| Dip | numero | sim | Dip. Valores vazios e `-` sao normalizados para `0`; outros textos nao numericos falham na validacao. |

### Perfil legado nao utilizável como MVV

O perfil `REG43` é reconhecido quando o workbook possui as abas `PROJETO PERFURAÇÃO`, `LEV R&D` e `MEDIÇÃO` e a aba de projeto apresenta os cabeçalhos `ID`, `Diametro`, `X Toe`, `Y Toe` e `Z Toe`. Esse layout não é convertido automaticamente para MVV: ele não fornece, no contrato atual, todas as colunas planejadas necessárias, como `Depth`, `Azimuth`, `Dip`, `Sub Drill`, `X Collar`, `Y Collar`, `Z Collar`, `Explosivo`, `Tampao` e `Carga`.

Quando o perfil é detectado no fluxo MVV ou MVV-only, a validação encerra o processamento e informa as colunas ausentes. Nenhum valor é derivado da aba `LEV R&D` ou da aba `MEDIÇÃO` para completar o plano, pois isso misturaria levantamento/medição com dados planejados.

## RD raw

| Campo | Tipo | Obrigatorio | Significado |
| --- | --- | --- | --- |
| ID_RD | texto | sim | `L-`, `L_` ou `E-` + numero do furo |
| vazio | vazio | sim | Segundo campo vazio |
| Y_RD | numero | sim | Coordenada Y |
| X_RD | numero | sim | Coordenada X |
| Z_RD | numero | sim | Coordenada Z |

## RD tratada

| Coluna | Tipo | Obrigatorio | Significado |
| --- | --- | --- | --- |
| ID_RD | texto | sim | ID selecionado |
| TIPO_RD | texto | sim | `E-`, `L-` ou `L_` |
| Y_RD | numero | sim | Y selecionado |
| X_RD | numero | sim | X selecionado |
| Z_RD | numero | sim | Z selecionado |

## RD executado organizado

Saida gerada quando somente o executado e processado. O usuario escolhe entre os dois formatos abaixo.

| Coluna | Tipo | Obrigatorio | Significado |
| --- | --- | --- | --- |
| ID | numero | sim | ID numerico do furo sem prefixo |
| Y | numero | sim | Coordenada Y |
| X | numero | sim | Coordenada X |
| Z | numero | sim | Coordenada Z |
| Profundidade | numero | somente no modo com profundidade | `Z` de cada registro menos a cota do pé, mais a subfuração |

### RD executado sem profundidade

No modo `Sem profundidade (somente colunas)`, a aba `RD_EXECUTADO` contém somente:

| Coluna | Tipo | Obrigatorio | Significado |
| --- | --- | --- | --- |
| ID | numero | sim | ID numerico do furo sem prefixo |
| Y | numero | sim | Coordenada Y |
| X | numero | sim | Coordenada X |
| Z | numero | sim | Coordenada Z |

Nesse modo, a cota do pé e a subfuração não são lidas nem usadas.

### Deduplicação da RD-only

Antes de qualquer formato de exportação, os registros são reduzidos a um por número de furo. Quando existem `L-` ou `L_` e `E-` para o mesmo número, permanece o levantamento; o `E-` só é exportado quando não há levantamento correspondente. Registros repetidos do mesmo prefixo seguem a regra configurada de manter o primeiro registro válido.

## Consolidado final

- A aba mantém primeiro todas as linhas MVV na ordem de origem, com dados RD quando houver correspondência.
- Depois das linhas MVV, inclui uma linha para cada furo único levantado (`L-` ou `L_`) ou executado (`E-`) cujo número normalizado não exista no plano. A lista segue a ordem numérica do número de furo.
- Nas linhas sem referência planejada, `ID` recebe o número de `ID_RD` sem prefixo e sem traço, como valor numérico; `Descricao` recebe `Added`; `X Collar`, `Y Collar` e `Z Collar` recebem `X_RD`, `Y_RD` e `Z_RD` do registro selecionado.
- `ID_RD`, `TIPO_RD`, `Y_RD`, `X_RD` e `Z_RD` preservam os dados RD originais; `ID_FINAL`, `Y_FINAL`, `X_FINAL` e `Z_COLLAR_FINAL` mantêm as colunas finais de consolidação. Como a fonte RD não contém `Depth`, quando existem linhas extras a interface solicita cota do pé e subfuração, sugere a moda de `Z Toe` planejado e permite editar. O cálculo `Z_RD - cota do pé + subfuração` preenche `Z Toe`, `Sub Drill`, `Depth`, `Profundidade` e `PROFUNDIDADE_FINAL`. `X Toe`, `Y Toe`, `Type`, `Diameter`, `Azimuth` e `Dip` ficam vazios porque não existem na fonte RD.
- A seleção da fonte RD mantém `L-` e `L_` sobre `E-` para um mesmo número. Um levantamento ou executado que corresponde a uma linha MVV fica somente naquela linha e não gera uma segunda linha.
- O log `LOG_VALIDACAO` registra a quantidade de linhas acrescentadas e lista os IDs RD sem referência planejada.
- Colunas finais: `ID_FINAL`, `Y_FINAL`, `X_FINAL`, `Z_COLLAR_FINAL`, `PROFUNDIDADE_FINAL`.

## Plano MVV organizado

Saida gerada quando somente `MVV.xlsx` e processado.

| Coluna | Tipo | Obrigatorio | Significado |
| --- | --- | --- | --- |
| ID | numero/texto | sim | Identificador do furo |
| Type | texto | sim | Tipo do furo |
| Explosivo | texto | sim | Explosivo planejado |
| Diameter | numero | sim | Diametro |
| X Collar | numero | sim | Coordenada X do collar |
| Y Collar | numero | sim | Coordenada Y do collar |
| Z Collar | numero | sim | Coordenada Z do collar |
| Depth | numero | sim | Profundidade planejada |
| Sub Drill | numero | sim | Sub drill |
| Azimuth | numero | sim | Azimute |
| Dip | numero | sim | Dip. Valores vazios e `-` sao normalizados para `0`; outros textos nao numericos falham na validacao. |
| Tampao | numero | sim | Tampao planejado |
| Carga | numero | sim | Carga planejada |

## Levantamento de Campo Enaex

Arquivo `.csv` ou `.txt` delimitado por vírgula, sem cabeçalho. A quinta posição pode existir vazia quando a linha termina com vírgula.

| Posição | Tipo | Obrigatorio | Significado |
| --- | --- | --- | --- |
| 1 | numero/texto | sim | ID do furo |
| 2 | numero | sim | Coordenada Y levantada |
| 3 | numero | sim | Coordenada X levantada |
| 4 | numero | sim | Coordenada Z levantada |
| 5 | vazio | nao | Coluna final vazia do exportador Enaex |

## Plano de Perfuração Planejado para O-PitDev

Fonte: `.xlsx`, aba configurada em `config.json`.

| Campo lógico | Colunas aceitas por configuração | Significado |
| --- | --- | --- |
| ID | `ID` | Identificador usado no vínculo |
| Diâmetro | `Diameter` ou `Diâmetro` | Diâmetro planejado |
| Azimute | `Azimuth` ou `Azimute` | Azimute planejado |
| Ângulo planejado | `Angulo`, `Ângulo`, `Dip`, `Inclination` ou `Inclinação` | Inclinação da lança no plano; valor vazio ou `-` vira `0` |
| Profundidade | `Depth` ou `Profundidade` | Profundidade planejada |
| Z Toe | `Z Toe` | Cota do pé usada como base para a sugestão automática; deve ser numérica em todas as linhas válidas |

## Saída O-PitDev

| Coluna | Fonte/regra |
| --- | --- |
| `ID` | Levantamento de Campo Enaex |
| `Y`, `X`, `Z` | Levantamento de Campo Enaex |
| `Diâmetro`, `Azimute`, `Ângulo planejado`, `Profundidade` | Plano de Perfuração Planejado |
| `Ângulo do talude` | `90 - Ângulo planejado` |

A cota do pé sugerida antes da consolidação é a moda numérica de `Z Toe` no plano. A frequência, a quantidade de valores válidos e o desempate pela primeira ocorrência ficam registrados no log.

IDs auxiliares, presentes somente no levantamento, têm os campos de projeto vazios e `Profundidade = Z - cota do pé + subfuração`.

## Saída O-PitDev somente levantado

Arquivo gerado por `Organizar somente o levantado`, sem leitura do plano planejado.

| Coluna | Fonte/regra |
| --- | --- |
| `ID` | Posição configurada do levantamento, normalizada para número quando for numérica |
| `Y` | Posição configurada do levantamento |
| `X` | Posição configurada do levantamento |
| `Z` | Posição configurada do levantamento |

- A ordem das linhas é a mesma do arquivo de campo.
- A quinta posição vazia opcional do CSV não entra na saída.
- A aba de dados é `LEVANTAMENTO_O-PITDEV`.
- A aba de rastreabilidade é `LOG_LEVANTAMENTO_O-PITDEV`.
- O arquivo é `LEVANTAMENTO_O-PITDEV_ORGANIZADO.xlsx`.

## Planos de perfuração CSV

Cada CSV contém um cabeçalho e os campos exportados pelo software de planejamento. Os nomes, a ordem e os valores são mantidos conforme a origem. `Number` é o único campo interpretado numericamente.

| Campo | Tipo na origem | Regra |
| --- | --- | --- |
| Cabeçalho | texto | Deve ser idêntico em todos os arquivos, na mesma ordem, e incluir exatamente uma coluna `Number`. |
| `Number` | inteiro em texto | No Plano 1 permanece igual; nos demais recebe `(posição - 1) × incremento configurado`. |
| Demais colunas | texto CSV | Permanecem com o mesmo valor e na mesma ordem, incluindo células vazias, decimais e identificadores. |

Os arquivos precisam ter pelo menos uma linha de dados, largura consistente com o cabeçalho e valores inteiros seguros em `Number`. Depois do acréscimo, `Number` deve ser único em todo o resultado. Registros ficam agrupados na ordem selecionada e mantêm sua ordem original dentro de cada arquivo.

### Formato do CSV combinado

- Uma única linha de cabeçalho, idêntica aos arquivos de origem.
- Registros anexados na ordem Plano 1, Plano 2, Plano 3, etc.
- Separador de campos `, `, aspas duplas quando necessárias, quebras de linha CRLF e sem BOM UTF-8, conforme `config.json`.
- O arquivo é `PLANOS_DE_FUROS_COMBINADOS.csv` por padrão; o nome fica em `output.plan_merge_file_name`.
- Metadados da importação, incremento, ordem e contagens ficam disponíveis no log da interface; nenhum arquivo é enviado a servidor.
