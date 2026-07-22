# TASK

Portar a consolidacao MVV x RD para uma aplicacao estaticamente hospedavel no GitHub Pages, com upload de arquivos no navegador e geracao do Excel final sem backend.

## Resultado esperado

- Uma pagina unica para anexar `MVV.xlsx` e `RD.txt`.
- Processamento client-side.
- Download do workbook final.
- Validacao e log visiveis ao usuario.

## Entrega O-PìtDev

- Quadro separado abaixo do fluxo principal, chamado `Consolidação de Projeto para O-PìtDev`.
- Upload do `Levantamento de Campo Enaex` em `.csv` ou `.txt`.
- Upload do `Plano de Perfuração Planejado` em `.xlsx`.
- Consolidação de `ID`, `Y`, `X`, `Z`, `Diâmetro`, `Azimute`, `Ângulo planejado`, `Ângulo do talude` e `Profundidade` do plano.
- Cálculo documentado: `Ângulo do talude = 90 - Ângulo planejado`.
- Exportação para `CONSOLIDACAO_PROJETO_O-PITDEV.xlsx` com log auditável.
