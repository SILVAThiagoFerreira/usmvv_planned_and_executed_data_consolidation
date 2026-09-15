# Consolidação Plan./Exec. | Console de Dados

Aplicacao web estatica com idioma padrao em portugues e alternancia para portugues, ingles e chines simplificado para carregar os arquivos planejado e realizado no navegador, consolidar os dados e baixar `MVV_RD_CONSOLIDADO_FINAL.xlsx`.
Tambem permite anexar somente o arquivo planejado para baixar `MVV_PLANO_PERFURACAO_ORGANIZADO.xlsx`.
Tambem permite anexar somente o arquivo executado para baixar `RD_EXECUTADO_ORGANIZADO.xlsx`.

## Como usar

1. Abra a pagina publicada no GitHub Pages.
2. Anexe `PLANEJADO.xlsx` e, se for consolidar, `REALIZADO.txt`.
3. Clique em `Consolidar MVV + RD`. Para uma saída isolada, abra `Outras saídas` e escolha o fluxo planejado ou executado.
4. Baixe o workbook quando o link aparecer; o log tecnico fica disponivel no painel `Resumo`.

Para organizar somente o dado planejado, anexe `PLANEJADO.xlsx`, abra `Outras saídas`, clique em `Organizar planejado` e baixe o workbook gerado.
Para organizar somente o executado, anexe `REALIZADO.txt`, abra `Outras saídas` e clique em `Organizar executado`. Informe a cota do pé; a profundidade será calculada pela diferença entre a cota de topo do arquivo e a cota do pé. Se houver subfuração, informe também o valor, que será somado ao resultado.

Para consolidar um projeto para O-PitDev, abra o quadro abaixo do fluxo principal. Anexe o levantamento de campo em `.csv` ou `.txt` e o plano planejado em `.xlsx`. O levantamento fornece `ID`, `Y`, `X` e `Z`; o plano fornece `Diâmetro`, `Azimute`, `Ângulo planejado` (a coluna `Dip` do arquivo atual) e `Profundidade` (a coluna `Depth`). A coluna `Ângulo do talude` é calculada por `90 - Ângulo planejado`. O download gera `CONSOLIDACAO_PROJETO_O-PITDEV.xlsx` com a tabela consolidada e o log de correspondências.
Para organizar somente o levantado para o O-PitDev, anexe apenas o `.csv` ou `.txt` no mesmo quadro e clique em `Organizar somente o levantado`. O download gera `LEVANTAMENTO_O-PITDEV_ORGANIZADO.xlsx`, com `ID`, `Y`, `X` e `Z` na ordem do arquivo, além de um log de origem. O plano não é solicitado, e o quinto campo vazio do exportador Enaex não é exportado.

## Caracteristicas

- Processamento 100% client-side.
- Sem backend e sem envio dos arquivos para servidor.
- Validacao antes do processamento.
- Deduplicacao da RD com prioridade `L-` sobre `E-` e `L_`.
- Seletor de idioma para portugues, ingles e chines simplificado.
- Interface compacta com fundo branco e uma unica marca OpenBlast na barra superior.
- A ação principal fica visível; saídas isoladas ficam recolhidas em `Outras saídas`.
- O resumo só ocupa espaço depois que existe uma saída; o log técnico permanece expansível.
- O-PitDev inicia recolhido para manter o fluxo principal limpo e pode ser aberto quando necessario.
- O-PitDev oferece consolidação com plano e organização independente somente do levantamento.
- Links de download aparecem somente depois de uma geracao valida.
- Workbook final com `CONSOLIDADO_FINAL`, `RD_TRATADA` e `LOG_VALIDACAO`.
- Exportacao MVV-only com a aba `PLANO_MVV` e somente as colunas configuradas.

## Execucao local

```bash
npm test
```

Para abrir localmente, use um servidor estatico e navegue ate `index.html`.

## Publicacao no GitHub Pages

1. Faça push dos arquivos para o branch principal do repositorio.
2. Ative GitHub Pages apontando para a raiz do branch.
3. A pagina inicial sera `index.html`.

## Estrutura

```text
index.html
main.js
config.json
styles.css
src/
tests/
input/
output/
logs/
```
