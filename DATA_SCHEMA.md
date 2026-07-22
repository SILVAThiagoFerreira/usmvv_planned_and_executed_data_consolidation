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
| Dip | numero | sim | Dip |

## RD raw

| Campo | Tipo | Obrigatorio | Significado |
| --- | --- | --- | --- |
| ID_RD | texto | sim | `L_` ou `E-` + numero do furo |
| vazio | vazio | sim | Segundo campo vazio |
| Y_RD | numero | sim | Coordenada Y |
| X_RD | numero | sim | Coordenada X |
| Z_RD | numero | sim | Coordenada Z |

## RD tratada

| Coluna | Tipo | Obrigatorio | Significado |
| --- | --- | --- | --- |
| ID_RD | texto | sim | ID selecionado |
| TIPO_RD | texto | sim | `E-` ou `L_` |
| Y_RD | numero | sim | Y selecionado |
| X_RD | numero | sim | X selecionado |
| Z_RD | numero | sim | Z selecionado |

## RD executado organizado

Saida gerada quando somente o executado e processado.

| Coluna | Tipo | Obrigatorio | Significado |
| --- | --- | --- | --- |
| ID | numero | sim | ID numerico do furo sem prefixo |
| Y | numero | sim | Coordenada Y |
| X | numero | sim | Coordenada X |
| Z | numero | sim | Coordenada Z |
| Profundidade | numero | sim | Profundidade informada pelo usuario, aplicada a todos os furos |

## Consolidado final

- MVV lado a lado com RD.
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
| Dip | numero | sim | Dip |
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

## Plano de Perfuração Planejado para O-PìtDev

Fonte: `.xlsx`, aba configurada em `config.json`.

| Campo lógico | Colunas aceitas por configuração | Significado |
| --- | --- | --- |
| ID | `ID` | Identificador usado no vínculo |
| Diâmetro | `Diameter` ou `Diâmetro` | Diâmetro planejado |
| Azimute | `Azimuth` ou `Azimute` | Azimute planejado |
| Ângulo planejado | `Angulo`, `Ângulo`, `Dip`, `Inclination` ou `Inclinação` | Inclinação da lança no plano |
| Profundidade | `Depth` ou `Profundidade` | Profundidade planejada |

## Saída O-PìtDev

| Coluna | Fonte/regra |
| --- | --- |
| `ID` | Levantamento de Campo Enaex |
| `Y`, `X`, `Z` | Levantamento de Campo Enaex |
| `Diâmetro`, `Azimute`, `Ângulo planejado`, `Profundidade` | Plano de Perfuração Planejado |
| `Ângulo do talude` | `90 - Ângulo planejado` |
