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

## Consolidado final

- MVV lado a lado com RD.
- Colunas finais: `ID_FINAL`, `Y_FINAL`, `X_FINAL`, `Z_COLLAR_FINAL`, `PROFUNDIDADE_FINAL`.
