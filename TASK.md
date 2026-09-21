# TASK

Portar a consolidacao MVV x RD para uma aplicacao estaticamente hospedavel no GitHub Pages, com upload de arquivos no navegador e geracao do Excel final sem backend.

## Resultado esperado

- Uma pagina unica para anexar `MVV.xlsx` e `RD.txt`.
- Processamento client-side.
- Download do workbook final.
- Validacao e log visiveis ao usuario.
- No fluxo de executado, escolha de exportação com profundidade ou somente com `ID`, `Y`, `X` e `Z`.
- Deduplicação do executado com prioridade para o `L-` levantado sobre o `E-` executado no mesmo número de furo.
- Interface compacta: uma unica marca, ação principal clara, saídas isoladas recolhidas, resumo sob demanda, download oculto ate a geracao e log tecnico expansivel.
- O-PitDev inicia recolhido, mas mantem upload, processamento, status, resumo e download funcionais.
- O-PitDev permite organizar somente o levantamento, sem exigir plano planejado.
- A organização do planejado identifica o perfil do workbook antes de processar; `REG43` sem o contrato MVV completo deve ser rejeitado com as colunas ausentes e sem gerar XLSX incompleto.

## Entrega O-PitDev

- Quadro separado abaixo do fluxo principal, chamado `Consolidação O-PitDev`.
- Upload do `Levantamento de Campo Enaex` em `.csv` ou `.txt`.
- Upload do `Plano de Perfuração Planejado` em `.xlsx`.
- Consolidação de `ID`, `Y`, `X`, `Z`, `Diâmetro`, `Azimute`, `Ângulo planejado`, `Ângulo do talude` e `Profundidade` do plano.
- Cálculo documentado: `Ângulo do talude = 90 - Ângulo planejado`.
- Exportação para `CONSOLIDACAO_PROJETO_O-PITDEV.xlsx` com log auditável.
- Organização independente para `LEVANTAMENTO_O-PITDEV_ORGANIZADO.xlsx`, com `ID`, `Y`, `X`, `Z` na ordem do arquivo e log auditável.
- Sugestão editável da cota do pé dos auxiliares pela moda da coluna `Z Toe` do plano de perfuração.
- Registro da coluna, frequência e quantidade de valores válidos usados na sugestão.
